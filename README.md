# CodeQuest

[![CI / Deploy](https://github.com/Ashutosh-code-arch/codequest/actions/workflows/deploy.yml/badge.svg)](https://github.com/Ashutosh-code-arch/codequest/actions/workflows/deploy.yml)
[![Node.js 24](https://img.shields.io/badge/Node.js-24_LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

CodeQuest is a real-time collaborative coding platform for practicing interview
problems together. A room combines a shared Monaco editor, per-language code
persistence, chat, WebRTC video, a synchronized timer, and Judge0-powered code
execution.

**Live application:** [codequest-mu-three.vercel.app](https://codequest-mu-three.vercel.app)

## Features

- Shared Monaco editor powered by Yjs CRDT synchronization
- Separate saved code for every room, question, and programming language
- JavaScript, Python, Java, C++, and C starter templates
- Custom Run input and submission against public or hidden test cases
- WebRTC video and audio rooms for up to four participants
- Realtime chat, participant presence, and synchronized room timers
- Room/session history with submissions and the latest saved code
- Admin tools for questions, test cases, users, and active rooms
- JWT authentication, authorization checks, validation, and rate limiting

## How a coding session works

1. An admin creates a problem, reviews its language templates, and adds at least
   one test case.
2. A user creates a room with up to five ready problems and shares its ID.
3. Participants join through the dashboard. The server authorizes the room
   membership before enabling realtime features.
4. Each question/language pair has its own collaborative Yjs document. Changes
   are saved after edits and immediately when switching language, switching
   problem, or leaving the room.
5. **Run** executes the current code with custom stdin. **Submit** executes it
   against every test case, records the result, and hides private case I/O.
6. The creator can end the room; admins can terminate it. Final editor state and
   submission history remain available afterward.

## Technology

| Area | Stack |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Monaco Editor |
| API | Node.js 24 LTS, Express 5, Zod |
| Realtime | Socket.IO, Yjs, y-monaco |
| Video | Browser WebRTC with STUN/TURN |
| Database | PostgreSQL, Prisma |
| Execution | Judge0 CE through RapidAPI or a self-hosted endpoint |
| Hosting | Vercel frontend, Render backend, GitHub Actions CI/CD |

## Repository layout

```text
codequest/
├── backend/                 # Express, Socket.IO, Prisma, Judge0 integration
│   ├── prisma/              # Schema, migrations, and admin seed
│   ├── src/routes/          # HTTP API
│   ├── src/socket/          # Rooms, Yjs, chat, timer, and WebRTC signaling
│   └── tests/               # Backend unit tests
├── frontend/                # React/Vite application
│   ├── src/components/      # Editor, video, chat, and routing components
│   ├── src/hooks/           # Collaboration, chat, and WebRTC hooks
│   └── tests/               # Local end-to-end smoke test
├── .github/workflows/       # CI and deployment workflow
└── docker-compose.yml       # Local PostgreSQL service
```

## Local development

### Prerequisites

- Node.js 24 LTS and npm 11+
- Docker Desktop or a PostgreSQL 15+ instance
- Judge0 credentials for Run and Submit
- Optional TURN credentials for reliable video across different networks

### 1. Clone and configure

```bash
git clone https://github.com/Ashutosh-code-arch/codequest.git
cd codequest
cp .env.example backend/.env
cp frontend/.env.example frontend/.env
```

Set a strong `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in
`backend/.env`. Add `JUDGE0_API_KEY` when using the default RapidAPI endpoint.

The frontend defaults to `http://localhost:4000`. For video between devices or
users behind restrictive NATs, configure `VITE_TURN_URL`,
`VITE_TURN_USERNAME`, and `VITE_TURN_CREDENTIAL` in `frontend/.env`.

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Install and initialize the backend

```bash
cd backend
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

The API starts at `http://localhost:4000`. The seed command creates or updates
the admin account from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

### 4. Start the frontend

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`.

## Environment variables

### Backend

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Signs access tokens; use a long random value |
| `JWT_EXPIRES_IN` | No | Access-token lifetime, default `15m` |
| `ADMIN_EMAIL` | For seed | Initial administrator email |
| `ADMIN_PASSWORD` | For seed | Initial administrator password |
| `FRONTEND_URL` | Yes in production | Allowed browser origin |
| `PORT` | No | API port, default `4000` |
| `JUDGE0_URL` | Yes | Judge0 base URL |
| `JUDGE0_API_KEY` | RapidAPI only | RapidAPI authentication key |

### Frontend

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | Yes in production | Backend HTTP origin |
| `VITE_WS_URL` | Yes in production | Backend Socket.IO origin |
| `VITE_TURN_URL` | Recommended | TURN server URL, for example `turn:host:3478` |
| `VITE_TURN_USERNAME` | With TURN | TURN username |
| `VITE_TURN_CREDENTIAL` | With TURN | TURN credential |

Never commit real `.env` files or credentials.

## Quality checks

```bash
# Backend
cd backend
npm run typecheck
npm test

# Frontend
cd ../frontend
npm run typecheck
npm run lint
npm run build
```

The local end-to-end test additionally requires the database, backend, seeded
admin credentials, and Judge0:

```bash
cd frontend
E2E_ADMIN_EMAIL=admin@example.com \
E2E_ADMIN_PASSWORD='your-admin-password' \
npm run test:e2e:local
```

It covers authentication, room authorization, WebRTC signaling, chat, Yjs
collaboration and persistence, all five submission languages, history, and room
termination.

## Deployment

GitHub Actions runs clean installs, backend tests, TypeScript checks, frontend
linting, and a production build before deployment.

Configure these GitHub Actions secrets:

- `RENDER_DEPLOY_HOOK_URL`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Configure the backend and frontend environment variables in Render and Vercel
respectively. Node.js `24.x` is declared in both packages and in CI. The backend
start command applies pending Prisma migrations before starting the server.

## License

Released under the [MIT License](LICENSE).
