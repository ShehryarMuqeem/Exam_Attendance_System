# AttendX

AttendX is a full-stack board exam and attendance management system, built with a React frontend and a Node.js/Express + PostgreSQL backend. It supports schools, exam centers, academic structuring (year/term/shift/department), user roles, attendance tracking, and analytics/reporting.

## Tech Stack

**Frontend:** React 18, React Router, Recharts (analytics/charts), QRCode.react
**Backend:** Node.js, Express, PostgreSQL (`pg`), JWT authentication, bcrypt password hashing

## Project Structure

```
attendx/
├── backend/          # Express + PostgreSQL API
│   ├── routes/        # auth, schools, users, exams, attendance, stats, centers, academic
│   ├── middleware/     # auth middleware
│   ├── scripts/        # DB seed and inspection scripts
│   ├── data/            # academic structure definitions
│   ├── schema.sql       # database schema
│   └── server.js        # app entry point
├── frontend/         # React application
│   └── src/
│       ├── pages/       # Auth, Admin, School, Teacher, Student, Analytics pages
│       ├── components/  # shared components
│       └── context/     # app-level React context
├── sample_students.csv
└── test_students.csv
```

## Features

- Role-based access (Admin, School, Teacher, Student) with JWT authentication
- School and exam center management
- Academic structure handling (year, term, shift, department, class)
- Attendance tracking and reporting
- Analytics dashboard with charts (Recharts)
- QR-code based features for exam/attendance workflows
- CSV-based student data import (sample data included)

## Getting Started

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in your own DATABASE_URL and JWT_SECRET
npm run dev
```

The backend auto-creates required tables on startup if they don't exist. To seed sample data:

```bash
npm run seed
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # point REACT_APP_API_URL at your backend
npm start
```

## Environment Variables

Neither `.env` file is committed to this repository. Use the provided `.env.example` files as templates:

- `backend/.env.example` — `DATABASE_URL`, `JWT_SECRET`, `PORT`
- `frontend/.env.example` — `REACT_APP_API_URL`

## License

This project is provided as-is for educational and portfolio purposes.
