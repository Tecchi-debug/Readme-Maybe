# ReadMeMaybe

A full-stack MERN application that analyzes GitHub repositories and generates documentation, with JWT auth, MongoDB storage, and a Next.js frontend.

## What It Does

- Authenticates users with JWT-based access and refresh tokens with persisted sessions
- Accepts a GitHub repository URL from the dashboard and triggers analysis via `POST /analyze`
- Fetches repository metadata, languages, README content, and tree structure through the GitHub API
- Stores analyzed repository data per user in MongoDB
- Provides a frontend flow for signing in, creating an account, submitting repositories, and viewing stored READMEs

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, `react-markdown`, `remark-gfm`
- **Backend:** Node.js, Express
- **Database:** MongoDB with Mongoose
- **Auth:** JWT (`jsonwebtoken`), `bcryptjs`
- **AWS:** `@aws-sdk/client-secrets-manager`, `@aws-sdk/client-lambda`
- **Email:** `nodemailer`
- **Package management:** Yarn 4 workspaces

## Project Structure

```text
.
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── server.js
├── frontend/
│   ├── app/
│   ├── public/
│   └── package.json
├── package.json
└── yarn.lock
```

## Key Backend Models

- `User`: account profile, auth fields, preferences, usage metrics
- `JwtSession`: persisted refresh-token session records
- `OAuthAccount`: linked third-party account metadata
- `StoredRepo`: saved repository analysis results for a user
- `PromptStuff`: prompt-related stored content

## Main API Routes

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Repository Analysis

- `POST /analyze`

### Health

- `GET /healthz` — liveness check
- `GET /readyz` — readiness check (MongoDB + secrets)

## Environment Variables

### Backend

Create `backend/.env`:

```env
PORT=5000
JWT_SECRET=your_jwt_secret
MONGODB_URI=your_mongodb_connection_string
GITHUB_TOKEN=optional_github_token
```

The backend can also read `MONGODB_URI`, `JWT_SECRET`, and email credentials from AWS Secrets Manager. If `GITHUB_TOKEN` is set, GitHub API requests receive higher rate limits.

### Frontend

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:5000
```

## Local Development

### 1. Install dependencies

```bash
yarn install
```

### 2. Start the backend

```bash
cd backend
node server.js
```

### 3. Start the frontend

```bash
cd frontend
yarn dev
```

The frontend runs on `http://localhost:3000` by default. The backend listens on `http://127.0.0.1:5000` unless overridden.

## Auth Flow

- Register creates the user and immediately signs them in
- Login returns an access token and refresh token
- Protected routes validate both the JWT and the stored session record
- The frontend stores auth data locally and refreshes access tokens when needed

## Deployment Notes

- Frontend is configured for static export (`output: 'export'` in `next.config.ts`), targeting AWS Amplify
- Backend is intended for AWS EC2 with a process manager such as PM2
- MongoDB Atlas network access must allow the machine running the backend

## Known Considerations

- If the frontend receives HTML instead of JSON from auth endpoints, the API URL or proxy configuration is likely wrong
- Slow or failing auth requests are often caused by MongoDB Atlas connectivity or network allowlist issues
- The code includes an email verification guard, but a full verification-email workflow is not yet implemented