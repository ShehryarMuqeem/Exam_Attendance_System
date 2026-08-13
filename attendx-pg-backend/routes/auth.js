const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { protect } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Username and password required' });

    const { rows } = await pool.query(
      'SELECT u.*, s.name as school_name, s.school_id as school_code FROM users u LEFT JOIN schools s ON u.school_id = s.id WHERE u.username = $1',
      [username.toLowerCase().trim()]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'User not found. Contact Admin.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Incorrect password.' });

    if (user.status === 'Inactive')
      return res.status(403).json({ message: 'Account deactivated. Contact Admin.' });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

    const routes = {
      BoardAdmin: '/admin',
      SchoolAdmin: '/school',
      Teacher: '/teacher',
      Student: '/student',
    };

    res.json({
      token,
      user: {
        id: user.id,
        uniqueId: user.unique_id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        username: user.username,
        schoolId: user.school_id,
        schoolName: user.school_name,
        assignedClassroom: user.assigned_classroom,
        class: user.class,
        section: user.section,
        rollNo: user.roll_no,
      },
      route: routes[user.role],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', protect, async (req, res) => {
  const u = req.user;
  let schoolName = null;
  if (u.school_id) {
    const { rows } = await pool.query('SELECT name FROM schools WHERE id=$1', [u.school_id]);
    schoolName = rows[0]?.name || null;
  }
  res.json({
    user: {
      id: u.id,
      uniqueId: u.unique_id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      username: u.username,
      schoolId: u.school_id,
      schoolName,
      assignedClassroom: u.assigned_classroom,
      class: u.class,
      section: u.section,
      rollNo: u.roll_no,
    }
  });
});

module.exports = router;
