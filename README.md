# ReadMeMaybe

ReadMeMaybe is a full-stack MERN application that helps developers generate better repository documentation from a GitHub URL. The app analyzes a repository, pulls relevant metadata and important files through the GitHub API, and stores repository snapshots for each signed-in user.

## What It Does

- Authenticates users with JWT-based sessions
- Accepts a GitHub repository URL from the dashboard
- Fetches repository metadata, languages, README content, and tree structure
- Stores analyzed repository data per user in MongoDB
- Provides a frontend flow for signing in, creating an account, and submitting repositories

## Tech Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend: Node.js, Express
- Database: MongoDB with Mongoose
- Auth: JWT access/refresh tokens with persisted sessions
- Package management: Yarn 4 workspaces
- Infrastructure target: AWS Amplify for frontend, EC2 for backend

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
├── .yarn/
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

## Environment Variables

### Backend

Create `backend/.env` with the values your environment needs:

```env
PORT=5000
JWT_SECRET=your_jwt_secret
MONGODB_URI=your_mongodb_connection_string
GITHUB_TOKEN=optional_github_token
```

Notes:

- The backend can also read MongoDB credentials from AWS Secrets Manager.
- If `GITHUB_TOKEN` is set, GitHub API requests get higher rate limits.

### Frontend

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:5000
```

## Local Development

Use Yarn from the repository root.

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

In a separate terminal:

```bash
cd frontend
yarn dev
```

Frontend runs on `http://localhost:3000` by default. The backend runs on `http://127.0.0.1:5000` unless overridden.

## Current Auth Flow

- Register creates the user and immediately signs them in
- Login returns an access token and refresh token
- Protected routes validate both the JWT and the stored session record
- The frontend stores auth data locally and refreshes access tokens when needed

## Deployment Notes

- Frontend is intended for AWS Amplify
- Backend is intended for AWS EC2 with PM2 or a similar process manager
- MongoDB Atlas network access must allow the machine running the backend
- Dev and production environments must set the correct `NEXT_PUBLIC_API_URL`

## Known Considerations

- If the frontend receives HTML instead of JSON from auth endpoints, the API URL or proxy configuration is likely wrong
- Slow or failing auth requests are often caused by MongoDB Atlas connectivity or network allowlist issues
- The code includes an email verification guard, but a full verification-email workflow is not yet implemented
