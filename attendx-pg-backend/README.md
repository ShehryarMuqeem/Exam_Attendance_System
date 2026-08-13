# AttendX — v8 Rebuild (Academic Hierarchy + Examination Centers)

This is a major restructuring of AttendX per the new Board requirements. Admit
cards and QR scanning have been removed entirely — attendance is now marked
directly from a class roster by the center's assigned teacher.

## What changed

### 1. Manage Exam flow — Year → Term → Shift → Department → Subject wizard
Board Admin → Manage Exams now walks through five required selection steps
(each a clickable round-selector option, no defaults/skipping):
`Academic Year → Term → Shift (Morning/Evening) → Department → Subject`.
Only once all five are picked do matching exams (and a "Create Exam" button)
appear. The same five fields are required, in this order, on the Create Exam
form.

### 2. Real Pakistan board subject lists
`data/academicStructure.js` is the single source of truth for:
- 4 academic years
- 8 terms (SSC-I/II, HSSC-I/II, each with a Supplementary variant)
- SSC departments: Science, Computer Science, Humanities
- HSSC departments: Pre-Medical, Pre-Engineering, Computer Science (ICS),
  Commerce (I.Com), Humanities (F.A), General Science (F.A)
- The exact subject lists provided, per department

### 3. Responsive UI
`index.css` now has a `@media (min-width: 900px)` breakpoint that turns the
mobile "phone frame" into a proper wide desktop app shell (same components,
wider layout, multi-column card grids via the new `.wide-grid` utility) —
instead of a tiny phone floating on a big screen.

### 4. Examination Center Management
New `center_assignments` table + `/api/centers` routes. The Board assigns a
school to act as the exam center for another school's students
(Board Admin → Examination Centers → Assign Center). A school is its own
center by default; this only records explicit cross-school assignments.

### 5. Fixed class structure
Only 8 classes exist now, everywhere a class is selected:
`SSC-I, SSC-II, HSC-I, HSC-II` and their four Supplementary variants.

### 6. Teacher duty assignment moved to School/Center Admin
Per the requirement, Board no longer assigns teacher duty — the School Admin
(acting as Center Admin when their school hosts an exam) does, and **only**
from their own school's teacher list. The backend enforces this server-side
(`POST /exams/:id/assign-duty` checks the teacher's `school_id` matches the
requesting admin's `school_id`).

### 7. Center Information on School Admin login
School Admin dashboard now shows a "Center Information" card: whether this
school is an assigned center, which home schools' students are coming in, and
total incoming student counts. A dedicated "Center Details" page has the full
breakdown.

### 8. Admit cards / QR fully removed
No QR codes, no admit card generation, no scanning step anywhere in the app
(Board panel, School panel, or Teacher panel). Attendance marking is now:
teacher opens "Mark Attendance" → sees the live class roster for their
currently-active exam (time-window detected) → taps ✓/✕ per student.

### 9. Fresh seed data
`npm run seed` wipes all existing data and creates:
- 1 Board Admin
- 10 schools, each with 1 School Admin, 10 Teachers, 100 Students
- A couple of example center assignments so the feature has visible data

## Setup

```bash
cd attendx-pg-backend
npm install
# .env already has the working Supabase pooler connection string
npm start        # starts the server, creates tables/sequences/indexes automatically
```

In a second terminal, once the server is running and tables exist:
```bash
npm run seed      # wipes old data, creates the 10 schools / fresh users
```

```bash
cd attendx-react
npm install
npm start
```

## Login credentials after seeding

**Board Admin:** `boardadmin` / `Admin@2026`

**School Admins** follow the pattern `<schoolslug>school` / `<sch>1234`, e.g.
for "Allied School": username `alliedschool`, password `all1234`.

**Teachers** follow the pattern `<firstname-lowercase>` / `<username>1234`,
e.g. `sahil` / `sahil1234`.

**Students** follow the pattern `<firstname><lastname><n>` / `<firstname>1234`.

The exact full list of 10 schools' credentials prints to the console when you
run `npm run seed` — it's randomized, so it's not hardcoded here.

## What you'll need to verify on your machine

This rebuild was developed and syntax/logic-checked in a sandbox with no
network access to Supabase, so:
- Run `npm start` and confirm the console shows `✅ PostgreSQL connected` and
  `✅ Migrations, sequences & indexes applied`.
- Run `npm run seed` and confirm it completes with the `🎉 SEED COMPLETE` banner.
- Log in as a School Admin and a Teacher to click through the new Mark
  Attendance roster flow end-to-end once with real data.
