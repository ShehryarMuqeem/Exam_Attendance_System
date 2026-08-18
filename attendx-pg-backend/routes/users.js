const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { protect, requireRole } = require('../middleware/auth');

async function nextUniqueId(role) {
  const prefix = role === 'Teacher' ? 'TCH' : 'STU';
  const seqName = role === 'Teacher' ? 'teacher_id_seq' : 'student_id_seq';
  const { rows } = await pool.query(`SELECT nextval('${seqName}') as n`);
  return `${prefix}-${String(rows[0].n).padStart(3, '0')}`;
}

// GET users
router.get('/', protect, requireRole('BoardAdmin','SchoolAdmin'), async (req, res) => {
  try {
    let query, params;
    const role = req.query.role;
    const academicYear = req.query.academicYear;

    if (req.user.role === 'SchoolAdmin') {
      if (role === 'Teacher' || role === 'Student') {
        const yearParam = academicYear ? [academicYear] : [];
        query = `SELECT u.*, s.name as school_name, s.school_id as school_code
                 FROM users u LEFT JOIN schools s ON u.school_id=s.id
                 WHERE u.school_id=$1 AND u.role=$2 ${academicYear ? 'AND u.academic_year=$3' : ''}
                 ORDER BY u.created_at DESC`;
        params = [req.user.school_id, role, ...yearParam];
      } else {
        const yearParam = academicYear ? [academicYear] : [];
        query = `SELECT u.*, s.name as school_name, s.school_id as school_code
                 FROM users u LEFT JOIN schools s ON u.school_id=s.id
                 WHERE u.school_id=$1 AND u.role IN ('Teacher','Student') ${academicYear ? 'AND u.academic_year=$2' : ''}
                 ORDER BY u.created_at DESC`;
        params = [req.user.school_id, ...yearParam];
      }
    } else {
      const schoolId = req.query.schoolId ? parseInt(req.query.schoolId) : null;
      let conditions = [];
      let paramsArr = [];
      
      if (schoolId) {
        conditions.push(`u.school_id=$${paramsArr.length + 1}`);
        paramsArr.push(schoolId);
      }
      
      if (academicYear) {
        conditions.push(`u.academic_year=$${paramsArr.length + 1}`);
        paramsArr.push(academicYear);
      }

      const condStr = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '';

      if (role === 'Teacher') {
        query = `SELECT u.*, s.name as school_name, s.school_id as school_code
                 FROM users u LEFT JOIN schools s ON u.school_id=s.id
                 WHERE u.role='Teacher' ${condStr} ORDER BY u.created_at DESC LIMIT 5000`;
        params = paramsArr;
      } else if (role === 'Student') {
        query = `SELECT u.*, s.name as school_name, s.school_id as school_code
                 FROM users u LEFT JOIN schools s ON u.school_id=s.id
                 WHERE u.role='Student' ${condStr} ORDER BY u.created_at DESC LIMIT 5000`;
        params = paramsArr;
      } else {
        query = `SELECT u.*, s.name as school_name, s.school_id as school_code
                 FROM users u LEFT JOIN schools s ON u.school_id=s.id
                 WHERE u.role IN ('Teacher','Student') ${condStr} ORDER BY u.created_at DESC LIMIT 5000`;
        params = paramsArr;
      }
    }
    const { rows } = await pool.query(query, params);
    const mapped = rows.map(u => ({
      _id: u.id, id: u.id,
      uniqueId: u.unique_id, name: u.name,
      email: u.email, phone: u.phone,
      username: u.username, role: u.role,
      status: u.status, schoolId: u.school_id,
      assignedClassroom: u.assigned_classroom,
      class: u.class, section: u.section,
      rollNo: u.roll_no, schoolName: u.school_name,
      academicYear: u.academic_year,
    }));

    if (role === 'Student') {
      const seenRolls = new Set();
      const seenUids = new Set();
      const uniqueMapped = [];
      for (const u of mapped) {
        const rollKey = (u.rollNo || '').trim().toLowerCase();
        const uidKey = (u.uniqueId || '').trim().toLowerCase();
        if (rollKey && seenRolls.has(rollKey)) continue;
        if (uidKey && seenUids.has(uidKey)) continue;
        if (rollKey) seenRolls.add(rollKey);
        if (uidKey) seenUids.add(uidKey);
        uniqueMapped.push(u);
      }
      return res.json(uniqueMapped);
    }

    res.json(mapped);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET single user
router.get('/:id', protect, requireRole('BoardAdmin','SchoolAdmin'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'User not found' });
    const u = rows[0];
    res.json({ _id: u.id, id: u.id, uniqueId: u.unique_id, name: u.name, email: u.email, phone: u.phone, username: u.username, role: u.role, status: u.status, assignedClassroom: u.assigned_classroom, class: u.class, section: u.section, rollNo: u.roll_no });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create user
router.post('/', protect, requireRole('BoardAdmin','SchoolAdmin'), async (req, res) => {
  try {
    const { name, email, phone, role, username, password, class: cls, section, rollNo, schoolId, academicYear } = req.body;
    if (!['Teacher','Student'].includes(role))
      return res.status(400).json({ message: 'Can only create Teacher or Student' });

    // For students — auto-generate username & password so admin doesn't need to set them
    let finalUsername = username;
    let finalPassword = password;
    if (role === 'Student') {
      const slug = (name || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 8);
      const roll = (rollNo || '').replace(/[^a-z0-9]/gi, '').slice(0, 4) || Math.floor(1000 + Math.random() * 9000);
      finalUsername = `${slug}${roll}`;
      finalPassword = `${slug}1234`;
      // Ensure uniqueness by appending random suffix if needed
      const existing = await pool.query('SELECT id FROM users WHERE username=$1', [finalUsername]);
      if (existing.rows[0]) finalUsername = `${finalUsername}${Math.floor(10 + Math.random() * 90)}`;
    }

    if (!finalUsername || !finalPassword)
      return res.status(400).json({ message: 'Username and password required for Teachers' });

    const sid = req.user.role === 'SchoolAdmin' ? req.user.school_id : (schoolId || null);

    // Validate duplicate roll number for student within the same school, class, and batch (academic_year)
    if (role === 'Student' && rollNo && rollNo.trim()) {
      const { rows: existingRoll } = await pool.query(
        `SELECT id, name, unique_id FROM users 
         WHERE role='Student' AND UPPER(TRIM(roll_no)) = UPPER(TRIM($1)) 
           AND class=$2 AND school_id=$3
           AND (academic_year = $4 OR ($4 IS NULL AND academic_year IS NULL))`,
        [rollNo.trim(), cls, sid, academicYear || null]
      );
      if (existingRoll.length > 0) {
        return res.status(400).json({
          message: `❌ Duplicate Roll Number! Roll No. "${rollNo.trim()}" is already assigned to student ${existingRoll[0].unique_id} in Batch "${academicYear || 'Default'}" (Class ${cls}).`
        });
      }
    }

    const uniqueId = await nextUniqueId(role);
    const hashed = await bcrypt.hash(finalPassword, 10);
    const finalName = (name && name.trim()) ? name.trim() : (role === 'Student' ? `Student ${rollNo || uniqueId}` : 'Teacher');

    const { rows } = await pool.query(
      `INSERT INTO users (unique_id,name,email,phone,username,password,role,school_id,class,section,roll_no,academic_year)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [uniqueId, finalName, email||null, phone||null, finalUsername.toLowerCase(), hashed, role, sid, cls||null, section||null, rollNo||null, academicYear||null]
    );
    const u = rows[0];
    res.status(201).json({
      _id: u.id, id: u.id, uniqueId: u.unique_id,
      name: u.name, role: u.role,
      username: u.username,
      // Return generated credentials so admin can note them down
      generatedUsername: role === 'Student' ? finalUsername : undefined,
      generatedPassword: role === 'Student' ? finalPassword : undefined,
      status: u.status
    });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Username already taken — try a different roll number' });
    res.status(500).json({ message: err.message });
  }
});

// PUT update
router.put('/:id', protect, requireRole('BoardAdmin','SchoolAdmin'), async (req, res) => {
  try {
    const { name, email, phone, username, status, password, assignedClassroom, class: cls, section, rollNo, academicYear } = req.body;
    let passwordHash = undefined;
    if (password) passwordHash = await bcrypt.hash(password, 10);

    const { rows: currentUser } = await pool.query('SELECT role, school_id, class, academic_year FROM users WHERE id=$1', [req.params.id]);
    if (!currentUser[0]) return res.status(404).json({ message: 'User not found' });
    const userRole = currentUser[0].role;
    const userSchoolId = currentUser[0].school_id;
    const targetClass = cls || currentUser[0].class;
    const targetBatch = academicYear !== undefined ? academicYear : currentUser[0].academic_year;

    if (userRole === 'Student' && rollNo && rollNo.trim()) {
      const { rows: existingRoll } = await pool.query(
        `SELECT id, name, unique_id FROM users 
         WHERE role='Student' AND UPPER(TRIM(roll_no)) = UPPER(TRIM($1)) 
           AND class=$2 AND school_id=$3 
           AND (academic_year = $4 OR ($4 IS NULL AND academic_year IS NULL))
           AND id != $5`,
        [rollNo.trim(), targetClass, userSchoolId, targetBatch || null, req.params.id]
      );
      if (existingRoll.length > 0) {
        return res.status(400).json({
          message: `❌ Duplicate Roll Number! Roll No. "${rollNo.trim()}" is already assigned in Batch "${targetBatch || 'Default'}" (Class ${targetClass}).`
        });
      }
    }

    const { rows } = await pool.query(
      `UPDATE users SET name=COALESCE($1, name),email=$2,phone=$3,username=$4,status=$5,
       assigned_classroom=$6,class=$7,section=$8,roll_no=$9,academic_year=$10
       ${passwordHash ? ',password=$11' : ''}
       WHERE id=${passwordHash ? '$12' : '$11'} RETURNING *`,
      passwordHash
        ? [name||null,email,phone,username ? username.toLowerCase() : null,status,assignedClassroom,cls,section,rollNo,academicYear||null,passwordHash,req.params.id]
        : [name||null,email,phone,username ? username.toLowerCase() : null,status,assignedClassroom,cls,section,rollNo,academicYear||null,req.params.id]
    );
    const u = rows[0];
    res.json({ _id: u.id, uniqueId: u.unique_id, name: u.name, role: u.role, status: u.status });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Username already taken' });
    res.status(500).json({ message: err.message });
  }
});

// PATCH toggle status — atomic update, no check-then-act race
router.patch('/:id/toggle-status', protect, requireRole('BoardAdmin','SchoolAdmin'), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE users SET status = CASE WHEN status='Active' THEN 'Inactive' ELSE 'Active' END
       WHERE id=$1 RETURNING status`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'User not found' });
    res.json({ status: rows[0].status });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// PATCH reset password
router.patch('/:id/reset-password', protect, requireRole('BoardAdmin','SchoolAdmin'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ message: 'Min 6 characters' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashed, req.params.id]);
    res.json({ message: 'Password reset successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// DELETE
router.delete('/:id', protect, requireRole('BoardAdmin','SchoolAdmin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST bulk update roll numbers and optionally academic_year (supports ID & Roll No mapping with zero duplicate roll numbers per batch)
router.post('/bulk-update-roll', protect, requireRole('SchoolAdmin'), async (req, res) => {
  try {
    const { updates, defaultClass, defaultYear } = req.body; // array of { uniqueId, rollNo, name, academicYear, createNew }
    if (!Array.isArray(updates)) {
      return res.status(400).json({ message: 'Updates must be an array' });
    }

    const targetSchoolId = req.user.school_id;
    if (!targetSchoolId) {
      return res.status(400).json({ message: 'No school associated with this School Administrator account.' });
    }

    const processedRolls = new Set();

    for (const update of updates) {
      const { uniqueId, rollNo, name, academicYear, createNew } = update;
      const cleanRoll = (rollNo || '').trim();
      const cleanName = (name || '').trim();
      if (!cleanRoll) continue;

      const targetClass = update.class || defaultClass || 'SSC-I';
      const targetBatch = academicYear || defaultYear || null;

      // Skip duplicate roll numbers within the same batch in the upload payload
      const rollBatchKey = `${targetClass}_${targetBatch || 'default'}_${cleanRoll.toLowerCase()}`;
      if (processedRolls.has(rollBatchKey)) continue;
      processedRolls.add(rollBatchKey);

      // Check if student with this roll number already exists in this school, class & batch
      const { rows: existingStudent } = await pool.query(
        `SELECT id, unique_id, name, academic_year FROM users 
         WHERE role = 'Student' AND school_id = $1 AND class = $2 
           AND UPPER(TRIM(roll_no)) = UPPER($3)
           AND (academic_year = $4 OR ($4 IS NULL AND academic_year IS NULL))`,
        [targetSchoolId, targetClass, cleanRoll, targetBatch]
      );

      if (existingStudent.length > 0) {
        // If updating an existing student in this batch, update roll/year
        const updateFields = [];
        const params = [];
        if (targetBatch) {
          params.push(targetBatch);
          updateFields.push(`academic_year = $${params.length}`);
        }
        if (cleanName && (!existingStudent[0].name || existingStudent[0].name.trim() === '')) {
          params.push(cleanName);
          updateFields.push(`name = $${params.length}`);
        }
        if (updateFields.length > 0) {
          params.push(existingStudent[0].id);
          await pool.query(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${params.length}`,
            params
          );
        }
      } else if (uniqueId) {
        // Update by uniqueId if roll number is not duplicate in this batch
        const updateFields = [`roll_no = $1`];
        const params = [cleanRoll];
        if (targetBatch) {
          params.push(targetBatch);
          updateFields.push(`academic_year = $${params.length}`);
        }
        if (cleanName) {
          params.push(cleanName);
          updateFields.push(`name = $${params.length}`);
        }
        params.push(uniqueId, targetSchoolId);
        await pool.query(
          `UPDATE users 
           SET ${updateFields.join(', ')}
           WHERE unique_id = $${params.length - 1} AND school_id = $${params.length} AND role = 'Student'`,
          params
        );
      } else if (createNew) {
        // Create new student with unique roll number in this batch
        const uniqueIdGen = await nextUniqueId('Student');
        const rollNumeric = cleanRoll.replace(/[^a-z0-9]/gi, '').slice(0, 6) || Math.floor(1000 + Math.random() * 9000);
        let finalUsername = `stu${rollNumeric}`;
        const existingUname = await pool.query('SELECT id FROM users WHERE username=$1', [finalUsername]);
        if (existingUname.rows[0]) finalUsername = `${finalUsername}${Math.floor(10 + Math.random() * 90)}`;
        const hashed = await bcrypt.hash(`stu${cleanRoll}123`, 10);
        const displayName = cleanName || `Student ${cleanRoll}`;
        
        await pool.query(
          `INSERT INTO users (unique_id, name, username, password, role, school_id, class, roll_no, academic_year)
           VALUES ($1, $2, $3, $4, 'Student', $5, $6, $7, $8)`,
          [uniqueIdGen, displayName, finalUsername.toLowerCase(), hashed, targetSchoolId, targetClass, cleanRoll, targetBatch]
        );
      }
    }

    res.json({ success: true, message: '✅ Roll numbers and batches updated successfully with no duplicates per batch!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
