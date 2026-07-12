# 🌟 KathaGemma

KathaGemma is an AI-powered interactive storytelling platform built for the **Gemma for Bharat Hackathon**. It combines AI-generated stories, voice interaction, camera-based scavenger hunts, rewards, and a parent dashboard to create an engaging learning experience for children.

---

# 🚀 Features

- 📖 AI Story Generation using Google Gemini
- 🎯 Dynamic AI Story Choices
- 🎙️ Voice Companion
- 📷 Camera Mission (Gemini Vision)
- 🏆 XP & Achievement System
- 🎁 Rewards Dashboard
- 👨‍👩‍👧 Parent Dashboard
- 📚 Story History
- 🌙 Modern Responsive UI
- ⚡ Offline AI Fallback (when Gemini quota is exhausted)

---

# 🛠️ Tech Stack

## Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- React Router

## Backend

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL

## AI

- Google Gemini API

---

# 📂 Project Structure

```
KathaGemma
│
├── frontend
│
├── backend
│
└── README.md
```

---

# 📋 Prerequisites

Before running the project, install:

- Node.js (v20 or above)
- npm
- PostgreSQL
- Git

---

# 📥 Clone Repository

```bash
git clone https://github.com/DevByPawan/KathaGemma.git

cd KathaGemma
```

---

# ⚙️ Backend Setup

Go inside backend

```bash
cd backend
```

Install dependencies

```bash
npm install
```

---

# 🗄️ PostgreSQL Setup

## macOS

Install PostgreSQL

```bash
brew install postgresql@17
```

Start PostgreSQL

```bash
brew services start postgresql@17
```

Check status

```bash
brew services list
```

Expected

```
postgresql@17    started
```

Create database

```bash
createdb kathagemma
```

---

# 🔑 Backend Environment Variables

Create a file

```
backend/.env
```

Paste

```env
PORT=4000

DATABASE_URL="postgresql://YOUR_POSTGRES_USERNAME@localhost:5432/kathagemma?schema=public"

GEMINI_API_KEY=YOUR_GEMINI_API_KEY

NODE_ENV=development
```

Example

```env
DATABASE_URL="postgresql://john@localhost:5432/kathagemma?schema=public"
```

or

```env
DATABASE_URL="postgresql://pawanagrahari@localhost:5432/kathagemma?schema=public"
```

depending on your PostgreSQL username.

---

# 🤖 Google Gemini API Key

Create your API key from

https://aistudio.google.com/app/apikey

Copy the key

Add it inside

```
backend/.env
```

```env
GEMINI_API_KEY=YOUR_API_KEY
```

---

# 🗄️ Prisma Setup

Generate Prisma Client

```bash
npx prisma generate
```

Run database migrations

```bash
npx prisma migrate dev
```

(Optional) Open Prisma Studio

```bash
npx prisma studio
```

---

# ▶️ Run Backend

```bash
npm run dev
```

Backend will start on

```
http://localhost:4000
```

---

# 💻 Frontend Setup

Open a new terminal

```bash
cd frontend
```

Install dependencies

```bash
npm install
```

---

# 🌐 Frontend Environment Variables

Create

```
frontend/.env
```

Paste

```env
VITE_API_URL=http://localhost:4000/api
```

---

# ▶️ Run Frontend

```bash
npm run dev
```

Frontend runs on

```
http://localhost:5173
```

---

# 🏗️ Build Project

## Backend

```bash
cd backend

npm run build
```

## Frontend

```bash
cd frontend

npm run build
```

---

# 🧹 Useful Prisma Commands

Generate Prisma Client

```bash
npx prisma generate
```

Run Migrations

```bash
npx prisma migrate dev
```

Reset Database

```bash
npx prisma migrate reset
```

Open Database

```bash
npx prisma studio
```

---

# 📷 Camera Mission

Camera Mission requires:

- Google Chrome
- Microsoft Edge

Allow camera permission when prompted.

---

# 🤖 Gemini API Fallback

If the Gemini API quota is exhausted or temporarily unavailable:

- The application automatically switches to an offline story generator.
- The UI continues functioning normally.
- No HTTP 500 errors are shown to the user.

---

# 🔥 Current Modules

- Home Dashboard
- AI Story Generation
- Dynamic Story Choices
- Story Progress Tracking
- Voice Companion
- Camera Mission
- Rewards
- Parent Dashboard
- Explore Library
- Profile
- Bottom Navigation
- XP System
- Achievement System

---

# 🧪 Running the Project

Start Backend

```bash
cd backend

npm install

npm run dev
```

Start Frontend

```bash
cd frontend

npm install

npm run dev
```

Open

```
http://localhost:5173
```

---

# 🔒 Environment Files

Backend

```
backend/.env
```

Frontend

```
frontend/.env
```

Never commit your actual `.env` files.

Instead commit

```
backend/.env.example

frontend/.env.example
```

---

# 📄 backend/.env.example

```env
PORT=4000

DATABASE_URL="postgresql://YOUR_POSTGRES_USERNAME@localhost:5432/kathagemma?schema=public"

GEMINI_API_KEY=YOUR_GEMINI_API_KEY

NODE_ENV=development
```

---

# 📄 frontend/.env.example

```env
VITE_API_URL=http://localhost:4000/api
```

---

# 👨‍💻 Developer

**Pawan Agrahari**

GitHub

https://github.com/DevByPawan

---

# ⭐ If you like this project

Give this repository a ⭐ on GitHub.