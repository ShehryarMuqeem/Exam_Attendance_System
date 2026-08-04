const express = require('express');
const router = express.Router();
const pool = require('../db');
const { protect, requireRole } = require('../middleware/auth');
const {
  ACADEMIC_YEARS, TERMS, SHIFTS, CLASSES,
  departmentsForTerm, subjectsForDepartment,
} = require('../data/academicStructure');

// GET academic years (from DB academic_years table, sorted descending, falling back to static list)
router.get('/years', protect, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT year_name FROM academic_years ORDER BY id DESC');
    if (rows && rows.length > 0) {
      return res.json(rows.map(r => r.year_name));
    }
    res.json(ACADEMIC_YEARS);
  } catch (err) {
    res.json(ACADEMIC_YEARS);
  }
});

// POST create new academic year batch (BoardAdmin only)
router.post('/years', protect, requireRole('BoardAdmin'), async (req, res) => {
  try {
    const yearName = req.body.year || req.body.yearName || req.body.year_name;
    if (!yearName || typeof yearName !== 'string' || !yearName.trim()) {
      return res.status(400).json({ message: 'Batch year name is required (e.g. 2026-2027)' });
    }
    const cleanYear = yearName.trim();
    const { rows } = await pool.query(
      `INSERT INTO academic_years (year_name) VALUES ($1)
       ON CONFLICT (year_name) DO UPDATE SET year_name=EXCLUDED.year_name
       RETURNING *`,
      [cleanYear]
    );
    res.status(201).json({ success: true, message: `✅ Batch year ${cleanYear} added successfully!`, year: rows[0].year_name });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE academic year batch (BoardAdmin only)
router.delete('/years/:year', protect, requireRole('BoardAdmin'), async (req, res) => {
  try {
    const yearParam = decodeURIComponent(req.params.year);
    await pool.query('DELETE FROM academic_years WHERE year_name=$1', [yearParam]);
    res.json({ success: true, message: `Batch year ${yearParam} removed.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/terms', protect, (req, res) => res.json(TERMS));
router.get('/shifts', protect, (req, res) => res.json(SHIFTS));
router.get('/classes', protect, (req, res) => res.json(CLASSES));

router.get('/departments', protect, (req, res) => {
  const { term } = req.query;
  if (!term) return res.status(400).json({ message: 'term is required' });
  res.json(departmentsForTerm(term));
});

router.get('/subjects', protect, (req, res) => {
  const { department } = req.query;
  if (!department) return res.status(400).json({ message: 'department is required' });
  res.json(subjectsForDepartment(department));
});

module.exports = router;

