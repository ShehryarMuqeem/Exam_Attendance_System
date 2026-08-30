const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { protect, requireRole } = require('../middleware/auth');

async function nextSchoolId(client) {
  const q = client || pool;
  const { rows } = await q.query("SELECT nextval('school_id_seq') as n");
  return `SCH-${String(rows[0].n).padStart(3, '0')}`;
}

// Generate a clean default username from school ID or name
function generateUsername(schoolId, schoolName) {
  if (schoolId) {
    return schoolId.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }
  const cleanName = (schoolName || 'school').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
  return `sch_${cleanName}`;
}

// GET all schools (Board)
router.get('/', protect, requireRole('BoardAdmin'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        s.*,
        u.id as admin_user_id,
        u.username as admin_username,
        u.unique_id as admin_unique_id,
        u.name as admin_name,
        u.cnic as admin_cnic,
        u.phone as admin_phone,
        u.email as admin_email
      FROM schools s
      LEFT JOIN users u ON u.school_id = s.id AND u.role = 'SchoolAdmin'
      ORDER BY s.created_at DESC LIMIT 2000
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Helper to infer institution type from explicit input or institution name
function inferInstitutionType(type, name) {
  if (type && (type === 'College' || type === 'School')) return type;
  if (type && typeof type === 'string') {
    const t = type.trim().toLowerCase();
    if (t === 'college' || t === 'hssc' || t === 'intermediate') return 'College';
    if (t === 'school' || t === 'ssc' || t === 'matric') return 'School';
  }
  const n = (name || '').toLowerCase();
  if (n.includes('college') || n.includes('degree') || n.includes('inter') || n.includes('higher sec') || n.includes('hssc') || n.includes('post grad')) {
    return 'College';
  }
  return 'School';
}

// POST create single school + SchoolAdmin
router.post('/', protect, requireRole('BoardAdmin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      name,
      district,
      institutionType,
      institution_type,
      principalName,
      principalCnic,
      address,
      phone,
      email,
      adminUsername,
      adminPassword,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'School name is required' });
    }
    if (!district || !district.trim()) {
      return res.status(400).json({ message: 'District is required' });
    }
    if (!principalName || !principalName.trim()) {
      return res.status(400).json({ message: 'Principal name is required' });
    }
    if (!principalCnic || !principalCnic.trim()) {
      return res.status(400).json({ message: 'Principal CNIC is required (used as initial login password)' });
    }

    const effectiveType = inferInstitutionType(institutionType || institution_type, name);
    const schoolId = await nextSchoolId(client);
    const cleanPrincipalName = principalName.trim();
    const cleanCnic = principalCnic.replace(/[^0-9]/g, '');
    if (!cleanCnic) {
      return res.status(400).json({ message: 'A valid numeric CNIC (digits only) is required' });
    }
    const assignedUsername = (adminUsername && adminUsername.trim())
      ? adminUsername.toLowerCase().trim()
      : generateUsername(schoolId, name);

    // Password is dashless CNIC
    const plainPassword = cleanCnic;
    const hashed = await bcrypt.hash(plainPassword, 10);

    // Check if username already exists
    const { rows: existingUser } = await client.query('SELECT id FROM users WHERE username = $1', [assignedUsername]);
    let finalUsername = assignedUsername;
    if (existingUser.length > 0) {
      finalUsername = `${assignedUsername}_${Math.floor(100 + Math.random() * 900)}`;
    }

    const schoolRes = await client.query(
      `INSERT INTO schools (school_id, name, district, institution_type, principal_name, principal_cnic, address, phone, email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        schoolId,
        name.trim(),
        district.trim(),
        effectiveType,
        cleanPrincipalName,
        cleanCnic,
        address ? address.trim() : null,
        phone ? phone.trim() : null,
        email ? email.trim() : null,
      ]
    );
    const school = schoolRes.rows[0];

    const userRes = await client.query(
      `INSERT INTO users (unique_id, name, email, phone, cnic, username, password, role, school_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'SchoolAdmin', $8) RETURNING *`,
      [
        schoolId,
        cleanPrincipalName,
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        cleanCnic,
        finalUsername,
        hashed,
        school.id,
      ]
    );

    await client.query('COMMIT');
    res.status(201).json({
      school,
      adminUser: {
        ...userRes.rows[0],
        password: undefined,
        plainPassword,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// POST bulk upload schools from CSV/Excel
router.post('/bulk', protect, requireRole('BoardAdmin'), async (req, res) => {
  const { schools } = req.body;
  if (!Array.isArray(schools) || schools.length === 0) {
    return res.status(400).json({ message: 'No school records provided in bulk request.' });
  }

  const client = await pool.connect();
  const createdSchools = [];
  const errors = [];

  try {
    await client.query('BEGIN');

    for (let i = 0; i < schools.length; i++) {
      const item = schools[i];
      const name = (item.name || item.schoolName || item.school_name || '').trim();
      const district = (item.district || item.city || '').trim();
      const institutionType = inferInstitutionType(item.institutionType || item.institution_type || item.type || item.category, name);
      const principalName = (item.principalName || item.principal_name || item.principal || item.headName || '').trim();
      const principalCnic = (item.principalCnic || item.principal_cnic || item.cnic || item.cnicNo || '').trim();
      const address = (item.address || item.location || '').trim();
      const phone = (item.phone || item.contact || '').trim();
      const email = (item.email || '').trim();
      let customUsername = (item.adminUsername || item.username || '').trim();

      if (!name) {
        errors.push(`Row ${i + 1}: Missing school name`);
        continue;
      }
      const cleanCnic = principalCnic.replace(/[^0-9]/g, '');
      if (!cleanCnic) {
        errors.push(`Row ${i + 1} (${name}): Missing Principal CNIC`);
        continue;
      }

      const schoolId = await nextSchoolId(client);
      const cleanPrincipal = principalName || `${name} Principal`;
      const effectiveDistrict = district || 'General';

      let assignedUsername = customUsername
        ? customUsername.toLowerCase().replace(/[^a-z0-9_]/g, '')
        : generateUsername(schoolId, name);

      // Check username collision
      const { rows: existingUser } = await client.query('SELECT id FROM users WHERE username = $1', [assignedUsername]);
      if (existingUser.length > 0) {
        assignedUsername = `${assignedUsername}_${Math.floor(100 + Math.random() * 900)}`;
      }

      // Password is CNIC without dashes
      const plainPassword = cleanCnic;
      const hashed = await bcrypt.hash(plainPassword, 10);

      const schoolRes = await client.query(
        `INSERT INTO schools (school_id, name, district, institution_type, principal_name, principal_cnic, address, phone, email)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          schoolId,
          name,
          effectiveDistrict,
          institutionType,
          cleanPrincipal,
          cleanCnic,
          address || null,
          phone || null,
          email || null,
        ]
      );
      const school = schoolRes.rows[0];

      await client.query(
        `INSERT INTO users (unique_id, name, email, phone, cnic, username, password, role, school_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'SchoolAdmin', $8)`,
        [
          schoolId,
          cleanPrincipal,
          email || null,
          phone || null,
          cleanCnic,
          assignedUsername,
          hashed,
          school.id,
        ]
      );

      createdSchools.push({
        id: school.id,
        schoolId: school.school_id,
        name: school.name,
        district: school.district,
        institutionType: school.institution_type,
        principalName: cleanPrincipal,
        principalCnic: cleanCnic,
        username: assignedUsername,
        password: plainPassword,
      });
    }

    if (createdSchools.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: 'No valid schools could be registered. Check required columns: School Name and Principal CNIC.',
        errors,
      });
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: `Successfully registered ${createdSchools.length} institution(s)!`,
      count: createdSchools.length,
      schools: createdSchools,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// PUT update school details & principal credentials (Board)
router.put('/:id', protect, requireRole('BoardAdmin'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const schoolId = req.params.id;
    const {
      name,
      district,
      institutionType,
      institution_type,
      principalName,
      principalCnic,
      address,
      phone,
      email,
      status,
      adminUsername,
      adminPassword,
      resetPasswordToCnic,
    } = req.body;

    const { rows: currentSchools } = await client.query('SELECT * FROM schools WHERE id = $1', [schoolId]);
    if (currentSchools.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'School not found' });
    }
    const current = currentSchools[0];

    const updatedName = name !== undefined ? name.trim() : current.name;
    const updatedDistrict = district !== undefined ? district.trim() : current.district;
    const rawType = institutionType || institution_type;
    const updatedType = rawType !== undefined ? inferInstitutionType(rawType, updatedName) : (current.institution_type || inferInstitutionType(null, updatedName));
    const updatedPrincipal = principalName !== undefined ? principalName.trim() : current.principal_name;
    const updatedCnic = principalCnic !== undefined ? String(principalCnic).replace(/[^0-9]/g, '') : current.principal_cnic;
    const updatedAddress = address !== undefined ? address : current.address;
    const updatedPhone = phone !== undefined ? phone : current.phone;
    const updatedEmail = email !== undefined ? email : current.email;
    const updatedStatus = status !== undefined ? status : current.status;

    const { rows: schoolRows } = await client.query(
      `UPDATE schools 
       SET name=$1, district=$2, institution_type=$3, principal_name=$4, principal_cnic=$5, address=$6, phone=$7, email=$8, status=$9
       WHERE id=$10 RETURNING *`,
      [
        updatedName,
        updatedDistrict,
        updatedType,
        updatedPrincipal,
        updatedCnic,
        updatedAddress || null,
        updatedPhone || null,
        updatedEmail || null,
        updatedStatus,
        schoolId,
      ]
    );

    // Update the associated SchoolAdmin user
    const { rows: adminRows } = await client.query(
      `SELECT * FROM users WHERE school_id = $1 AND role = 'SchoolAdmin'`,
      [schoolId]
    );

    if (adminRows.length > 0) {
      const adminUser = adminRows[0];
      let newHashedPw = adminUser.password;
      // If CNIC changed or updated, automatically re-hash new CNIC as password
      if (updatedCnic && updatedCnic !== current.principal_cnic) {
        newHashedPw = await bcrypt.hash(updatedCnic, 10);
      }

      await client.query(
        `UPDATE users
         SET name = $1, cnic = $2, phone = $3, email = $4, password = $5, status = $6
         WHERE id = $7`,
        [
          updatedPrincipal || `${updatedName} Admin`,
          updatedCnic || null,
          updatedPhone || null,
          updatedEmail || null,
          newHashedPw,
          updatedStatus,
          adminUser.id,
        ]
      );
    }

    await client.query('COMMIT');
    res.json(schoolRows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

// DELETE school and all associated records
router.delete('/:id', protect, requireRole('BoardAdmin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM schools WHERE id=$1', [req.params.id]);
    res.json({ message: 'School and all its users deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
