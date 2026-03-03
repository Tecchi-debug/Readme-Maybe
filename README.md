# Read Me Maybe — MERN Stack App

A full-stack MERN (MongoDB, Express, React/Next.js, Node.js) application for managing baseball card collections.

## Project Structure

```
├── backend/          # Express + Node.js API server
│   └── server.js     # API endpoints (login, addcard, searchcards)
├── frontend/         # Next.js frontend
│   └── app/          # App router pages and components
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [MongoDB Atlas](https://www.mongodb.com/atlas) account (or local MongoDB)

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/Tecchi-debug/read-me-maybe.git
cd read-me-maybe
```

### 2. Backend setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` with:

```env
MONGODB_URI=your_mongodb_connection_string
PORT=5000
```

Start the server:

```bash
npm start
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on [http://localhost:3000](http://localhost:3000) and the API on [http://localhost:5000](http://localhost:5000).

## API Endpoints

| Method | Endpoint             | Description          |
| ------ | -------------------- | -------------------- |
| POST   | `/api/login`         | User authentication  |
| POST   | `/api/addcard`       | Add a baseball card  |
| POST   | `/api/searchcards`   | Search cards by name |

## Environment Variables

| Variable      | Description                  |
| ------------- | ---------------------------- |
| `MONGODB_URI` | MongoDB connection string    |
| `PORT`        | Server port (default: 5000)  |
