# CodeQuest – Real-Time Collaborative Coding & Interview Practice Platform

CodeQuest is a full-stack web platform designed for mock interviews, real-time coding collaboration, and performance analytics — inspired by CoderPad, LeetCode, and Google Docs. It enables users (candidates & mentors) to create or join rooms, write code collaboratively with live sync, run code in-browser, and track their interview history.

---

## ✨ Features

-   🔐 **Firebase Authentication** (Email/Password + Google)
-   🧠 **Real-time collaborative editor** (Monaco Editor + Socket.IO)
-   🎯 **Create / Join rooms** with unique Room IDs
-   💻 **Live code execution** using JDoodle API or custom Docker sandbox (WIP)
-   📝 **Markdown Notes + Instructions Panel**
-   📊 **Post-session analytics** (time, hints used, languages, feedback)
-   📁 **Auto-save + version history**
-   👥 **Role-based access control** (Mentor, Candidate)
-   📦 Modular monorepo architecture with modern best practices

---

## 🧑‍💻 Tech Stack

### Frontend:

-   React.js + TypeScript
-   Vite
-   Material UI (MUI)
-   React Hook Form
-   Redux Toolkit
-   Monaco Editor
-   Axios + Custom Hooks

### Backend:

-   Node.js + Express.js
-   Prisma ORM + PostgreSQL
-   Firebase Admin SDK for Auth Verification
-   Socket.IO for real-time communication

### Database:

-   PostgreSQL (via Prisma ORM)
-   Redis (optional for scaling rooms/socket state)

### Code Execution:

-   JDoodle API or Docker-based custom sandbox (planned)

### DevOps:

-   Vercel (Frontend), Render or Railway (Backend)
-   GitHub Actions (CI/CD)
-   Environment variables via `.env`

---

## 📦 Monorepo Structure

<details> <summary>Click to view</summary>
codequest/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── components/
│       ├── features/        # Redux slices
│       ├── pages/
│       ├── services/        # Axios + API hooks
│       ├── layouts/
│       └── App.tsx
│
├── server/                  # Express backend
│   └── src/
│       ├── controllers/
│       ├── routes/
│       ├── middleware/
│       ├── socket/          # Socket.IO server
│       └── index.ts
│
├── .env                     # Root env (if monorepo)
├── package.json             # Root (with workspaces)
├── README.md
└── tsconfig.json
</details>

---

## 🚀 Running Locally

### 1. Clone & Install

```bash
git clone https://github.com/your-username/codequest.git
cd codequest
npm install

# In root:
npm run dev

# OR separately:
cd client && npm run dev
cd server && npm run dev
```
