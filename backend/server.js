require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const pool = require('./db');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/schools',    require('./routes/schools'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/exams',      require('./routes/exams'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/stats',      require('./routes/stats'));
app.use('/api/centers',    require('./routes/centers'));
app.use('/api/academic',   require('./routes/academic'));
app.get('/api/health',     (req, res) => res.json({ status: 'OK', db: 'PostgreSQL', time: new Date() }));

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id SERIAL PRIMARY KEY,
        school_id VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        district VARCHAR(100) NOT NULL DEFAULT '',
        address TEXT, phone VARCHAR(50), email VARCHAR(255),
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        unique_id VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255), phone VARCHAR(50),
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'Active',
        school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        assigned_classroom VARCHAR(20),
        class VARCHAR(30), section VARCHAR(5), roll_no VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Exams now carry the full academic hierarchy (year/term/shift/department/
      -- subject) instead of a free-text class string, plus a required center
      -- (the school where this exam is physically held).
      CREATE TABLE IF NOT EXISTS exams (
        id SERIAL PRIMARY KEY,
        exam_id VARCHAR(30) UNIQUE NOT NULL,
        academic_year VARCHAR(20) NOT NULL,
        term VARCHAR(40) NOT NULL,
        shift VARCHAR(10) NOT NULL DEFAULT 'Morning',
        department VARCHAR(40) NOT NULL,
        subject VARCHAR(100) NOT NULL,
        class VARCHAR(30) NOT NULL,
        date VARCHAR(20) NOT NULL,
        time VARCHAR(10), duration INTEGER,
        room_no VARCHAR(50),
        center_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'Scheduled',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT exams_status_check CHECK (status IN ('Scheduled','Ongoing','Done','Locked'))
      );

      CREATE TABLE IF NOT EXISTS duty_assignments (
        id SERIAL PRIMARY KEY,
        teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
        classroom VARCHAR(20) NOT NULL,
        assigned_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(teacher_id, exam_id)
      );

      -- Admit cards removed per requirements — attendance is now marked
      -- directly against the student + exam by the center's teacher, with no
      -- QR/admit-card layer.
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
        teacher_id INTEGER REFERENCES users(id),
        classroom VARCHAR(20) NOT NULL,
        qr_admit_scanned VARCHAR(100),
        qr_answer_scanned VARCHAR(100),
        copy_number VARCHAR(100),
        status VARCHAR(20) DEFAULT 'Present',
        marked_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(student_id, exam_id)
      );

      -- Examination Center assignments: the Board assigns a school to act as
      -- the physical exam center for one or more "home" schools. A school can
      -- be its own center by default (no row needed); this table only records
      -- explicit Board-made center assignments.
      CREATE TABLE IF NOT EXISTS center_assignments (
        id SERIAL PRIMARY KEY,
        home_school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        center_school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        assigned_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(home_school_id, center_school_id)
      );

      CREATE TABLE IF NOT EXISTS academic_years (
        id SERIAL PRIMARY KEY,
        year_name VARCHAR(50) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed default academic years if empty
    const { rows: yearRows } = await client.query("SELECT COUNT(*) FROM academic_years");
    if (parseInt(yearRows[0].count) === 0) {
      const defaultYears = ['2025-2026', '2026-2027', '2027-2028', '2024-2025', '2023-2024', '2022-2023'];
      for (const y of defaultYears) {
        await client.query("INSERT INTO academic_years (year_name) VALUES ($1) ON CONFLICT DO NOTHING", [y]);
      }
      console.log('✅ Default Academic Years seeded');
    }

    // Seed Board Admin
    const { rows } = await client.query("SELECT id FROM users WHERE role='BoardAdmin'");
    if (!rows[0]) {
      const hashed = await bcrypt.hash('Admin@2026', 10);
      await client.query(
        `INSERT INTO users (unique_id,name,email,username,password,role)
         VALUES ('BOARD-001','Board Administrator','admin@attendx.edu','boardadmin',$1,'BoardAdmin')`,
        [hashed]
      );
      console.log('✅ Board Admin seeded — username: boardadmin | password: Admin@2026');
    }

    console.log('✅ PostgreSQL tables ready');

    try {
      await client.query(`CREATE SEQUENCE IF NOT EXISTS exam_id_seq START 1`);
      await client.query(`CREATE SEQUENCE IF NOT EXISTS school_id_seq START 1`);
      await client.query(`CREATE SEQUENCE IF NOT EXISTS teacher_id_seq START 1`);
      await client.query(`CREATE SEQUENCE IF NOT EXISTS student_id_seq START 1`);

      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_school_role ON users(school_id, role)`);
      // ===== Column migrations FIRST (before indexes that depend on them) =====
      const migrations = [
        `ALTER TABLE schools ADD COLUMN IF NOT EXISTS district VARCHAR(100) NOT NULL DEFAULT ''`,
        `ALTER TABLE exams ADD COLUMN IF NOT EXISTS center_id INTEGER REFERENCES schools(id) ON DELETE CASCADE`,
        `ALTER TABLE exams ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20)`,
        `ALTER TABLE exams ADD COLUMN IF NOT EXISTS term VARCHAR(40)`,
        `ALTER TABLE exams ADD COLUMN IF NOT EXISTS shift VARCHAR(10) DEFAULT 'Morning'`,
        `ALTER TABLE exams ADD COLUMN IF NOT EXISTS department VARCHAR(40)`,
        `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS qr_admit_scanned VARCHAR(100)`,
        `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS qr_answer_scanned VARCHAR(100)`,
        `ALTER TABLE attendance ADD COLUMN IF NOT EXISTS copy_number VARCHAR(100)`,
        `ALTER TABLE exams ALTER COLUMN name DROP NOT NULL`,
        `ALTER TABLE exams ALTER COLUMN section DROP NOT NULL`,
      ];
      for (const sql of migrations) {
        try { await client.query(sql); }
        catch(e) { console.log('Migration note:', e.message); }
      }

      // ===== Indexes AFTER columns exist =====
      const indexes = [
        `CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`,
        `CREATE INDEX IF NOT EXISTS idx_users_school_role ON users(school_id, role)`,
        `CREATE INDEX IF NOT EXISTS idx_attendance_exam_teacher ON attendance(exam_id, teacher_id)`,
        `CREATE INDEX IF NOT EXISTS idx_exams_center ON exams(center_id)`,
        `CREATE INDEX IF NOT EXISTS idx_duty_teacher_exam ON duty_assignments(teacher_id, exam_id)`,
        `CREATE INDEX IF NOT EXISTS idx_center_home ON center_assignments(home_school_id)`,
        `CREATE INDEX IF NOT EXISTS idx_center_center ON center_assignments(center_school_id)`,
      ];
      for (const sql of indexes) {
        try { await client.query(sql); }
        catch(e) { console.log('Index note:', e.message); }
      }

      console.log('✅ Migrations & indexes applied');
    } catch(e) { console.log('Migration note:', e.message); }
  } finally { client.release(); }
}

async function startServer(retriesLeft = 10, delayMs = 3000) {
  try {
    const client = await pool.connect();
    client.release();
    console.log('✅ PostgreSQL connected (Supabase)');
    await initDB();
    app.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
    });
  } catch (err) {
    console.error(`❌ PostgreSQL connection error: ${err.message}`);
    if (retriesLeft > 0) {
      console.log(`⏳ Retrying in ${delayMs/1000}s… (${retriesLeft} attempts left)`);
      setTimeout(() => startServer(retriesLeft - 1, Math.min(delayMs * 1.5, 30000)), delayMs);
    } else {
      console.error('❌ Out of retries — exiting.');
      process.exit(1);
    }
  }
}

process.on('unhandledRejection', (reason) => console.error('⚠ Unhandled rejection:', reason));
process.on('uncaughtException', (err) => console.error('⚠ Uncaught exception:', err));

startServer();
