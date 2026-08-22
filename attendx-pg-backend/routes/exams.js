const express = require('express');
const router = express.Router();
const pool = require('../db');
const { protect, requireRole } = require('../middleware/auth');

async function nextExamId() {
  const { rows } = await pool.query("SELECT nextval('exam_id_seq') as n");
  return `EXAM-${new Date().getFullYear()}-${String(rows[0].n).padStart(3,'0')}`;
}

function computeExamStatus(e) {
  if (e.status === 'Locked') return 'Locked';
  if (!e.date) return e.status || 'Scheduled';

  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA');
  const nowMins = now.getHours() * 60 + now.getMinutes();

  if (e.date < todayStr) {
    return 'Done';
  } else if (e.date > todayStr) {
    return 'Scheduled';
  } else {
    // e.date === todayStr
    if (!e.time) return 'Ongoing';
    const [h, m] = e.time.split(':').map(Number);
    const examStart = h * 60 + m;
    const examEnd = examStart + (Number(e.duration) || 180);
    if (nowMins < examStart) return 'Scheduled';
    if (nowMins > examEnd) return 'Done';
    return 'Ongoing';
  }
}

function mapExam(e) {
  return {
    _id: e.id, id: e.id, examId: e.exam_id,
    academicYear: e.academic_year, term: e.term, shift: e.shift,
    department: e.department, subject: e.subject, class: e.class,
    date: e.date, time: e.time, duration: e.duration, roomNo: e.room_no,
    status: computeExamStatus(e), classroom: e.classroom,
    centerId: e.center_id, centerName: e.center_school_name,
  };
}

// GET exams — scoped by role. Teachers only see exams they have duty for, at
// the center they belong to (their school). SchoolAdmin/BoardAdmin see the
// relevant broader set.
router.get('/', protect, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'Teacher') {
      const r = await pool.query(
        `SELECT e.*, da.classroom, s.name as center_school_name FROM exams e
         JOIN duty_assignments da ON da.exam_id=e.id
         LEFT JOIN schools s ON e.center_id = s.id
         WHERE da.teacher_id=$1 ORDER BY e.created_at DESC`,
        [req.user.id]
      );
      rows = r.rows;
    } else if (req.user.role === 'SchoolAdmin') {
      // A School Admin sees exams held at their own school as a center
      const r = await pool.query(
        `SELECT e.*, s.name as center_school_name FROM exams e
         LEFT JOIN schools s ON e.center_id = s.id
         WHERE e.center_id=$1 ORDER BY e.created_at DESC`,
        [req.user.school_id]
      );
      rows = r.rows;
    } else {
      const r = await pool.query(
        `SELECT e.*, s.name as center_school_name FROM exams e
         LEFT JOIN schools s ON e.center_id = s.id
         ORDER BY e.created_at DESC LIMIT 1000`
      );
      rows = r.rows;
    }
    res.json(rows.map(mapExam));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create exam — full academic hierarchy + center, Board only
router.post('/', protect, requireRole('BoardAdmin'), async (req, res) => {
  try {
    const { academicYear, term, shift, department, subject, class: cls, date, time, duration, roomNo, centerId, allCenters } = req.body;
    if (!academicYear || !term || !department || !subject || !cls || !date) {
      return res.status(400).json({ message: 'Academic year, term, department, subject, class, and date are required.' });
    }
    if (!centerId && !allCenters) {
      return res.status(400).json({ message: 'Center is required if not assigning to all centers.' });
    }

    const todayStr = new Date().toLocaleDateString('en-CA');
    if (date < todayStr) {
      return res.status(400).json({ message: '❌ Exam date cannot be in the past.' });
    }

    let centerIds = [];
    if (allCenters) {
      const { rows: centerRows } = await pool.query('SELECT DISTINCT center_school_id FROM center_assignments');
      centerIds = centerRows.map(r => r.center_school_id);
      if (centerIds.length === 0 && centerId) {
        centerIds.push(centerId);
      }
    } else {
      centerIds.push(centerId);
    }

    if (centerIds.length === 0) {
      return res.status(400).json({ message: '❌ No active exam centers found to assign exams to.' });
    }

    const createdExams = [];
    for (const cid of centerIds) {
      const examId = await nextExamId();
      const { rows } = await pool.query(
        `INSERT INTO exams (exam_id,academic_year,term,shift,department,subject,class,date,time,duration,room_no,center_id,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [examId, academicYear, term, shift||'Morning', department, subject, cls, date, time||null, duration||null, roomNo||null, cid, req.user.id]
      );
      createdExams.push(mapExam(rows[0]));
    }

    res.status(201).json(allCenters ? createdExams : createdExams[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE exam
router.delete('/:id', protect, requireRole('BoardAdmin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM exams WHERE id=$1', [req.params.id]);
    res.json({ message: 'Exam deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET available blocks for the School Admin's center
router.get('/blocks', protect, requireRole('SchoolAdmin', 'BoardAdmin'), async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    let savedBlocks = [];
    if (schoolId) {
      const { rows } = await pool.query(
        'SELECT block_name FROM school_blocks WHERE school_id = $1 ORDER BY block_name',
        [schoolId]
      );
      savedBlocks = rows.map(r => r.block_name);
    }

    // Default standard blocks
    const defaultBlocks = ['Block 1', 'Block 2', 'Block 3', 'Block 4', 'Block 5', 'Block A', 'Block B', 'Block C'];
    const allBlocks = Array.from(new Set([...defaultBlocks, ...savedBlocks]));
    res.json(allBlocks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST add a new block for school center
router.post('/blocks', protect, requireRole('SchoolAdmin'), async (req, res) => {
  try {
    const { blockName } = req.body;
    if (!blockName || !blockName.trim()) {
      return res.status(400).json({ message: 'Block name is required' });
    }
    const cleanBlock = blockName.trim();
    await pool.query(
      'INSERT INTO school_blocks (school_id, block_name) VALUES ($1, $2) ON CONFLICT (school_id, block_name) DO NOTHING',
      [req.user.school_id, cleanBlock]
    );
    res.json({ success: true, blockName: cleanBlock });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET exam-specific block summary (assigned teachers and student counts per block)
router.get('/:id/blocks', protect, requireRole('SchoolAdmin', 'BoardAdmin'), async (req, res) => {
  try {
    const examId = req.params.id;
    const { rows: dutyRows } = await pool.query(
      `SELECT da.classroom as block_name, da.teacher_id, u.name as teacher_name, u.unique_id as teacher_unique_id
       FROM duty_assignments da JOIN users u ON da.teacher_id = u.id
       WHERE da.exam_id = $1`,
      [examId]
    );

    const { rows: studentCounts } = await pool.query(
      `SELECT classroom as block_name, COUNT(*) as student_count
       FROM attendance
       WHERE exam_id = $1 AND classroom != 'Unallocated'
       GROUP BY classroom`,
      [examId]
    );

    const countMap = {};
    studentCounts.forEach(c => {
      countMap[c.block_name] = parseInt(c.student_count) || 0;
    });

    const blocks = dutyRows.map(d => ({
      blockName: d.block_name,
      teacherId: d.teacher_id,
      teacherName: d.teacher_name,
      teacherUniqueId: d.teacher_unique_id,
      studentCount: countMap[d.block_name] || 0,
    }));

    res.json(blocks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST assign duty to teacher for a block
router.post('/:id/assign-duty', protect, requireRole('SchoolAdmin'), async (req, res) => {
  try {
    const { teacherId, classroom, block } = req.body;
    const targetBlock = (block || classroom || '').trim();
    if (!teacherId || !targetBlock) {
      return res.status(400).json({ message: 'Teacher and Block are required.' });
    }

    // Verify this exam's center IS this admin's school
    const { rows: examRows } = await pool.query('SELECT center_id FROM exams WHERE id=$1', [req.params.id]);
    if (!examRows[0]) return res.status(404).json({ message: 'Exam not found' });
    if (examRows[0].center_id !== req.user.school_id) {
      return res.status(403).json({ message: 'This exam is not held at your center.' });
    }

    // Verify teacher belongs to this same school — "no external staff" rule
    const { rows: teacherRows } = await pool.query(
      "SELECT id FROM users WHERE id=$1 AND role='Teacher' AND school_id=$2",
      [teacherId, req.user.school_id]
    );
    if (!teacherRows[0]) {
      return res.status(403).json({ message: 'You can only assign duty to teachers from your own school/center staff.' });
    }

    // Save block into school_blocks for future quick access
    await pool.query(
      'INSERT INTO school_blocks (school_id, block_name) VALUES ($1, $2) ON CONFLICT (school_id, block_name) DO NOTHING',
      [req.user.school_id, targetBlock]
    );

    const { rows } = await pool.query(
      `INSERT INTO duty_assignments (teacher_id,exam_id,classroom,assigned_by)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (teacher_id,exam_id) DO UPDATE SET classroom=$3
       RETURNING *, classroom as block`,
      [teacherId, req.params.id, targetBlock, req.user.id]
    );
    await pool.query('UPDATE users SET assigned_classroom=$1 WHERE id=$2', [targetBlock, teacherId]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET classrooms from exams held at the requesting School Admin's center
router.get('/classrooms', protect, requireRole('SchoolAdmin','BoardAdmin'), async (req, res) => {
  try {
    let query = `SELECT DISTINCT class as classroom, class, department, subject, date FROM exams`;
    let params = [];
    if (req.user.role === 'SchoolAdmin') {
      query += ' WHERE center_id=$1';
      params = [req.user.school_id];
    }
    query += ' ORDER BY class';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET duties for exam
router.get('/:id/duties', protect, requireRole('SchoolAdmin','BoardAdmin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT da.*, u.name as teacher_name, u.unique_id as teacher_unique_id
       FROM duty_assignments da JOIN users u ON da.teacher_id=u.id
       WHERE da.exam_id=$1`,
      [req.params.id]
    );
    const mapped = rows.map(d => ({
      _id: d.id, classroom: d.classroom, block: d.classroom,
      teacherId: { _id: d.teacher_id, name: d.teacher_name, uniqueId: d.teacher_unique_id }
    }));
    res.json(mapped);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST assign students to a block (SchoolAdmin/BoardAdmin)
router.post('/:id/assign-students-room', protect, requireRole('SchoolAdmin'), async (req, res) => {
  try {
    const examId = req.params.id;
    const { classroom, block, studentIds } = req.body;
    const targetBlock = (block || classroom || '').trim();
    if (!targetBlock || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ message: 'Block and studentIds are required.' });
    }

    // Verify this exam's center is this admin's school
    const { rows: examRows } = await pool.query('SELECT center_id FROM exams WHERE id=$1', [examId]);
    if (!examRows[0]) return res.status(404).json({ message: 'Exam not found' });
    if (examRows[0].center_id !== req.user.school_id) {
      return res.status(403).json({ message: 'This exam is not held at your center.' });
    }

    // Auto-save block to school_blocks
    await pool.query(
      'INSERT INTO school_blocks (school_id, block_name) VALUES ($1, $2) ON CONFLICT (school_id, block_name) DO NOTHING',
      [req.user.school_id, targetBlock]
    );

    // Assign each student to the block. Set status to 'Absent' by default.
    for (const studentId of studentIds) {
      await pool.query(
        `INSERT INTO attendance (student_id, exam_id, teacher_id, classroom, status)
         VALUES ($1, $2, $3, $4, 'Absent')
         ON CONFLICT (student_id, exam_id) DO UPDATE 
           SET classroom = $4`,
        [studentId, examId, req.user.id, targetBlock]
      );
    }

    res.json({ success: true, message: `✅ Successfully allocated ${studentIds.length} student(s) to ${targetBlock}!` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET roster for an exam at this center (SchoolAdmin/BoardAdmin view)
router.get('/:id/roster', protect, requireRole('SchoolAdmin','BoardAdmin'), async (req, res) => {
  try {
    const examId = req.params.id;
    const { rows: examRows } = await pool.query('SELECT * FROM exams WHERE id=$1', [examId]);
    if (!examRows[0]) return res.status(404).json({ message: 'Exam not found' });
    const exam = examRows[0];

    // Check center assignment
    if (req.user.role === 'SchoolAdmin' && exam.center_id !== req.user.school_id) {
      return res.status(403).json({ message: 'This exam is not held at your center.' });
    }

    // Get home schools assigned to this center
    const { rows: homeSchools } = await pool.query(
      'SELECT home_school_id FROM center_assignments WHERE center_school_id=$1',
      [exam.center_id]
    );
    const schoolIds = Array.from(new Set([exam.center_id, ...homeSchools.map(h => h.home_school_id)]));

    // Fetch all students matching exam class & school list & academic year
    const { rows: students } = await pool.query(
      `SELECT u.id, u.name, u.unique_id, u.roll_no, u.class, s.name as school_name
       FROM users u LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.role='Student' AND u.class=$1 AND u.school_id = ANY($2::int[]) AND (u.academic_year=$3 OR u.academic_year IS NULL)
       ORDER BY CAST(NULLIF(regexp_replace(u.roll_no, '[^0-9]', '', 'g'), '') AS INTEGER) NULLS LAST, u.name`,
      [exam.class, schoolIds, exam.academic_year]
    );

    // Get current attendance/room assignments for this exam
    const { rows: attended } = await pool.query(
      'SELECT student_id, classroom, status FROM attendance WHERE exam_id=$1',
      [examId]
    );
    const attendanceMap = {};
    attended.forEach(a => {
      attendanceMap[a.student_id] = { classroom: a.classroom, status: a.status };
    });

    // Deduplicate students list by unique id
    const seenUids = new Set();
    const uniqueStudents = [];
    for (const s of students) {
      if (s.id && seenUids.has(s.id)) continue;
      if (s.id) seenUids.add(s.id);
      uniqueStudents.push(s);
    }

    res.json(uniqueStudents.map((s, i) => ({
      srNo: i + 1,
      id: s.id,
      name: s.name,
      uniqueId: s.unique_id,
      rollNo: s.roll_no || '—',
      schoolName: s.school_name,
      classroom: attendanceMap[s.id]?.classroom || 'Unallocated',
      status: attendanceMap[s.id]?.status || 'Unmarked'
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
