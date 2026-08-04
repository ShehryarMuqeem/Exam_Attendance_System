-- AttendX PostgreSQL Schema

CREATE TABLE IF NOT EXISTS schools (
  id SERIAL PRIMARY KEY,
  school_id VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  status VARCHAR(20) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  unique_id VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('BoardAdmin','SchoolAdmin','Teacher','Student')),
  status VARCHAR(20) DEFAULT 'Active',
  school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  assigned_classroom VARCHAR(20),
  class VARCHAR(10),
  section VARCHAR(5),
  roll_no VARCHAR(50),
  academic_year VARCHAR(30),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  exam_id VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  type VARCHAR(20) CHECK (type IN ('MCQs','Subjective','Mixed')),
  class VARCHAR(10) NOT NULL,
  section VARCHAR(5) NOT NULL,
  date VARCHAR(20) NOT NULL,
  time VARCHAR(10),
  duration INTEGER,
  status VARCHAR(20) DEFAULT 'Scheduled',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
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

CREATE TABLE IF NOT EXISTS admit_cards (
  id SERIAL PRIMARY KEY,
  admit_card_id VARCHAR(50) UNIQUE NOT NULL,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
  classroom VARCHAR(20) NOT NULL,
  qr_admit_card VARCHAR(50) NOT NULL,
  qr_answer_sheet VARCHAR(50) NOT NULL,
  qr_admit_img TEXT,
  qr_answer_img TEXT,
  issued_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, exam_id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
  admit_card_id INTEGER REFERENCES admit_cards(id),
  teacher_id INTEGER REFERENCES users(id),
  classroom VARCHAR(20) NOT NULL,
  qr_admit_scanned VARCHAR(50),
  qr_answer_scanned VARCHAR(50),
  status VARCHAR(20) DEFAULT 'Present',
  marked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, exam_id)
);

CREATE TABLE IF NOT EXISTS academic_years (
  id SERIAL PRIMARY KEY,
  year_name VARCHAR(50) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

