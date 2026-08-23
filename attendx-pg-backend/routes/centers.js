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
    const { homeSchoolId, centerSchoolId, allowSelfCenter } = req.body;
    if (!homeSchoolId || !centerSchoolId)
      return res.status(400).json({ message: 'Home school and center school are required' });

    const isSelf = String(homeSchoolId) === String(centerSchoolId);
    if (isSelf && !allowSelfCenter) {
      return res.status(400).json({
        message: 'Home school and center school cannot be the same (enable "Allow Self-Center" to assign students to their own school).'
      });
    }

    // Clean up any old center assignment for this home school
    await pool.query('DELETE FROM center_assignments WHERE home_school_id=$1', [homeSchoolId]);

    const { rows } = await pool.query(
      `INSERT INTO center_assignments (home_school_id, center_school_id, assigned_by)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [homeSchoolId, centerSchoolId, req.user.id]
    );
    res.status(201).json(rows[0] || { message: 'Assignment created successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST bulk assign centers from CSV / Excel file data (Board only)
router.post('/bulk-assign', protect, requireRole('BoardAdmin'), async (req, res) => {
  try {
    const { assignments, allowSelfCenter } = req.body;
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ message: 'No center assignment records provided' });
    }

    // Load all schools for lookup by code, name, or id
    const { rows: allSchools } = await pool.query('SELECT id, name, school_id FROM schools');
    const schoolById = new Map();
    const schoolByCode = new Map();
    const schoolByName = new Map();

    allSchools.forEach(s => {
      schoolById.set(String(s.id), s);
      if (s.school_id) schoolByCode.set(String(s.school_id).trim().toLowerCase(), s);
      if (s.name) schoolByName.set(String(s.name).trim().toLowerCase(), s);
    });

    const findSchool = (id, code, name) => {
      if (id && schoolById.has(String(id))) return schoolById.get(String(id));
      if (code && schoolByCode.has(String(code).trim().toLowerCase())) return schoolByCode.get(String(code).trim().toLowerCase());
      if (name && schoolByName.has(String(name).trim().toLowerCase())) return schoolByName.get(String(name).trim().toLowerCase());
      return null;
    };

    let assignedCount = 0;
    let skippedCount = 0;
    const results = [];

    for (const item of assignments) {
      const homeSchool = findSchool(item.homeSchoolId, item.homeSchoolCode, item.homeSchoolName);
      const centerSchool = findSchool(item.centerSchoolId, item.centerSchoolCode, item.centerSchoolName);

      if (!homeSchool) {
        results.push({
          row: item,
          success: false,
          error: `Home school "${item.homeSchoolCode || item.homeSchoolName || item.homeSchoolId}" not found in database.`
        });
        skippedCount++;
        continue;
      }

      if (!centerSchool) {
        results.push({
          row: item,
          success: false,
          error: `Center school "${item.centerSchoolCode || item.centerSchoolName || item.centerSchoolId}" not found in database.`
        });
        skippedCount++;
        continue;
      }

      const isSelf = (homeSchool.id === centerSchool.id);
      if (isSelf && !allowSelfCenter && !item.allowSelfCenter) {
        results.push({
          row: item,
          success: false,
          error: `Self-center skipped: School "${homeSchool.name}" (${homeSchool.school_id}) is assigned to itself (enable "Allow Self-Center" if intended).`
        });
        skippedCount++;
        continue;
      }

      // Remove existing assignment for home school and insert new
      await pool.query('DELETE FROM center_assignments WHERE home_school_id=$1', [homeSchool.id]);
      const { rows: inserted } = await pool.query(
        `INSERT INTO center_assignments (home_school_id, center_school_id, assigned_by)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [homeSchool.id, centerSchool.id, req.user.id]
      );

      results.push({
        row: item,
        success: true,
        isSelfCenter: isSelf,
        assignmentId: inserted[0]?.id,
        homeSchool: { id: homeSchool.id, name: homeSchool.name, schoolId: homeSchool.school_id },
        centerSchool: { id: centerSchool.id, name: centerSchool.name, schoolId: centerSchool.school_id },
      });
      assignedCount++;
    }

    res.json({
      message: `Bulk assignment complete: ${assignedCount} assigned successfully, ${skippedCount} skipped/failed.`,
      assignedCount,
      skippedCount,
      results
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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
      isSelfCenter: (r.home_school_id === r.center_school_id),
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
    const schoolId = req.user.school_id;

    // Home schools assigned to take exams AT this center
    const { rows: assignments } = await pool.query(`
      SELECT ca.id, hs.id as home_school_id, hs.name as home_school_name, hs.school_id as home_school_code
      FROM center_assignments ca
      JOIN schools hs ON ca.home_school_id = hs.id
      WHERE ca.center_school_id = $1
    `, [schoolId]);

    // Check if this school itself is assigned as home_school to a center
    const { rows: centerHomeRecord } = await pool.query(`
      SELECT ca.id, cs.id as center_school_id, cs.name as center_school_name, cs.school_id as center_school_code
      FROM center_assignments ca
      JOIN schools cs ON ca.center_school_id = cs.id
      WHERE ca.home_school_id = $1
    `, [schoolId]);

    const isSelfCenter = centerHomeRecord.length > 0 && centerHomeRecord[0].center_school_id === schoolId;
    const isSentToExternalCenter = centerHomeRecord.length > 0 && centerHomeRecord[0].center_school_id !== schoolId;
    const externalCenter = isSentToExternalCenter ? {
      id: centerHomeRecord[0].center_school_id,
      name: centerHomeRecord[0].center_school_name,
      schoolCode: centerHomeRecord[0].center_school_code
    } : null;

    // Count incoming home schools
    const homeSchoolIds = assignments.map(a => a.home_school_id);
    let studentCounts = {};
    if (homeSchoolIds.length > 0) {
      const { rows: counts } = await pool.query(
        `SELECT school_id, COUNT(*) as cnt FROM users WHERE role='Student' AND school_id = ANY($1::int[]) GROUP BY school_id`,
        [homeSchoolIds]
      );
      counts.forEach(c => { studentCounts[c.school_id] = parseInt(c.cnt); });
    }

    // Own registered students total
    const { rows: ownCount } = await pool.query(
      `SELECT COUNT(*) as cnt FROM users WHERE role='Student' AND school_id=$1`,
      [schoolId]
    );
    const ownStudentsTotal = parseInt(ownCount[0]?.cnt || 0);

    // Incoming students (excluding own school if present in assignments)
    const incomingSchools = assignments.filter(a => a.home_school_id !== schoolId);
    const totalIncomingStudents = incomingSchools.reduce((acc, s) => acc + (studentCounts[s.home_school_id] || 0), 0);

    // Do own students sit here? Only if self-center is active
    const ownStudentsAtThisCenter = isSelfCenter ? ownStudentsTotal : 0;
    const totalCenterCandidates = totalIncomingStudents + ownStudentsAtThisCenter;

    res.json({
      isCenter: assignments.length > 0,
      isSelfCenter,
      isSentToExternalCenter,
      externalCenter,
      ownStudentsTotal,
      ownStudentsAtThisCenter,
      assignedSchools: incomingSchools.map(a => ({
        id: a.home_school_id,
        name: a.home_school_name,
        schoolCode: a.home_school_code,
        studentCount: studentCounts[a.home_school_id] || 0,
      })),
      totalIncomingStudents,
      totalCenterCandidates
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
