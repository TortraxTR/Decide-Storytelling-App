FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs npm \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN npm ci && prisma generate

EXPOSE 8080
CMD ["sh", "-c", "npx prisma migrate deploy && uvicorn main:app --host 0.0.0.0 --port 8080"]
