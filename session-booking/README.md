# Session Booking API

A REST API built with **Node.js**, **TypeScript**, **Express.js**, **MongoDB**, and **Mongoose** that allows users to book sessions with teachers.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Language | TypeScript 5 |
| Framework | Express.js 4 |
| Database | MongoDB 6+ |
| ODM | Mongoose 8 |
| Dev Server | ts-node-dev |

---

## Project Structure

```
src/
├── app.ts                    # Entry point — Express app & server bootstrap
├── config/
│   └── database.ts           # MongoDB connection
├── controllers/
│   ├── user.controller.ts    # POST /users, GET /users/:id/sessions
│   ├── teacher.controller.ts # POST /teachers, GET /teachers
│   └── session.controller.ts # All session APIs
├── middleware/
│   └── errorHandler.ts       # Centralized error handler + AppError class
├── models/
│   ├── user.model.ts         # User schema
│   ├── teacher.model.ts      # Teacher schema
│   └── session.model.ts      # Session schema with indexes
├── routes/
│   ├── user.routes.ts
│   ├── teacher.routes.ts
│   └── session.routes.ts
└── types/
    └── index.ts              # SessionStatus enum, shared types
```

---

## Prerequisites

- Node.js 18 or higher
- MongoDB running locally (or a MongoDB Atlas URI)
- npm 9+

---

## Setup & Installation

### 1. Clone / extract the project

```bash
cd session-booking
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/session-booking
NODE_ENV=development
```

For **MongoDB Atlas**, replace `MONGODB_URI` with your connection string:
```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/session-booking?retryWrites=true&w=majority
```

### 4. Start the development server

```bash
npm run dev
```

Server starts at `http://localhost:3000`

### 5. Build for production

```bash
npm run build
npm start
```

---

## API Reference

### Base URL
```
http://localhost:3000
```

### Standard Response Shape

**Success:**
```json
{
  "success": true,
  "message": "...",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Descriptive error message"
}
```

---

### Health Check

```
GET /health
```

---

### API 1 — Create User

```
POST /users
```

**Body:**
```json
{
  "fullName": "Arjun Mehta",
  "email": "arjun.mehta@gmail.com",
  "phone": "+91-9876543210"
}
```

**Rules:**
- Email must be unique → `409 Conflict`
- All fields required → `400 Bad Request`

---

### Create Teacher *(seed helper)*

```
POST /teachers
```

**Body:**
```json
{
  "fullName": "Dr. Rohit Sharma",
  "email": "rohit@school.com",
  "specialization": "Computer Science",
  "experience": 8
}
```

---

### API 2 — Create Session

```
POST /sessions
```

**Body:**
```json
{
  "teacherId": "<ObjectId>",
  "startTime": "2025-12-01T10:00:00.000Z",
  "endTime":   "2025-12-01T11:00:00.000Z"
}
```

**Rules:**
- `teacherId` must exist → `404`
- `endTime > startTime` → `400` if violated
- Default status: `AVAILABLE`

---

### API 3 — Available Sessions for a Date

```
GET /sessions/available?dateTimestamp={unixMs}
```

**Query Param:** `dateTimestamp` — Unix timestamp in **milliseconds** (e.g. `Date.now()`)

**Implemented using MongoDB Aggregation Pipeline** with `$match → $lookup → $unwind → $project → $sort`.

**Example:**
```
GET /sessions/available?dateTimestamp=1748736000000
```

---

### API 4 — Book Session

```
POST /sessions/:id/book
```

**Body:**
```json
{
  "userId": "<ObjectId>"
}
```

**Rules:**
- User must exist → `404`
- Session must exist → `404`
- Only `AVAILABLE` → `BOOKED`; already booked → `409`

---

### API 5 — Mark Session Complete

```
PATCH /sessions/:id/complete
```

**Rules:**
- Session must exist → `404`
- Only `BOOKED` → `COMPLETED`; already completed → `409`
- Sets `completedAt` to current timestamp

---

### API 6 — User Session List

```
GET /users/:id/sessions
```

**Implemented using MongoDB Aggregation Pipeline** with `$match → $lookup → $unwind → $project → $facet`.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "fullName": "...", "email": "..." },
    "upcomingSessions": [ ... ],
    "completedSessions": [ ... ],
    "meta": {
      "totalUpcoming": 2,
      "totalCompleted": 1
    }
  }
}
```

---

## HTTP Status Codes Used

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (validation) |
| 404 | Not Found |
| 409 | Conflict (duplicate / state violation) |
| 500 | Internal Server Error |

---

## Postman Collection

Import `postman/Session-Booking-API.postman_collection.json` into Postman.

**Recommended test flow (top to bottom):**
1. `POST /teachers` — saves `teacherId` automatically via test script
2. `POST /users` — saves `userId` automatically
3. `POST /sessions` — saves `sessionId` automatically (uses today's date)
4. `GET /sessions/available` — verify the session appears
5. `POST /sessions/:id/book` — book with the saved userId
6. `PATCH /sessions/:id/complete` — mark as complete
7. `GET /users/:id/sessions` — verify history

Collection variables (`teacherId`, `userId`, `sessionId`) are auto-populated by Postman test scripts.

---

## Session Status Flow

```
AVAILABLE  ──book──▶  BOOKED  ──complete──▶  COMPLETED
```

---

## Aggregation Pipeline Details

### GET /sessions/available
```
$match (status=AVAILABLE, startTime within day)
  → $lookup (join teachers)
  → $unwind (flatten teacher array)
  → $project (select fields)
  → $sort (startTime ASC)
```

### GET /users/:id/sessions
```
$match (userId, status IN [BOOKED, COMPLETED])
  → $lookup (join teachers)
  → $unwind (flatten teacher array)
  → $project (select fields)
  → $facet (split into upcomingSessions / completedSessions)
  → $project (add counts)
```
