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

async function getSchoolPrefix(poolOrClient, schoolId) {
  if (!schoolId) return 'sch';
  try {
    const { rows } = await poolOrClient.query('SELECT school_id FROM schools WHERE id = $1', [schoolId]);
    if (rows[0] && rows[0].school_id) {
      return rows[0].school_id.toLowerCase().replace(/[^a-z0-9]/g, '');
    }
  } catch (_) {}
  return `sch${String(schoolId).padStart(3, '0')}`;
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
      schoolCode: u.school_code || (u.school_id ? `SCH-${String(u.school_id).padStart(3, '0')}` : ''),
      academicYear: u.academic_year,
      plainPassword: u.plain_password || null,
    }));

    // Return all students (deduplicate by unique id if needed)
    const seenUids = new Set();
    const uniqueMapped = [];
    for (const u of mapped) {
      if (u.id && seenUids.has(u.id)) continue;
      if (u.id) seenUids.add(u.id);
      uniqueMapped.push(u);
    }
    res.json(uniqueMapped);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET single user
router.get('/:id', protect, requireRole('BoardAdmin','SchoolAdmin'), async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'User not found' });
    const u = rows[0];
    res.json({ _id: u.id, id: u.id, uniqueId: u.unique_id, name: u.name, email: u.email, phone: u.phone, username: u.username, role: u.role, status: u.status, assignedClassroom: u.assigned_classroom, class: u.class, section: u.section, rollNo: u.roll_no, academicYear: u.academic_year, plainPassword: u.plain_password || null });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create user (Admin / SchoolAdmin)
router.post('/', protect, requireRole('BoardAdmin','SchoolAdmin'), async (req, res) => {
  try {
    const { name, email, phone, role = 'Teacher', username, password, schoolId, class: cls, section, rollNo, academicYear } = req.body;

    let finalUsername = username;
    let finalPassword = password;

    const sid = req.user.role === 'SchoolAdmin' ? req.user.school_id : (schoolId || null);

    if (role === 'Student') {
      const rollClean = (rollNo || '').trim();
      const autoId = Math.floor(1000 + Math.random() * 9000);
      finalUsername = username ? username.trim() : `stu${rollClean || autoId}_${Date.now().toString().slice(-4)}`;
      finalPassword = password || rollClean || '123456';
    } else if (role === 'Teacher') {
      const schoolPrefix = await getSchoolPrefix(pool, sid);
      const nameClean = (name || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'teacher';
      
      if (username && username.trim()) {
        const uTrim = username.trim().toLowerCase();
        finalUsername = uTrim.includes('@') ? uTrim : `${schoolPrefix}@${uTrim}`;
      } else {
        finalUsername = `${schoolPrefix}@${nameClean}`;
      }
      finalPassword = (password && password.trim()) ? password.trim() : `teach${Math.floor(1000 + Math.random() * 9000)}`;
    }

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
          message: `❌ Duplicate Roll Number! Roll No. "${rollNo.trim()}" is already assigned to student ${existingRoll[0].unique_id} (${existingRoll[0].name || 'Student'}) in Batch "${academicYear || 'Default'}" (Class ${cls}).`
        });
      }
    }

    const uniqueId = await nextUniqueId(role);
    const hashed = await bcrypt.hash(finalPassword, 10);
    const finalName = (name && name.trim()) ? name.trim() : (role === 'Student' ? `Student ${rollNo || uniqueId}` : 'Teacher');

    // Ensure username uniqueness
    let resolvedUsername = finalUsername.toLowerCase();
    const existingUname = await pool.query('SELECT id FROM users WHERE username=$1', [resolvedUsername]);
    if (existingUname.rows.length > 0) {
      resolvedUsername = `${resolvedUsername}_${uniqueId.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const existingUname2 = await pool.query('SELECT id FROM users WHERE username=$1', [resolvedUsername]);
      if (existingUname2.rows.length > 0) {
        resolvedUsername = `${resolvedUsername}_${Math.floor(10 + Math.random() * 90)}`;
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO users (unique_id,name,email,phone,username,password,plain_password,role,school_id,class,section,roll_no,academic_year)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [uniqueId, finalName, email||null, phone||null, resolvedUsername, hashed, finalPassword, role, sid, cls||null, section||null, rollNo||null, academicYear||null]
    );
    const u = rows[0];
    res.status(201).json({
      _id: u.id, id: u.id, uniqueId: u.unique_id,
      name: u.name, role: u.role,
      username: u.username,
      plainPassword: finalPassword,
      generatedUsername: resolvedUsername,
      generatedPassword: finalPassword,
      status: u.status
    });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Username already taken — try a different username' });
    res.status(500).json({ message: err.message });
  }
});

// POST reset password for user (by SchoolAdmin / BoardAdmin)
router.post('/:id/reset-password', protect, requireRole('BoardAdmin','SchoolAdmin'), async (req, res) => {
  try {
    const { customPassword } = req.body;
    const newPassword = (customPassword && customPassword.trim()) ? customPassword.trim() : `teach${Math.floor(1000 + Math.random() * 9000)}`;
    const hashed = await bcrypt.hash(newPassword, 10);

    const { rows } = await pool.query(
      `UPDATE users SET password = $1, plain_password = $2 WHERE id = $3 RETURNING id, unique_id, name, username, plain_password`,
      [hashed, newPassword, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User not found' });
    
    res.json({
      success: true,
      message: `✅ Password reset successfully!`,
      username: rows[0].username,
      newPassword: newPassword,
      teacherName: rows[0].name
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update
router.put('/:id', protect, requireRole('BoardAdmin','SchoolAdmin'), async (req, res) => {
  try {
    const { name, email, phone, username, status, password, assignedClassroom, class: cls, section, rollNo, academicYear } = req.body;
    let passwordHash = undefined;
    let newPlainPassword = undefined;
    if (password && password.trim()) {
      newPlainPassword = password.trim();
      passwordHash = await bcrypt.hash(newPlainPassword, 10);
    }

    const { rows: currentUser } = await pool.query('SELECT role, school_id, class, academic_year FROM users WHERE id=$1', [req.params.id]);
    if (!currentUser[0]) return res.status(404).json({ message: 'User not found' });
    const userRole = currentUser[0].role;
    const userSchoolId = currentUser[0].school_id;
    const targetClass = cls || currentUser[0].class;
    const targetBatch = academicYear !== undefined ? academicYear : currentUser[0].academic_year;

    // Check duplicate roll number on update
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
          message: `❌ Duplicate Roll Number! Roll No. "${rollNo.trim()}" is already assigned to student ${existingRoll[0].unique_id} in Batch "${targetBatch || 'Default'}" (Class ${targetClass}).`
        });
      }
    }

    const { rows } = await pool.query(
      `UPDATE users SET name=COALESCE($1, name),email=$2,phone=$3,username=$4,status=$5,
       assigned_classroom=$6,class=$7,section=$8,roll_no=$9,academic_year=$10
       ${passwordHash ? ',password=$11,plain_password=$12' : ''}
       WHERE id=${passwordHash ? '$13' : '$11'} RETURNING *`,
      passwordHash
        ? [name, email||null, phone||null, username, status, assignedClassroom||null, cls||null, section||null, rollNo||null, academicYear||null, passwordHash, newPlainPassword, req.params.id]
        : [name, email||null, phone||null, username, status, assignedClassroom||null, cls||null, section||null, rollNo||null, academicYear||null, req.params.id]
    );
    const u = rows[0];
    res.json({ _id: u.id, id: u.id, uniqueId: u.unique_id, name: u.name, email: u.email, phone: u.phone, username: u.username, role: u.role, status: u.status, assignedClassroom: u.assigned_classroom, class: u.class, section: u.section, rollNo: u.roll_no, academicYear: u.academic_year, plainPassword: u.plain_password || newPlainPassword || null });
  } catch (err) { res.status(500).json({ message: err.message }); }
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

// POST bulk update / import roll numbers and students (STRICT DUPLICATE PREVENTION)
router.post('/bulk-update-roll', protect, requireRole('SchoolAdmin'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { updates, defaultClass, defaultYear } = req.body;
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: 'No student updates provided in request.' });
    }

    const targetSchoolId = req.user.school_id;
    if (!targetSchoolId) {
      return res.status(400).json({ message: 'No school associated with this School Administrator account.' });
    }

    // 1. Validate duplicates WITHIN the uploaded payload
    const seenRollMap = new Map();
    for (let i = 0; i < updates.length; i++) {
      const u = updates[i];
      const roll = (u.rollNo !== undefined && u.rollNo !== null) ? String(u.rollNo).trim() : '';
      if (!roll) continue;
      const targetClass = u.class || defaultClass || 'SSC-I';
      const targetBatch = u.academicYear || defaultYear || 'Default';
      const key = `${targetClass}_${targetBatch}_${roll.toLowerCase()}`;

      if (seenRollMap.has(key)) {
        const prevRow = seenRollMap.get(key);
        return res.status(400).json({
          message: `❌ Duplicate Roll Number in Upload File! Roll No. "${roll}" appears multiple times in your sheet (Row ${prevRow + 1} and Row ${i + 1}). Every student must have a unique roll number.`
        });
      }
      seenRollMap.set(key, i);
    }

    // 2. Validate duplicates AGAINST THE DATABASE
    for (let i = 0; i < updates.length; i++) {
      const u = updates[i];
      const roll = (u.rollNo !== undefined && u.rollNo !== null) ? String(u.rollNo).trim() : '';
      if (!roll) continue;
      const targetClass = u.class || defaultClass || 'SSC-I';
      const targetBatch = u.academicYear || defaultYear || null;

      // Check if student with this roll number already exists in this school & batch
      const { rows: existing } = await client.query(
        `SELECT id, unique_id, name FROM users 
         WHERE role = 'Student' AND school_id = $1 AND class = $2 
           AND UPPER(TRIM(roll_no)) = UPPER($3)
           AND (academic_year = $4 OR ($4 IS NULL AND academic_year IS NULL))`,
        [targetSchoolId, targetClass, roll, targetBatch]
      );

      if (existing.length > 0) {
        // If updating by uniqueId and the existing record IS this student, allow
        if (u.uniqueId && existing[0].unique_id === u.uniqueId) {
          continue;
        }
        return res.status(400).json({
          message: `❌ Duplicate Roll Number! Roll No. "${roll}" (Row ${i + 1}) is already assigned to student "${existing[0].name || existing[0].unique_id}" in Batch "${targetBatch || 'Default'}" (Class ${targetClass}). Please assign a unique roll number.`
        });
      }
    }

    // 3. Process all updates atomically in a transaction
    await client.query('BEGIN');
    let createdCount = 0;
    let updatedCount = 0;

    for (const update of updates) {
      const { uniqueId, rollNo, name, academicYear, createNew } = update;
      const cleanRoll = (rollNo !== undefined && rollNo !== null) ? String(rollNo).trim() : '';
      const cleanName = (name !== undefined && name !== null) ? String(name).trim() : '';
      const targetClass = update.class || defaultClass || 'SSC-I';
      const targetBatch = academicYear || defaultYear || null;

      if (!cleanRoll && !uniqueId && !cleanName) continue;

      if (uniqueId && !createNew) {
        // Update existing student by uniqueId
        const updateFields = [];
        const params = [];
        if (cleanRoll) {
          params.push(cleanRoll);
          updateFields.push(`roll_no = $${params.length}`);
        }
        if (targetBatch) {
          params.push(targetBatch);
          updateFields.push(`academic_year = $${params.length}`);
        }
        if (targetClass) {
          params.push(targetClass);
          updateFields.push(`class = $${params.length}`);
        }
        if (cleanName) {
          params.push(cleanName);
          updateFields.push(`name = $${params.length}`);
        }
        if (updateFields.length > 0) {
          params.push(uniqueId, targetSchoolId);
          const result = await client.query(
            `UPDATE users 
             SET ${updateFields.join(', ')}
             WHERE unique_id = $${params.length - 1} AND school_id = $${params.length} AND role = 'Student'`,
            params
          );
          if (result.rowCount > 0) updatedCount++;
        }
      } else {
        // Create new student
        const uniqueIdGen = await nextUniqueId('Student');
        const rollNumeric = cleanRoll.replace(/[^a-z0-9]/gi, '').slice(0, 8) || Math.floor(1000 + Math.random() * 9000);
        let finalUsername = `stu_${uniqueIdGen.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const existingUname = await client.query('SELECT id FROM users WHERE username=$1', [finalUsername]);
        if (existingUname.rows.length > 0) {
          finalUsername = `${finalUsername}_${Math.floor(10 + Math.random() * 90)}`;
        }
        const hashed = await bcrypt.hash(`stu${cleanRoll || '123'}123`, 10);
        const displayName = cleanName || (cleanRoll ? `Student ${cleanRoll}` : `Student ${uniqueIdGen}`);
        
        await client.query(
          `INSERT INTO users (unique_id, name, username, password, role, school_id, class, roll_no, academic_year, status)
           VALUES ($1, $2, $3, $4, 'Student', $5, $6, $7, $8, 'Active')`,
          [uniqueIdGen, displayName, finalUsername.toLowerCase(), hashed, targetSchoolId, targetClass, cleanRoll || null, targetBatch]
        );
        createdCount++;
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      createdCount,
      updatedCount,
      totalProcessed: createdCount + updatedCount,
      message: `✅ Successfully imported ${createdCount + updatedCount} student(s) (${createdCount} created, ${updatedCount} updated)!`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// POST bulk import teachers (Excel / CSV)
router.post('/bulk-import-teachers', protect, requireRole('SchoolAdmin', 'BoardAdmin'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { teachers, schoolId } = req.body;
    if (!Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({ message: 'No teacher records found in upload.' });
    }

    const targetSchoolId = req.user.role === 'SchoolAdmin' ? req.user.school_id : (schoolId || req.user.school_id);
    if (!targetSchoolId) {
      return res.status(400).json({ message: 'No school associated with this account.' });
    }

    await client.query('BEGIN');
    const createdTeachers = [];

    const schoolPrefix = await getSchoolPrefix(client, targetSchoolId);

    for (let i = 0; i < teachers.length; i++) {
      const t = teachers[i];
      const name = (t.name || t.teacherName || t.fullName || '').trim();
      const phone = (t.phone || t.contact || t.mobile || t.cell || '').trim();
      const email = (t.email || '').trim();

      if (!name) continue;

      const uniqueId = await nextUniqueId('Teacher');
      
      // Generate clean username scoped with school code e.g. sch009@sharyar
      const nameClean = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) || 'teacher';
      let username = `${schoolPrefix}@${nameClean}`;
      const { rows: existingUname } = await client.query('SELECT id FROM users WHERE username=$1', [username]);
      if (existingUname.length > 0) {
        username = `${schoolPrefix}@${nameClean}_${uniqueId.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
        const { rows: existingUname2 } = await client.query('SELECT id FROM users WHERE username=$1', [username]);
        if (existingUname2.length > 0) {
          username = `${schoolPrefix}@${nameClean}_${Math.floor(10 + Math.random() * 90)}`;
        }
      }

      // Auto-generate secure initial password
      const password = `teach${Math.floor(1000 + Math.random() * 9000)}`;
      const hashed = await bcrypt.hash(password, 10);

      const { rows } = await client.query(
        `INSERT INTO users (unique_id, name, email, phone, username, password, plain_password, role, school_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Teacher', $8, 'Active') RETURNING id, unique_id, name, username, phone, email, plain_password`,
        [uniqueId, name, email || null, phone || null, username, hashed, password, targetSchoolId]
      );

      createdTeachers.push({
        id: rows[0].id,
        uniqueId: rows[0].unique_id,
        name: rows[0].name,
        username: rows[0].username,
        password: password,
        plainPassword: password,
        phone: rows[0].phone || '—',
        email: rows[0].email || '—'
      });
    }

    await client.query('COMMIT');

    if (createdTeachers.length === 0) {
      return res.status(400).json({ message: 'No valid teacher names found in file.' });
    }

    res.json({
      success: true,
      count: createdTeachers.length,
      teachers: createdTeachers,
      message: `✅ Successfully imported ${createdTeachers.length} teacher(s) with auto-generated credentials!`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
