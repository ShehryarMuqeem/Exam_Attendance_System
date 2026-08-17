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
    const schoolIds = Array.from(new Set([exam.center_id, ...homeSchools.map(h => h.home_school_id)]));

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

    // Deduplicate students by roll_no and unique_id so no duplicate roll numbers appear
    const seenRolls = new Set();
    const seenUids = new Set();
    const uniqueStudents = [];
    for (const s of students) {
      const rollKey = (s.roll_no || '').trim().toLowerCase();
      const uidKey = (s.unique_id || '').trim().toLowerCase();
      if (rollKey && seenRolls.has(rollKey)) continue;
      if (uidKey && seenUids.has(uidKey)) continue;
      if (rollKey) seenRolls.add(rollKey);
      if (uidKey) seenUids.add(uidKey);
      uniqueStudents.push(s);
    }

    // Filter students by room allocation:
    // They must either be explicitly assigned to the teacher's classroom, OR
    // have NO classroom assigned yet (not present in attendanceMap).
    const teacherClassroom = duties[0].classroom;
    const filteredStudents = uniqueStudents.filter(s => {
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
    const finalCopyNumber = (answerSheetNumber || qrAnswerScanned || '').toString().trim();
    if (!finalCopyNumber) {
      return res.status(400).json({ message: 'Copy / Answer sheet number is required.' });
    }

    const { rows: duties } = await pool.query(
      'SELECT classroom FROM duty_assignments WHERE teacher_id=$1 AND exam_id=$2',
      [req.user.id, examIdRef]
    );
    if (!duties[0]) return res.status(403).json({ message: 'You are not assigned to this exam.' });

    const { rows: examRows } = await pool.query('SELECT status FROM exams WHERE id=$1', [examIdRef]);
    if (examRows[0]?.status === 'Locked') return res.status(403).json({ message: '🔒 Attendance is locked for this exam.' });

    // Validate duplicate copy number before insert
    const { rows: duplicateCopy } = await pool.query(
      `SELECT a.id, a.copy_number, u.name as student_name, u.roll_no 
       FROM attendance a 
       LEFT JOIN users u ON a.student_id = u.id 
       WHERE a.exam_id = $1 
         AND (LOWER(TRIM(a.copy_number)) = LOWER(TRIM($2)) OR LOWER(TRIM(a.qr_answer_scanned)) = LOWER(TRIM($2)))
         AND a.student_id != $3`,
      [examIdRef, finalCopyNumber, studentIdRef]
    );
    if (duplicateCopy.length > 0) {
      const prevStudent = duplicateCopy[0];
      return res.status(400).json({
        message: `❌ Duplicate Copy Number! Copy No. "${finalCopyNumber}" is already assigned to student (Roll No: ${prevStudent.roll_no || '—'}, Name: ${prevStudent.student_name || 'Student'}).`
      });
    }

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
        finalCopyNumber || null,
        finalCopyNumber || null,
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

// GET auto-detect current exam for a teacher (strict date & time window, no past fallbacks)
router.get('/current-exam', protect, requireRole('Teacher'), async (req, res) => {
  try {
    let currentDate = req.query.date;
    let currentTime = req.query.time;

    const now = new Date();
    if (!currentDate) {
      currentDate = now.toLocaleDateString('en-CA');
    }

    const { rows: duties } = await pool.query(
      `SELECT da.*, e.id as exam_id, e.subject, e.department, e.term, e.date, e.time, e.duration, e.class, e.shift, e.status as exam_status,
              s.name as center_name
       FROM duty_assignments da 
       JOIN exams e ON da.exam_id = e.id
       LEFT JOIN schools s ON e.center_id = s.id
       WHERE da.teacher_id = $1
       ORDER BY e.date ASC, e.time ASC`,
      [req.user.id]
    );

    let currentExam = null;
    let nowMins;
    if (currentTime) {
      const [h, m] = currentTime.split(':').map(Number);
      nowMins = h * 60 + m;
    } else {
      nowMins = now.getHours() * 60 + now.getMinutes();
    }

    // Only consider exams scheduled for TODAY that are not Locked
    const todayDuties = duties.filter(d => d.date === currentDate && d.exam_status !== 'Locked');

    for (const duty of todayDuties) {
      if (duty.time) {
        const [h, m] = duty.time.split(':').map(Number);
        const examStart = h * 60 + m;
        const examDuration = Number(duty.duration) || 180;
        const examEnd = examStart + examDuration;
        // Allow attendance marking from 30 mins before start until 30 mins after end
        const windowStart = Math.max(0, examStart - 30);
        const windowEnd = examEnd + 30;
        if (nowMins >= windowStart && nowMins <= windowEnd) {
          currentExam = duty;
          break;
        }
      } else {
        // If no specific time was set for today's exam, consider it current for today
        currentExam = duty;
        break;
      }
    }

    // Do NOT fallback to past or future exams or exams whose time has passed
    res.json({
      currentExam,
      assignedExams: duties
    });
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
    const schoolIds = Array.from(new Set([exam.center_id, ...homeSchools.map(h => h.home_school_id)]));

    const { rows: students } = await pool.query(
      `SELECT id,name,unique_id,roll_no,class FROM users 
       WHERE role='Student' AND class=$1 AND school_id = ANY($2::int[])
       ORDER BY CAST(NULLIF(regexp_replace(roll_no, '[^0-9]', '', 'g'), '') AS INTEGER) NULLS LAST, name`,
      [exam.class, schoolIds]
    );

    // Deduplicate students list
    const seenRolls = new Set();
    const seenUids = new Set();
    const uniqueStudents = [];
    for (const s of students) {
      const rollKey = (s.roll_no || '').trim().toLowerCase();
      const uidKey = (s.unique_id || '').trim().toLowerCase();
      if (rollKey && seenRolls.has(rollKey)) continue;
      if (uidKey && seenUids.has(uidKey)) continue;
      if (rollKey) seenRolls.add(rollKey);
      if (uidKey) seenUids.add(uidKey);
      uniqueStudents.push(s);
    }

    const { rows: present } = await pool.query(
      "SELECT student_id FROM attendance WHERE exam_id=$1 AND status='Present'", [examId]
    );
    const presentIds = new Set(present.map(p => p.student_id));
    const absentList = uniqueStudents.filter(s => !presentIds.has(s.id)).map((s, i) => ({
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
      SELECT a.*, 
        u.name as student_name, 
        u.unique_id as student_unique_id,
        u.class as student_class, 
        u.roll_no as student_roll_no,
        s.name as student_school_name,
        e.subject as exam_subject, 
        e.date as exam_date,
        e.time as exam_time,
        e.class as exam_class,
        e.shift as exam_shift,
        cs.name as center_school_name,
        t.name as teacher_name, 
        t.unique_id as teacher_unique_id
      FROM attendance a 
      JOIN users u ON a.student_id = u.id 
      LEFT JOIN schools s ON u.school_id = s.id
      JOIN exams e ON a.exam_id = e.id
      LEFT JOIN schools cs ON e.center_id = cs.id
      LEFT JOIN users t ON a.teacher_id = t.id 
      WHERE 1=1`;
    const params = [];
    if (examId)    { params.push(examId);    query += ` AND a.exam_id=$${params.length}`; }
    if (classroom) { params.push(classroom); query += ` AND a.classroom=$${params.length}`; }
    query += ' ORDER BY a.marked_at DESC LIMIT 5000';
    const { rows } = await pool.query(query, params);
    res.json(rows.map(r => {
      const displayName = r.student_name && !r.student_name.startsWith('Ad-hoc Student')
        ? r.student_name
        : (r.student_roll_no ? `Roll No. ${r.student_roll_no}` : (r.student_unique_id || 'Student'));
      const displayRoll = r.student_roll_no || r.student_unique_id || '—';
      return {
        _id: r.id,
        id: r.id,
        classroom: r.classroom || '—',
        status: r.status || 'Present',
        copyNumber: r.copy_number || '—',
        markedAt: r.marked_at,
        studentId: {
          id: r.student_id,
          name: displayName,
          uniqueId: r.student_unique_id,
          class: r.student_class || r.exam_class || '—',
          rollNo: displayRoll,
          schoolName: r.student_school_name || '—',
        },
        examId: {
          id: r.exam_id,
          subject: r.exam_subject,
          date: r.exam_date,
          time: r.exam_time,
          class: r.exam_class,
          shift: r.exam_shift,
          centerName: r.center_school_name || '—',
        },
        teacherId: {
          name: r.teacher_name || 'Invigilator',
          uniqueId: r.teacher_unique_id || '—',
        },
      };
    }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ===== QR SCAN ROUTES =====
// The student's Admit Card QR = their unique_id or roll_no (e.g. STU-001 or 1001)
// No separate admit_cards table needed — the QR is printed on the
// student's admit card by the Board before exams, containing their unique_id or roll_no.
// Answer Sheet QR = any QR code on the answer sheet, recorded as copy_number.

// POST Step 1 — verify admit card QR (student unique_id or roll_no)
router.post('/verify-admit-qr', protect, requireRole('Teacher'), async (req, res) => {
  try {
    const { qrAdmitScanned, examId } = req.body;
    if (!qrAdmitScanned) return res.status(400).json({ valid: false, message: 'Admit card QR required' });
    if (!examId) return res.status(400).json({ valid: false, message: 'No active exam selected' });

    const cleanQr = typeof qrAdmitScanned === 'string' ? qrAdmitScanned.trim() : String(qrAdmitScanned).trim();

    // Check exam exists and not locked
    const { rows: examRows } = await pool.query('SELECT * FROM exams WHERE id=$1', [examId]);
    if (!examRows[0]) return res.status(404).json({ valid: false, message: '❌ Exam not found' });
    const exam = examRows[0];
    if (exam.status === 'Locked') return res.status(403).json({ valid: false, message: '🔒 Attendance is locked for this exam.' });

    // Look up student by unique_id OR roll_no in center-assigned schools for this exam
    const { rows: homeSchools } = await pool.query(
      'SELECT home_school_id FROM center_assignments WHERE center_school_id=$1',
      [exam.center_id]
    );
    const schoolIds = Array.from(new Set([exam.center_id, ...homeSchools.map(h => h.home_school_id)]));

    let { rows: students } = await pool.query(
      `SELECT u.*, s.name as school_name
       FROM users u LEFT JOIN schools s ON u.school_id = s.id
       WHERE (UPPER(TRIM(u.unique_id)) = UPPER($1) OR UPPER(TRIM(u.roll_no)) = UPPER($1))
         AND u.role = 'Student'
         AND u.class = $2
         AND u.school_id = ANY($3::int[])
       ORDER BY (UPPER(TRIM(u.unique_id)) = UPPER($1)) DESC, u.id ASC`,
      [cleanQr, exam.class, schoolIds]
    );

    // If not found in center schools, check if student exists across all schools
    if (!students[0]) {
      const { rows: globalStudents } = await pool.query(
        `SELECT u.*, s.name as school_name
         FROM users u LEFT JOIN schools s ON u.school_id = s.id
         WHERE (UPPER(TRIM(u.unique_id)) = UPPER($1) OR UPPER(TRIM(u.roll_no)) = UPPER($1))
           AND u.role = 'Student'
         ORDER BY (UPPER(TRIM(u.unique_id)) = UPPER($1)) DESC, u.id ASC`,
        [cleanQr]
      );
      if (globalStudents[0]) {
        students = globalStudents;
      }
    }

    if (!students[0]) {
      // Check if duplicate roll_no exists in this exam's center/class to avoid duplicating
      const safeUniqueId = cleanQr.substring(0, 20);
      const { rows: duplicateCheck } = await pool.query(
        `SELECT id FROM users 
         WHERE role = 'Student' AND school_id = $1 AND class = $2 
           AND (UPPER(TRIM(roll_no)) = UPPER($3) OR UPPER(TRIM(unique_id)) = UPPER($4))`,
        [exam.center_id, exam.class, cleanQr, safeUniqueId]
      );

      if (duplicateCheck.length > 0) {
        const { rows: reloaded } = await pool.query(
          `SELECT u.*, s.name as school_name FROM users u LEFT JOIN schools s ON u.school_id = s.id WHERE u.id = $1`,
          [duplicateCheck[0].id]
        );
        students = reloaded;
      } else {
        // Insert new student dynamically under the exam's center school and class
        const usernameBase = `student_${safeUniqueId.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        let finalUsername = usernameBase.slice(0, 50) + `_${Date.now()}`;
        const placeholderPasswordHash = await bcrypt.hash('Student@2026', 10);

        const { rows: newStudentRows } = await pool.query(
          `INSERT INTO users (unique_id, name, username, password, role, school_id, class, roll_no, status)
           VALUES ($1, $2, $3, $4, 'Student', $5, $6, $7, 'Active')
           RETURNING *`,
          [
            safeUniqueId,
            '',
            finalUsername,
            placeholderPasswordHash,
            exam.center_id,
            exam.class,
            cleanQr
          ]
        );
        
        const { rows: reloadedStudents } = await pool.query(
          `SELECT u.*, s.name as school_name
           FROM users u LEFT JOIN schools s ON u.school_id = s.id
           WHERE u.id = $1`,
          [newStudentRows[0].id]
        );
        students = reloadedStudents;
      }
    }
    const student = students[0];

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

// POST Step 2 — record answer sheet QR (validate uniqueness against exam)
router.post('/verify-answer-qr', protect, requireRole('Teacher'), async (req, res) => {
  try {
    const { qrAnswerScanned, admitCardId, studentIdRef, examIdRef } = req.body;
    const cleanCopyNumber = (qrAnswerScanned || '').toString().trim();
    if (!cleanCopyNumber) {
      return res.status(400).json({ valid: false, message: '❌ Answer sheet QR / Copy number is required' });
    }

    // Check if this copy number / answer sheet QR is already assigned for this exam
    const { rows: existingCopy } = await pool.query(
      `SELECT a.id, a.copy_number, a.student_id, u.name as student_name, u.roll_no 
       FROM attendance a 
       LEFT JOIN users u ON a.student_id = u.id 
       WHERE a.exam_id = $1 
         AND (LOWER(TRIM(a.copy_number)) = LOWER(TRIM($2)) OR LOWER(TRIM(a.qr_answer_scanned)) = LOWER(TRIM($2)))
         AND a.student_id != $3`,
      [examIdRef, cleanCopyNumber, studentIdRef]
    );

    if (existingCopy.length > 0) {
      const prevStudent = existingCopy[0];
      return res.status(400).json({
        valid: false,
        message: `❌ Duplicate Copy Number! Copy No. "${cleanCopyNumber}" has already been assigned to another student (Roll No: ${prevStudent.roll_no || '—'}, Name: ${prevStudent.student_name || 'Student'}). Please use a different copy number.`
      });
    }

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
        qrAnswerScanned: cleanCopyNumber,
        answerSheetNumber: cleanCopyNumber, // whatever was scanned/entered = copy number
      }
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
