#!/usr/bin/env bash
# One-time AWS setup for decide-backend-dev App Runner deployment.
# Run this once before the first GitHub Actions deployment.
# Requires AWS CLI v2 and credentials with IAM + ECR + Secrets Manager permissions.
set -euo pipefail

AWS_REGION="eu-central-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
INSTANCE_ROLE_NAME="AppRunnerInstanceRole-decide-backend"
ACCESS_ROLE_NAME="AppRunnerECRAccessRole"

echo "=== Decide Backend – AWS One-Time Setup ==="
echo "Account : ${ACCOUNT_ID}"
echo "Region  : ${AWS_REGION}"
echo ""

# ── 1. ECR repository ────────────────────────────────────────────────────────
echo "[1/4] ECR repository..."
aws ecr create-repository \
  --repository-name decide-backend-dev \
  --region "$AWS_REGION" \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256 \
  --output text --query 'repository.repositoryUri' 2>/dev/null \
  && echo "  Created." \
  || echo "  Already exists, skipping."

# ── 2. Secrets Manager ───────────────────────────────────────────────────────
echo "[2/4] Secrets Manager secrets..."

aws secretsmanager create-secret \
  --name "decide/dev/DATABASE_URL" \
  --description "PostgreSQL connection string for decide-backend-dev" \
  --secret-string "postgresql://USER:PASSWORD@HOST:5432/decide" \
  --region "$AWS_REGION" --output text --query 'ARN' 2>/dev/null \
  && echo "  Created decide/dev/DATABASE_URL (placeholder – update it now)." \
  || echo "  decide/dev/DATABASE_URL already exists, skipping."

aws secretsmanager create-secret \
  --name "decide/dev/JWT_SECRET" \
  --description "JWT signing secret for decide-backend-dev" \
  --secret-string "REPLACE_WITH_LONG_RANDOM_STRING" \
  --region "$AWS_REGION" --output text --query 'ARN' 2>/dev/null \
  && echo "  Created decide/dev/JWT_SECRET (placeholder – update it now)." \
  || echo "  decide/dev/JWT_SECRET already exists, skipping."

# ── 3. App Runner instance role (runtime – Secrets Manager access) ───────────
echo "[3/4] IAM instance role (${INSTANCE_ROLE_NAME})..."

aws iam create-role \
  --role-name "$INSTANCE_ROLE_NAME" \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "tasks.apprunner.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }' --output text --query 'Role.RoleName' 2>/dev/null \
  && echo "  Role created." \
  || echo "  Role already exists, skipping creation."

aws iam put-role-policy \
  --role-name "$INSTANCE_ROLE_NAME" \
  --policy-name "SecretsManagerAccess" \
  --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Action\": \"secretsmanager:GetSecretValue\",
      \"Resource\": \"arn:aws:secretsmanager:${AWS_REGION}:${ACCOUNT_ID}:secret:decide/dev/*\"
    }]
  }"
echo "  Secrets Manager policy attached."

# ── 4. App Runner ECR access role (build phase – ECR pull) ───────────────────
echo "[4/4] IAM ECR access role (${ACCESS_ROLE_NAME})..."

aws iam create-role \
  --role-name "$ACCESS_ROLE_NAME" \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "build.apprunner.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }' --output text --query 'Role.RoleName' 2>/dev/null \
  && echo "  Role created." \
  || echo "  Role already exists, skipping creation."

aws iam attach-role-policy \
  --role-name "$ACCESS_ROLE_NAME" \
  --policy-arn "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
echo "  AWSAppRunnerServicePolicyForECRAccess attached."

# ── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "=== Setup complete ==="
echo ""
echo "Required follow-up steps before pushing to main:"
echo ""
echo "  1. Set the real DATABASE_URL:"
echo "     aws secretsmanager update-secret \\"
echo "       --secret-id decide/dev/DATABASE_URL \\"
echo "       --secret-string 'postgresql://USER:PASS@HOST:5432/decide' \\"
echo "       --region ${AWS_REGION}"
echo ""
echo "  2. Set a strong JWT_SECRET:"
echo "     aws secretsmanager update-secret \\"
echo "       --secret-id decide/dev/JWT_SECRET \\"
echo "       --secret-string \"\$(openssl rand -hex 32)\" \\"
echo "       --region ${AWS_REGION}"
echo ""
echo "  3. Add these secrets to the GitHub repository"
echo "     (Settings → Secrets and variables → Actions):"
echo "     AWS_ACCESS_KEY_ID      – IAM user key with ECR + App Runner + STS access"
echo "     AWS_SECRET_ACCESS_KEY  – Corresponding secret"
echo ""
echo "  4. Push a commit touching backend/ to trigger the workflow."
