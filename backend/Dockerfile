FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (layer cached unless requirements change)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

# Generate Prisma Python client from schema (no DB connection needed at build time)
RUN prisma generate

# App Runner expects the container to listen on port 8080
EXPOSE 8080

# DATABASE_URL and JWT_SECRET (or JWT_SECRET_NAME + AWS_REGION) are
# injected as environment variables by App Runner at runtime.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
