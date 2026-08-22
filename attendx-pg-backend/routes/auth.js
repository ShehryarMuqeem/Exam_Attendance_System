const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { protect, requireRole } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: 'Username and password required' });

    const cleanUser = username.toLowerCase().trim();
    const rawUser = username.trim();
    const strippedUser = username.replace(/[^0-9a-zA-Z]/g, '').toLowerCase();

    const { rows } = await pool.query(
      `SELECT u.*, s.name as school_name, s.school_id as school_code, s.principal_name, s.principal_cnic
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE LOWER(u.username) = $1
          OR LOWER(u.unique_id) = $1
          OR LOWER(COALESCE(u.email, '')) = $1
          OR (u.cnic IS NOT NULL AND REPLACE(REPLACE(u.cnic, '-', ''), ' ', '') = $2)
          OR (s.principal_cnic IS NOT NULL AND REPLACE(REPLACE(s.principal_cnic, '-', ''), ' ', '') = $2 AND u.role = 'SchoolAdmin')
          OR (s.school_id IS NOT NULL AND LOWER(s.school_id) = $1 AND u.role = 'SchoolAdmin')
       ORDER BY CASE WHEN u.role = 'SchoolAdmin' THEN 1 WHEN u.role = 'BoardAdmin' THEN 2 WHEN u.role = 'Teacher' THEN 3 ELSE 4 END ASC
       LIMIT 1`,
      [cleanUser, strippedUser]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'User not found. Contact Admin.' });

    let match = await bcrypt.compare(password, user.password);

    // If exact password doesn't match, test stripped/formatted variants and CNIC match
    if (!match) {
      const cleanInputPw = String(password || '').replace(/[^0-9a-zA-Z]/g, '');
      const userCnicClean = String(user.cnic || user.principal_cnic || '').replace(/[^0-9a-zA-Z]/g, '');

      if (cleanInputPw && cleanInputPw !== password) {
        match = await bcrypt.compare(cleanInputPw, user.password);
      }

      // If the entered password matches the Principal's CNIC on record
      if (!match && userCnicClean && cleanInputPw && userCnicClean === cleanInputPw) {
        match = true;
        // Auto-heal and sync the hash in the database to the CNIC
        try {
          const newHash = await bcrypt.hash(cleanInputPw, 10);
          await pool.query('UPDATE users SET password = $1 WHERE id = $2', [newHash, user.id]);
        } catch (_) {}
      }
    }
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

// POST public forgot-password request
router.post('/forgot-password', async (req, res) => {
  try {
    const { identifier, role, phone, note } = req.body;
    const cleanId = (identifier || '').trim();
    if (!cleanId) {
      return res.status(400).json({ message: 'Please enter your Username, Unique ID, or Email.' });
    }

    // Look up matching user in database
    let query = `
      SELECT u.id, u.unique_id, u.name, u.username, u.email, u.phone, u.role, u.school_id, s.name as school_name
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      WHERE (UPPER(TRIM(u.username)) = UPPER($1) OR UPPER(TRIM(u.unique_id)) = UPPER($1) OR UPPER(TRIM(u.email)) = UPPER($1))
    `;
    const params = [cleanId];
    if (role && ['Teacher', 'SchoolAdmin'].includes(role)) {
      params.push(role);
      query += ` AND u.role = $${params.length}`;
    }

    const { rows } = await pool.query(query, params);
    if (!rows[0]) {
      return res.status(404).json({
        message: `❌ No account found matching "${cleanId}". Please ensure you entered the exact username or Unique ID.`
      });
    }

    const matchedUser = rows[0];

    // Check if an existing Pending request already exists
    const { rows: existingPending } = await pool.query(
      `SELECT id FROM password_reset_requests WHERE user_id = $1 AND status = 'Pending'`,
      [matchedUser.id]
    );

    if (existingPending.length > 0) {
      return res.json({
        success: true,
        alreadyPending: true,
        message: `ℹ️ A password reset request is already pending with the Board Administrator for account "${matchedUser.username}". Please wait for the Board Admin to review and reset your password.`
      });
    }

    const contactPhone = phone || matchedUser.phone || null;
    const contactEmail = matchedUser.email || null;

    const { rows: inserted } = await pool.query(
      `INSERT INTO password_reset_requests (user_id, username, name, role, school_id, school_name, phone, email, note, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Pending')
       RETURNING *`,
      [
        matchedUser.id,
        matchedUser.username,
        matchedUser.name || matchedUser.username,
        matchedUser.role,
        matchedUser.school_id,
        matchedUser.school_name,
        contactPhone,
        contactEmail,
        note || 'User requested password reset via Forgot Password.'
      ]
    );

    res.status(201).json({
      success: true,
      message: `✅ Password reset request submitted successfully! The Board Administrator has been notified to reset the password for "${matchedUser.name || matchedUser.username}" (${matchedUser.role}).`,
      request: inserted[0]
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET pending requests count (for Board Admin notification badge)
router.get('/password-reset-requests/count', protect, requireRole('BoardAdmin'), async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT COUNT(*) as count FROM password_reset_requests WHERE status='Pending'");
    res.json({ pendingCount: parseInt(rows[0].count, 10) || 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all password reset requests (Board Admin view)
router.get('/password-reset-requests', protect, requireRole('BoardAdmin'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT pr.*, 
             u.unique_id as user_unique_id, 
             u.status as user_status,
             s.name as current_school_name,
             admin.name as resolved_by_name
      FROM password_reset_requests pr
      LEFT JOIN users u ON pr.user_id = u.id
      LEFT JOIN schools s ON u.school_id = s.id
      LEFT JOIN users admin ON pr.resolved_by = admin.id
      ORDER BY CASE WHEN pr.status = 'Pending' THEN 0 ELSE 1 END, pr.requested_at DESC
      LIMIT 500
    `);

    res.json(rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      userUniqueId: r.user_unique_id,
      username: r.username,
      name: r.name,
      role: r.role,
      schoolId: r.school_id,
      schoolName: r.current_school_name || r.school_name || '—',
      phone: r.phone || '—',
      email: r.email || '—',
      note: r.note,
      status: r.status,
      requestedAt: r.requested_at,
      resolvedAt: r.resolved_at,
      resolvedByName: r.resolved_by_name,
      newPasswordPlain: r.new_password_plain,
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH resolve password reset request (Board Admin sets new password)
router.patch('/password-reset-requests/:id/resolve', protect, requireRole('BoardAdmin'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const { rows: reqRows } = await pool.query('SELECT * FROM password_reset_requests WHERE id=$1', [req.params.id]);
    if (!reqRows[0]) return res.status(404).json({ message: 'Request not found' });
    const request = reqRows[0];

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password in users table
    await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashedPassword, request.user_id]);

    // Mark request as Resolved
    const { rows: updatedReq } = await pool.query(`
      UPDATE password_reset_requests 
      SET status = 'Resolved', resolved_at = NOW(), resolved_by = $1, new_password_plain = $2
      WHERE id = $3
      RETURNING *
    `, [req.user.id, newPassword, req.params.id]);

    res.json({
      success: true,
      message: `✅ Password for ${request.name || request.username} (${request.role}) has been reset to "${newPassword}".`,
      request: updatedReq[0]
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH reject password reset request
router.patch('/password-reset-requests/:id/reject', protect, requireRole('BoardAdmin'), async (req, res) => {
  try {
    const { rows: updatedReq } = await pool.query(`
      UPDATE password_reset_requests 
      SET status = 'Rejected', resolved_at = NOW(), resolved_by = $1
      WHERE id = $2
      RETURNING *
    `, [req.user.id, req.params.id]);

    if (!updatedReq[0]) return res.status(404).json({ message: 'Request not found' });

    res.json({ success: true, message: 'Request marked as rejected.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
