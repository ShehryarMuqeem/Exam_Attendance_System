const express = require('express');
const router = express.Router();
const pool = require('../db');
const { protect, requireRole } = require('../middleware/auth');

// ===== Examination Center Management =====
//
// The Board assigns a school to act as the physical exam center for one or
// more "home" schools (the school whose students actually sit the exam there).
// The center school's own admin then manages duty/attendance for everyone
// sitting at their location — including students who are not their own.
//
// A school is implicitly its own center for its own students unless/until the
// Board explicitly assigns it elsewhere — center_assignments only stores the
// non-default cases.

// POST assign a center (Board only)
router.post('/assign', protect, requireRole('BoardAdmin'), async (req, res) => {
  try {
    const { homeSchoolId, centerSchoolId } = req.body;
    if (!homeSchoolId || !centerSchoolId)
      return res.status(400).json({ message: 'Home school and center school are required' });
    if (homeSchoolId === centerSchoolId)
      return res.status(400).json({ message: 'A school is already its own center by default — no assignment needed.' });

    const { rows } = await pool.query(
      `INSERT INTO center_assignments (home_school_id, center_school_id, assigned_by)
       VALUES ($1,$2,$3)
       ON CONFLICT (home_school_id, center_school_id) DO NOTHING
       RETURNING *`,
      [homeSchoolId, centerSchoolId, req.user.id]
    );
    res.status(201).json(rows[0] || { message: 'Assignment already exists' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET all center assignments (Board view)
router.get('/', protect, requireRole('BoardAdmin'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT ca.id, ca.created_at,
        hs.id as home_school_id, hs.name as home_school_name, hs.school_id as home_school_code,
        cs.id as center_school_id, cs.name as center_school_name, cs.school_id as center_school_code
      FROM center_assignments ca
      JOIN schools hs ON ca.home_school_id = hs.id
      JOIN schools cs ON ca.center_school_id = cs.id
      ORDER BY ca.created_at DESC
    `);
    res.json(rows.map(r => ({
      _id: r.id,
      homeSchool: { id: r.home_school_id, name: r.home_school_name, schoolId: r.home_school_code },
      centerSchool: { id: r.center_school_id, name: r.center_school_name, schoolId: r.center_school_code },
      createdAt: r.created_at,
    })));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE a center assignment
router.delete('/:id', protect, requireRole('BoardAdmin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM center_assignments WHERE id=$1', [req.params.id]);
    res.json({ message: 'Center assignment removed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET center info for the logged-in SchoolAdmin's own school — "which home
// schools are assigned to me as a center, and how many of their students does
// that bring in" — shown on the School Admin dashboard.
router.get('/my-center-info', protect, requireRole('SchoolAdmin'), async (req, res) => {
  try {
    const { rows: assignments } = await pool.query(`
      SELECT ca.id, hs.id as home_school_id, hs.name as home_school_name, hs.school_id as home_school_code
      FROM center_assignments ca
      JOIN schools hs ON ca.home_school_id = hs.id
      WHERE ca.center_school_id = $1
    `, [req.user.school_id]);

    const homeSchoolIds = assignments.map(a => a.home_school_id);
    let studentCounts = {};
    if (homeSchoolIds.length > 0) {
      const { rows: counts } = await pool.query(
        `SELECT school_id, COUNT(*) as cnt FROM users WHERE role='Student' AND school_id = ANY($1::int[]) GROUP BY school_id`,
        [homeSchoolIds]
      );
      counts.forEach(c => { studentCounts[c.school_id] = parseInt(c.cnt); });
    }

    // Also include this school's own students, since it's a center for itself by default
    const { rows: ownCount } = await pool.query(
      `SELECT COUNT(*) as cnt FROM users WHERE role='Student' AND school_id=$1`,
      [req.user.school_id]
    );

    res.json({
      isCenter: assignments.length > 0,
      ownStudents: parseInt(ownCount[0]?.cnt || 0),
      assignedSchools: assignments.map(a => ({
        id: a.home_school_id,
        name: a.home_school_name,
        schoolCode: a.home_school_code,
        studentCount: studentCounts[a.home_school_id] || 0,
      })),
      totalIncomingStudents: Object.values(studentCounts).reduce((a, b) => a + b, 0),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
