# Collab Code

Real-time collaborative coding platform with live editor,
video calls, code execution, and DSA problem solving.

## Features

- Real-time collaborative editor (Y.js CRDT)
- Live cursors with usernames
- Video calls via WebRTC (max 4 users)
- In-room chat with history
- Code execution in 5 languages (Judge0)
- Submit against test cases (ACCEPTED/WRONG_ANSWER)
- Admin panel for managing questions

## Tech stack

- Frontend: React + TypeScript + Vite + Tailwind
- Backend:  Node.js + Express + Socket.IO + TypeScript
- DB:       PostgreSQL (Neon) via Prisma
- Realtime: Socket.IO + Y.js
- Video:    WebRTC (mesh topology)
- Execution: Judge0 CE

## Local setup

### Prerequisites

- Node.js 24 LTS
- Docker (for local Postgres + Redis)

```bash
# 1. Clone
git clone https://github.com/Ashutosh-code-arch/codequest.git
cd codequest

# 2. Start local DB
docker compose up -d

# 3. Backend
cd backend
cp ../.env.example .env   # fill in values
npm install
npm run db:migrate
npm run db:seed           # creates admin user
npm run dev               # runs on :4000

# 4. Frontend (new terminal)
cd frontend
cp .env.example .env      # fill in values
npm install
npm run dev               # runs on :5173
```

## Default admin credentials (local only)

Email:    <admin@collabcode.dev>
Password: Admin@secure123

## Live demo

Frontend: <https://your-app.vercel.app>
Backend:  <https://your-backend.onrender.com>
