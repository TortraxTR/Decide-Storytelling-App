# Decide Storytelling App

This project is a graduation project for Koç University's Computer Engineering program, made for COMP 491 course.

Decide is a branching/interactive storytelling platform with:
- a **Reader mobile app** (React Native) for consuming stories
- an **Author web app** (React + Vite) for creating/managing stories
- a **Backend API** (FastAPI) with **PostgreSQL** and **Prisma**
- optional **infrastructure scripts** for AWS setup (Secrets Manager, IAM, etc.)

---

## Repository Structure

| Path | What it is | Tech |
|------|------------|------|
| `reader-app/` | Mobile app for **readers** — browse and read interactive stories | React Native + TypeScript |
| `author-web/` | Web app for **authors** — create/manage stories, episodes, decisions | React + TypeScript + Vite |
| `backend/` | Backend API + DB access layer | Python FastAPI + Prisma + PostgreSQL |
| `infrastructure/` | Deployment / infra automation helpers | Shell (AWS setup script) |

---

## Prerequisites

### Reader App (React Native)
- Node.js (**>= 22.11.0**) (see `reader-app/package.json`)
- Android Studio and/or Xcode (depending on target)
- React Native environment set up:
  - https://reactnative.dev/docs/environment-setup

### Author Web (Vite)
- Node.js + npm

### Backend (FastAPI + Prisma)
- Python 3.x
- Node.js + npm (Prisma tooling/config uses Node)
- PostgreSQL

---

## Getting Started (Local Development)

You can run each component independently.

### 1) Backend (API)

From repo root:

```bash
cd backend
```

#### Configure environment variables

Create a local `.env` from the example:

```bash
cp .env.example .env
```

From `backend/.env.example`, the backend uses:

- **Database (required)**
  - `DATABASE_URL`  
    Example:
    `postgresql://decide_admin:password@localhost:5432/decide`

- **JWT Authentication**
  - Option A (recommended for local dev): set `JWT_SECRET`
  - Option B: leave `JWT_SECRET` unset and fetch from AWS Secrets Manager using:
    - `JWT_SECRET_NAME` (default: `decide/dev/JWT_SECRET`)
    - `AWS_REGION` (default: `eu-central-1`)
    - optionally for local usage: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

- **S3 (media uploads)**
  - `S3_BUCKET_NAME` (default example: `decide-media-dev`)

#### Install dependencies

Python deps:

```bash
pip install -r requirements.txt
```

Node deps (Prisma tooling/config):

```bash
npm install
```

#### Run the API

The API is a FastAPI app defined in `backend/main.py` and exposes a health check at:

- `GET /health`

To run locally:

```bash
python main.py
```

---

### 2) Author Web (Authors UI)

From repo root:

```bash
cd author-web
npm install
npm run dev
```

Useful scripts:
- `npm run dev` – start dev server
- `npm run build` – typecheck + build
- `npm run preview` – preview production build

---

### 3) Reader App (Mobile)

From repo root:

```bash
cd reader-app
npm install
```

Start Metro:

```bash
npm start
```

Run on Android:

```bash
npm run android
```

Run on iOS (macOS only):

```bash
bundle install
bundle exec pod install
npm run ios
```

---

## Frontend Configuration (AWS-hosted backend)

### Backend URL (AWS App Runner)

Both frontends expect the backend base URL to look like an App Runner URL, for example:

- `https://YOUR_APP_RUNNER_URL.awsapprunner.com`

(Your code examples explicitly use this format in the `config.example.ts` files.)

### Author Web (`author-web/`)

The author web app uses **either** a Vite env var **or** a local config fallback:

- Primary (recommended): `VITE_API_URL`
  - Used in `author-web/src/api.ts`:
    - `import.meta.env.VITE_API_URL?.trim()`
- Optional/local fallback: `author-web/src/config.ts` (gitignored)
  - Create it by copying:
    - `author-web/src/config.example.ts` → `author-web/src/config.ts`
  - This file exports:
    - `API_BASE_URL`
    - `S3_BUCKET_URL`

S3 public access for previews is controlled by:

- `VITE_S3_PUBLIC_BASE`
  - Used in pages like `author-web/src/pages/NodesPage.tsx` / `StoriesPage.tsx`
  - Expected to be a public base URL such as:
    - `https://YOUR_BUCKET.s3.REGION.amazonaws.com`

**Typical setup (local dev):**
1. Create `author-web/.env.local` with:
   - `VITE_API_URL=https://YOUR_APP_RUNNER_URL.awsapprunner.com`
   - `VITE_S3_PUBLIC_BASE=https://YOUR_BUCKET.s3.REGION.amazonaws.com`
2. (Optional) create `author-web/src/config.ts` from the example as a fallback.

### Reader App (`reader-app/`)

The reader app loads URLs from a local config file (gitignored):

- Create:
  - `reader-app/src/config.ts` by copying `reader-app/src/config.example.ts`

It must export:

- `API_BASE_URL` — your App Runner backend base URL
- `S3_BUCKET_URL` — your public bucket base URL (`https://BUCKET.s3.REGION.amazonaws.com`)

---

## AWS / Deployment Notes (Backend)

This repo includes automation and CI wiring for AWS:

- `infrastructure/setup-aws.sh`
  - Creates AWS Secrets Manager entries like:
    - `decide/dev/DATABASE_URL`
    - `decide/dev/JWT_SECRET`
  - Sets up IAM roles/policies for App Runner to read secrets.

- GitHub Actions workflow:
  - `.github/workflows/deploy-backend.yml`
  - Builds & pushes a Docker image to ECR and deploys to **App Runner**.
  - Injects Secrets Manager values into App Runner environment secrets:
    - `DATABASE_URL`
    - `JWT_SECRET`

---

## Schema / Design Docs

Schema link (as referenced in the repository):

https://drive.google.com/file/d/1-tVdPa4pSCgWRKT25Zae7ENO2X1Jb_FQ/view?usp=sharing

---

## License

No license file is currently included in the repository. If you intend this project to be open source, consider adding a `LICENSE` (e.g., MIT, Apache-2.0).