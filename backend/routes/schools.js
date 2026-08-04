const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { protect, requireRole } = require('../middleware/auth');

async function nextSchoolId() {
  const { rows } = await pool.query("SELECT nextval('school_id_seq') as n");
  return `SCH-${String(rows[0].n).padStart(3, '0')}`;
}

// GET all schools (Board) — used for the "Assign Center" school picker too
router.get('/', protect, requireRole('BoardAdmin'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, u.username as admin_username, u.unique_id as admin_unique_id, u.name as admin_name
      FROM schools s
      LEFT JOIN users u ON u.school_id = s.id AND u.role = 'SchoolAdmin'
      ORDER BY s.created_at DESC LIMIT 2000
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create school + SchoolAdmin
router.post('/', protect, requireRole('BoardAdmin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { name, district, address, phone, email, adminUsername, adminPassword } = req.body;
    if (!name || !district || !adminUsername || !adminPassword)
      return res.status(400).json({ message: 'Name, district, admin username and password are required' });

    const schoolId = await nextSchoolId();
    const schoolRes = await client.query(
      'INSERT INTO schools (school_id, name, district, address, phone, email) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [schoolId, name, district, address || null, phone || null, email || null]
    );
    const school = schoolRes.rows[0];

    const hashed = await bcrypt.hash(adminPassword, 10);
    const userRes = await client.query(
      `INSERT INTO users (unique_id, name, email, phone, username, password, role, school_id)
       VALUES ($1,$2,$3,$4,$5,$6,'SchoolAdmin',$7) RETURNING *`,
      [schoolId, `${name} Admin`, email || null, phone || null, adminUsername.toLowerCase(), hashed, school.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ school, adminUser: { ...userRes.rows[0], password: undefined } });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally { client.release(); }
});

// PUT update school
router.put('/:id', protect, requireRole('BoardAdmin'), async (req, res) => {
  try {
    const { name, district, address, phone, email, status } = req.body;
    const { rows } = await pool.query(
      'UPDATE schools SET name=$1, district=$2, address=$3, phone=$4, email=$5, status=$6 WHERE id=$7 RETURNING *',
      [name, district||'', address, phone, email, status, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE school
router.delete('/:id', protect, requireRole('BoardAdmin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM schools WHERE id=$1', [req.params.id]);
    res.json({ message: 'School and all its users deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
