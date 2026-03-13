FROM python:3.12-slim AS builder

WORKDIR /app

# Install Node.js (required to run `prisma generate` via the Prisma CLI)
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Node dependencies (Prisma CLI)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and generate Prisma Python client
COPY . .
RUN prisma generate


FROM python:3.12-slim

WORKDIR /app

# Copy installed Python packages and generated Prisma client from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /app /app

# Fetch the Prisma query engine binary for this specific runtime environment.
# prisma generate (in builder) caches the binary under /root/.cache which is not
# carried across stages, so we fetch it fresh here — no Node.js required.
RUN prisma py fetch

# App Runner expects the container to listen on port 8080
EXPOSE 8080

# DATABASE_URL and JWT_SECRET are injected by App Runner at runtime via Secrets Manager.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
