const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { protect, requireRole } = require('../middleware/auth');

// Admit cards / QR scanning are removed per the new requirements — attendance
// is marked directly by the center's teacher against the roster of students
// sitting at that center for that exam, picked from a class list rather than
// a QR scan.

// GET roster for an exam at the teacher's assigned classroom — students who
// are sitting this exam at this center. Pulled from the home school(s) feeding
// into this center via center_assignments, plus the center's own students if
// the exam's class/department matches.
router.get('/roster', protect, requireRole('Teacher'), async (req, res) => {
  try {
    const { examId } = req.query;
    const { rows: duties } = await pool.query(
      'SELECT * FROM duty_assignments WHERE teacher_id=$1 AND exam_id=$2',
      [req.user.id, examId]
    );
    if (!duties[0]) return res.status(403).json({ message: 'You are not assigned to this exam.' });

    const { rows: examRows } = await pool.query('SELECT * FROM exams WHERE id=$1', [examId]);
    if (!examRows[0]) return res.status(404).json({ message: 'Exam not found' });
    const exam = examRows[0];

    // Schools that feed students into this center (the center's own school +
    // any home schools explicitly assigned to it by the Board)
    const { rows: homeSchools } = await pool.query(
      'SELECT home_school_id FROM center_assignments WHERE center_school_id=$1',
      [exam.center_id]
    );
    const schoolIds = [exam.center_id, ...homeSchools.map(h => h.home_school_id)];

    const { rows: students } = await pool.query(
      `SELECT id, name, unique_id, roll_no, class, section, school_id
       FROM users WHERE role='Student' AND class=$1 AND school_id = ANY($2::int[]) AND (academic_year=$3 OR academic_year IS NULL)
       ORDER BY CAST(NULLIF(regexp_replace(roll_no, '[^0-9]', '', 'g'), '') AS INTEGER) NULLS LAST, name`,
      [exam.class, schoolIds, exam.academic_year]
    );

    const { rows: attended } = await pool.query(
      'SELECT student_id, status, copy_number, classroom, marked_at FROM attendance WHERE exam_id=$1',
      [examId]
    );
    const attendanceMap = {};
    attended.forEach(a => {
      attendanceMap[a.student_id] = {
        status: a.status,
        copyNumber: a.copy_number,
        classroom: a.classroom,
        markedAt: a.marked_at
      };
    });

    // Filter students by room allocation:
    // They must either be explicitly assigned to the teacher's classroom, OR
    // have NO classroom assigned yet (not present in attendanceMap).
    const teacherClassroom = duties[0].classroom;
    const filteredStudents = students.filter(s => {
      const att = attendanceMap[s.id];
      if (!att) return true; // Unallocated student
      return att.classroom === teacherClassroom; // Allocated to this room
    });

    res.json(filteredStudents.map((s, i) => ({
      srNo: i + 1,
      studentId: s.id,
      name: s.name && s.name.startsWith('Ad-hoc Student') ? '' : s.name,
      uniqueId: s.unique_id,
      rollNo: s.roll_no || '—',
      class: s.class,
      status: attendanceMap[s.id]?.status || 'Unmarked',
      answerSheetNumber: attendanceMap[s.id]?.copyNumber || null,
      markedAt: attendanceMap[s.id]?.markedAt || null,
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST mark attendance (Present)
router.post('/mark', protect, requireRole('Teacher'), async (req, res) => {
  try {
    const { studentIdRef, examIdRef, admitCardId, classroom, qrAdmitScanned, qrAnswerScanned, answerSheetNumber, status } = req.body;
    if (!studentIdRef || !examIdRef) return res.status(400).json({ message: 'studentIdRef and examIdRef required' });

    const { rows: duties } = await pool.query(
      'SELECT classroom FROM duty_assignments WHERE teacher_id=$1 AND exam_id=$2',
      [req.user.id, examIdRef]
    );
    if (!duties[0]) return res.status(403).json({ message: 'You are not assigned to this exam.' });

    const { rows: examRows } = await pool.query('SELECT status FROM exams WHERE id=$1', [examIdRef]);
    if (examRows[0]?.status === 'Locked') return res.status(403).json({ message: '🔒 Attendance is locked for this exam.' });

    const { rows } = await pool.query(
      `INSERT INTO attendance (student_id, exam_id, teacher_id, classroom, qr_admit_scanned, qr_answer_scanned, copy_number, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (student_id, exam_id) DO UPDATE
         SET status=$8, qr_answer_scanned=$6, copy_number=$7, marked_at=NOW()
       RETURNING *`,
      [
        studentIdRef, examIdRef, req.user.id,
        classroom || duties[0].classroom,
        qrAdmitScanned || null,
        qrAnswerScanned || null,
        answerSheetNumber || qrAnswerScanned || null,
        status || 'Present'
      ]
    );
    res.status(201).json({ message: '✅ Attendance marked!', attendance: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Attendance already marked for this student.' });
    res.status(500).json({ message: err.message });
  }
});

// PATCH lock/unlock
router.patch('/lock/:examId', protect, requireRole('BoardAdmin'), async (req, res) => {
  try {
    await pool.query("UPDATE exams SET status='Locked' WHERE id=$1", [req.params.examId]);
    res.json({ message: '🔒 Attendance locked for this exam' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.patch('/unlock/:examId', protect, requireRole('BoardAdmin'), async (req, res) => {
  try {
    await pool.query("UPDATE exams SET status='Ongoing' WHERE id=$1", [req.params.examId]);
    res.json({ message: '🔓 Attendance unlocked' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET auto-detect current exam for a teacher (time-window based, exact start time)
router.get('/current-exam', protect, requireRole('Teacher'), async (req, res) => {
  try {
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-CA');

    const { rows: duties } = await pool.query(
      `SELECT da.*, e.id as exam_id, e.subject, e.department, e.term, e.date, e.time, e.duration, e.class, e.status as exam_status
       FROM duty_assignments da JOIN exams e ON da.exam_id=e.id
       WHERE da.teacher_id=$1`,
      [req.user.id]
    );

    let currentExam = null;
    for (const duty of duties) {
      if (duty.date !== currentDate) continue;
      if (!duty.time) continue;
      const [h, m] = duty.time.split(':').map(Number);
      const examStart = h * 60 + m;
      const examEnd = examStart + (duty.duration || 180);
      const nowMins = now.getHours() * 60 + now.getMinutes();
      if (nowMins >= examStart && nowMins <= examEnd) { currentExam = duty; break; }
    }
    res.json({ currentExam });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET absent list
router.get('/absent-list', protect, requireRole('Teacher','BoardAdmin','SchoolAdmin'), async (req, res) => {
  try {
    const { examId } = req.query;
    const { rows: examRows } = await pool.query('SELECT * FROM exams WHERE id=$1', [examId]);
    if (!examRows[0]) return res.json([]);
    const exam = examRows[0];

    const { rows: homeSchools } = await pool.query(
      'SELECT home_school_id FROM center_assignments WHERE center_school_id=$1',
      [exam.center_id]
    );
    const schoolIds = [exam.center_id, ...homeSchools.map(h => h.home_school_id)];

    const { rows: students } = await pool.query(
      `SELECT id,name,unique_id,roll_no,class FROM users WHERE role='Student' AND class=$1 AND school_id = ANY($2::int[])`,
      [exam.class, schoolIds]
    );
    const { rows: present } = await pool.query(
      "SELECT student_id FROM attendance WHERE exam_id=$1 AND status='Present'", [examId]
    );
    const presentIds = new Set(present.map(p => p.student_id));
    const absentList = students.filter(s => !presentIds.has(s.id)).map((s, i) => ({
      srNo: i + 1, name: s.name, uniqueId: s.unique_id, rollNo: s.roll_no || '—', class: s.class,
    }));
    res.json(absentList);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET all attendance (Board/School)
router.get('/', protect, requireRole('BoardAdmin','SchoolAdmin'), async (req, res) => {
  try {
    const { examId, classroom } = req.query;
    let query = `
      SELECT a.*, u.name as student_name, u.unique_id as student_unique_id,
        u.class as student_class, u.roll_no as student_roll_no,
        e.subject as exam_subject, e.date as exam_date,
        t.name as teacher_name, t.unique_id as teacher_unique_id
      FROM attendance a JOIN users u ON a.student_id=u.id JOIN exams e ON a.exam_id=e.id
      JOIN users t ON a.teacher_id=t.id WHERE 1=1`;
    const params = [];
    if (examId)    { params.push(examId);    query += ` AND a.exam_id=$${params.length}`; }
    if (classroom) { params.push(classroom); query += ` AND a.classroom=$${params.length}`; }
    query += ' ORDER BY a.marked_at DESC LIMIT 5000';
    const { rows } = await pool.query(query, params);
    res.json(rows.map(r => ({
      _id: r.id, classroom: r.classroom, status: r.status, markedAt: r.marked_at,
      studentId: { name: r.student_name, uniqueId: r.student_unique_id, class: r.student_class, rollNo: r.student_roll_no },
      examId: { subject: r.exam_subject, date: r.exam_date },
      teacherId: { name: r.teacher_name, uniqueId: r.teacher_unique_id },
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ===== QR SCAN ROUTES =====
// The student's Admit Card QR = their unique_id (e.g. STU-001)
// No separate admit_cards table needed — the QR is printed on the
// student's admit card by the Board before exams, containing their unique_id.
// Answer Sheet QR = any QR code on the answer sheet, recorded as copy_number.

// POST Step 1 — verify admit card QR (student unique_id)
router.post('/verify-admit-qr', protect, requireRole('Teacher'), async (req, res) => {
  try {
    const { qrAdmitScanned, examId } = req.body;
    if (!qrAdmitScanned) return res.status(400).json({ valid: false, message: 'Admit card QR required' });
    if (!examId) return res.status(400).json({ valid: false, message: 'No active exam selected' });

    const cleanQr = typeof qrAdmitScanned === 'string' ? qrAdmitScanned.trim() : qrAdmitScanned;

    // Look up student by their unique_id (what's encoded in the admit card QR)
    let { rows: students } = await pool.query(
      `SELECT u.*, s.name as school_name
       FROM users u LEFT JOIN schools s ON u.school_id = s.id
       WHERE UPPER(TRIM(u.unique_id)) = UPPER($1) AND u.role = 'Student'`,
      [cleanQr]
    );
    if (!students[0]) {
      // Check exam exists
      const { rows: examRows } = await pool.query('SELECT * FROM exams WHERE id=$1', [examId]);
      if (!examRows[0]) return res.status(404).json({ valid: false, message: '❌ Exam not found' });
      const exam = examRows[0];

      // Clean up dynamic unique_id to be safe and unique (VARCHAR(20))
      const safeUniqueId = cleanQr.substring(0, 20);

      // Check if this unique_id exists as a non-Student role to avoid unique_id conflict
      const { rows: existingUser } = await pool.query('SELECT * FROM users WHERE unique_id=$1', [safeUniqueId]);
      if (existingUser[0]) {
        return res.status(400).json({
          valid: false,
          message: `❌ Unique ID '${safeUniqueId}' already belongs to a ${existingUser[0].role}.`
        });
      }

      // Generate a unique username for this student
      const usernameBase = `student_${safeUniqueId.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      let finalUsername = usernameBase;
      if (finalUsername.length > 80) {
        finalUsername = finalUsername.substring(0, 80);
      }
      finalUsername = `${finalUsername}_${Date.now()}`;

      const placeholderPasswordHash = await bcrypt.hash('Student@2026', 10);
      const studentName = '';

      // Insert new student dynamically under the exam's center school and class, setting roll_no to safeUniqueId
      const { rows: newStudentRows } = await pool.query(
        `INSERT INTO users (unique_id, name, username, password, role, school_id, class, roll_no, status)
         VALUES ($1, $2, $3, $4, 'Student', $5, $6, $7, 'Active')
         RETURNING *`,
        [
          safeUniqueId,
          studentName,
          finalUsername,
          placeholderPasswordHash,
          exam.center_id,
          exam.class,
          safeUniqueId
        ]
      );
      
      // Query the user again with school_name LEFT JOIN to match expected structure
      const { rows: reloadedStudents } = await pool.query(
        `SELECT u.*, s.name as school_name
         FROM users u LEFT JOIN schools s ON u.school_id = s.id
         WHERE u.id = $1`,
        [newStudentRows[0].id]
      );
      students = reloadedStudents;
    }
    const student = students[0];

    // Check exam exists and not locked
    const { rows: examRows } = await pool.query('SELECT * FROM exams WHERE id=$1', [examId]);
    if (!examRows[0]) return res.status(404).json({ valid: false, message: '❌ Exam not found' });
    const exam = examRows[0];
    if (exam.status === 'Locked') return res.status(403).json({ valid: false, message: '🔒 Attendance is locked for this exam.' });

    // Validate student's class matches the exam class
    if (student.class !== exam.class) {
      return res.status(400).json({ valid: false, message: `❌ Class mismatch. Student is in ${student.class || 'N/A'}, but this exam is for ${exam.class}.` });
    }

    // Validate student's school is assigned to this physical exam center
    if (student.school_id !== exam.center_id) {
      const { rows: centerCheck } = await pool.query(
        'SELECT 1 FROM center_assignments WHERE home_school_id = $1 AND center_school_id = $2',
        [student.school_id, exam.center_id]
      );
      if (centerCheck.length === 0) {
        return res.status(400).json({ valid: false, message: '❌ Invalid center. This student is not assigned to sit exams at this center.' });
      }
    }

    // Check teacher is assigned to this exam
    const { rows: duties } = await pool.query(
      'SELECT * FROM duty_assignments WHERE teacher_id=$1 AND exam_id=$2',
      [req.user.id, examId]
    );
    if (!duties[0]) return res.status(403).json({ valid: false, message: '❌ You are not assigned to this exam.' });

    // Check attendance not already marked
    const { rows: existing } = await pool.query(
      'SELECT id, copy_number FROM attendance WHERE student_id=$1 AND exam_id=$2',
      [student.id, examId]
    );
    if (existing[0]) {
      return res.status(400).json({
        valid: false,
        message: `⚠️ Already marked Present. Copy No: ${existing[0].copy_number || '—'}`
      });
    }

    res.json({
      valid: true,
      studentInfo: {
        studentName: student.name,
        studentId: student.unique_id,
        studentIdRef: student.id,
        class: student.class,
        rollNo: student.roll_no,
        admitCardId: null, // no separate admit card table
        examIdRef: examId,
        subject: examRows[0].subject,
        classroom: duties[0].classroom,
        qrAdmitScanned,
      }
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST Step 2 — record answer sheet QR (no validation — just record as copy_number)
router.post('/verify-answer-qr', protect, requireRole('Teacher'), async (req, res) => {
  try {
    const { qrAnswerScanned, admitCardId, studentIdRef, examIdRef } = req.body;
    if (!qrAnswerScanned) return res.status(400).json({ valid: false, message: 'Answer sheet QR required' });

    // Get exam + student info for preview
    const { rows: examRows } = await pool.query('SELECT * FROM exams WHERE id=$1', [examIdRef]);
    const { rows: studentRows } = await pool.query('SELECT * FROM users WHERE id=$1', [studentIdRef]);
    const { rows: duties } = await pool.query(
      'SELECT classroom FROM duty_assignments WHERE teacher_id=$1 AND exam_id=$2',
      [req.user.id, examIdRef]
    );

    res.json({
      valid: true,
      preview: {
        studentName: studentRows[0]?.name,
        studentId: studentRows[0]?.unique_id,
        studentIdRef,
        rollNo: studentRows[0]?.roll_no,
        subject: examRows[0]?.subject,
        classroom: duties[0]?.classroom || '—',
        admitCardId,
        examIdRef,
        qrAdmitScanned: studentRows[0]?.unique_id,
        qrAnswerScanned,
        answerSheetNumber: qrAnswerScanned, // whatever was scanned = copy number
      }
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
