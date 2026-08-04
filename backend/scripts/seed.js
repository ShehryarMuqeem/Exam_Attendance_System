// ===== Seed Script =====
// Wipes ALL existing data and replaces it with:
//   - Board Admin (boardadmin / Admin@2026)
//   - 10 schools, each with:
//       - 1 School Admin   (e.g. abcschool / abc1234)
//       - 10 Teachers      (e.g. sahil / sahil1234)
//       - 100 Students
//
// Usernames are derived from the school/person name (lowercased, no spaces) +
// a 4-digit number, matching the pattern given in the requirements
// (abcschool/abc1234, sahil/sahil1234).
//
// Run with: node scripts/seed.js

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { CLASSES } = require('../data/academicStructure');

const SCHOOL_NAMES = [
  'Allied School', 'Beaconhouse School', 'City Grammar School', 'Divine Public School',
  'Educators School', 'Foundation Public School', 'Greenfield Academy', 'Horizon School System',
  'Iqra Public School', 'Jinnah Model School',
];

const FIRST_NAMES = [
  'Sahil', 'Ayesha', 'Bilal', 'Sana', 'Hamza', 'Fatima', 'Usman', 'Mehak', 'Ali', 'Zara',
  'Danish', 'Komal', 'Hassan', 'Iqra', 'Saad', 'Nida', 'Faisal', 'Hira', 'Junaid', 'Sara',
  'Omer', 'Mariam', 'Ahsan', 'Laiba', 'Zain', 'Rabia', 'Kashif', 'Sidra', 'Imran', 'Anum',
];

const STUDENT_FIRST_NAMES = [
  'Ahmed', 'Areeba', 'Bilawal', 'Sadia', 'Talha', 'Eman', 'Waqas', 'Anaya', 'Fahad', 'Mahnoor',
  'Asad', 'Noor', 'Rayyan', 'Wajeeha', 'Shahzaib', 'Maham', 'Hadi', 'Aleena', 'Moiz', 'Khadija',
  'Yusuf', 'Areej', 'Hammad', 'Bisma', 'Daniyal', 'Tehreem', 'Ibrahim', 'Hafsa', 'Rohan', 'Amal',
];

const LAST_NAMES = ['Khan', 'Ahmed', 'Malik', 'Sheikh', 'Raza', 'Iqbal', 'Hussain', 'Qureshi', 'Butt', 'Chaudhry'];

function pick(arr, i) { return arr[i % arr.length]; }
function randomSuffix() { return String(Math.floor(1000 + Math.random() * 9000)); }
function slug(name) { return name.toLowerCase().replace(/[^a-z]/g, ''); }

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🗑  Wiping existing data...');
    // Order matters — children before parents, to respect FK constraints
    await client.query('DELETE FROM attendance');
    await client.query('DELETE FROM duty_assignments');
    await client.query('DELETE FROM exams');
    await client.query('DELETE FROM center_assignments');
    await client.query('DELETE FROM users');
    await client.query('DELETE FROM schools');
    await client.query(`ALTER SEQUENCE exam_id_seq RESTART WITH 1`);
    await client.query(`ALTER SEQUENCE school_id_seq RESTART WITH 1`);
    await client.query(`ALTER SEQUENCE teacher_id_seq RESTART WITH 1`);
    await client.query(`ALTER SEQUENCE student_id_seq RESTART WITH 1`);
    console.log('✅ Old data cleared.\n');

    // ===== Board Admin =====
    const boardHash = await bcrypt.hash('Admin@2026', 10);
    await client.query(
      `INSERT INTO users (unique_id,name,email,username,password,role)
       VALUES ('BOARD-001','Board Administrator','admin@attendx.edu','boardadmin',$1,'BoardAdmin')`,
      [boardHash]
    );
    console.log('👑 Board Admin: boardadmin / Admin@2026\n');

    const credentials = [];
    // Tracks every username assigned so far across ALL schools — must be global,
    // not per-school, since usernames are derived from a shared first-name pool
    // (10 schools × 10 teachers cycling through 30 names guarantees repeats) and
    // the database's username column is UNIQUE. A per-school Set here was the
    // bug: it reset every iteration and let "sahil" get reused across multiple
    // schools, which crashed the whole seed run on the second INSERT.
    const usedUsernames = new Set(['boardadmin']);

    for (let s = 0; s < 10; s++) {
      const schoolName = SCHOOL_NAMES[s];
      const schoolSlug = slug(schoolName.split(' ')[0]); // e.g. "Allied School" -> "allied"

      const { rows: schoolIdRows } = await client.query("SELECT nextval('school_id_seq') as n");
      const schoolCode = `SCH-${String(schoolIdRows[0].n).padStart(3, '0')}`;

      const { rows: schoolRows } = await client.query(
        `INSERT INTO schools (school_id, name, address, phone, email)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [schoolCode, schoolName, `Block ${s+1}, Sample City`, `0300${1000000+s}`, `${schoolSlug}@example.edu`]
      );
      const school = schoolRows[0];

      // School Admin — username pattern: abcschool / abc1234
      let adminUsername = `${schoolSlug}school`;
      if (usedUsernames.has(adminUsername)) adminUsername = `${adminUsername}${s}`;
      usedUsernames.add(adminUsername);
      const adminPassword = `${schoolSlug.slice(0,3)}1234`;
      const adminHash = await bcrypt.hash(adminPassword, 10);
      await client.query(
        `INSERT INTO users (unique_id,name,email,username,password,role,school_id)
         VALUES ($1,$2,$3,$4,$5,'SchoolAdmin',$6)`,
        [schoolCode, `${schoolName} Admin`, `${adminUsername}@example.edu`, adminUsername, adminHash, school.id]
      );
      credentials.push({ school: schoolName, role: 'SchoolAdmin', username: adminUsername, password: adminPassword });

      // 10 Teachers — username pattern: sahil / sahil1234
      for (let t = 0; t < 10; t++) {
        const first = pick(FIRST_NAMES, s * 10 + t);
        const last = pick(LAST_NAMES, t);
        let uname = slug(first);
        // Global collision check (not per-school) — append school index, and
        // keep appending until truly unique, since multiple schools can collide
        // on the same base name more than once across a 10×10 dataset.
        let suffix = 0;
        let candidate = uname;
        while (usedUsernames.has(candidate)) {
          suffix++;
          candidate = `${uname}${s}${suffix > 1 ? suffix : ''}`;
        }
        uname = candidate;
        usedUsernames.add(uname);

        const tPassword = `${uname}1234`;
        const tHash = await bcrypt.hash(tPassword, 10);
        const { rows: tid } = await client.query("SELECT nextval('teacher_id_seq') as n");
        const teacherUniqueId = `TCH-${String(tid[0].n).padStart(3, '0')}`;

        await client.query(
          `INSERT INTO users (unique_id,name,email,phone,username,password,role,school_id)
           VALUES ($1,$2,$3,$4,$5,$6,'Teacher',$7)`,
          [teacherUniqueId, `${first} ${last}`, `${uname}@example.edu`, `0301${2000000+s*10+t}`, uname, tHash, school.id]
        );
        credentials.push({ school: schoolName, role: 'Teacher', username: uname, password: tPassword });
      }

      // 100 Students — 12-13 per class across the 8 fixed classes
      let rollCounter = 1;
      for (let st = 0; st < 100; st++) {
        const first = pick(STUDENT_FIRST_NAMES, s * 100 + st);
        const last = pick(LAST_NAMES, st);
        const cls = pick(CLASSES, st); // spread evenly across the 8 classes
        const { rows: sid } = await client.query("SELECT nextval('student_id_seq') as n");
        const studentUniqueId = `STU-${String(sid[0].n).padStart(3, '0')}`;
        const uname = `${slug(first)}${slug(last)}${s}${st}`; // guaranteed-unique, simple
        const sPassword = `${slug(first)}1234`;
        const sHash = await bcrypt.hash(sPassword, 10);

        await client.query(
          `INSERT INTO users (unique_id,name,email,username,password,role,school_id,class,roll_no)
           VALUES ($1,$2,$3,$4,$5,'Student',$6,$7,$8)`,
          [studentUniqueId, `${first} ${last}`, `${uname}@example.edu`, uname, sHash, school.id, cls, String(rollCounter++).padStart(3,'0')]
        );
      }

      console.log(`✅ ${schoolName} (${schoolCode}) — 1 admin, 10 teachers, 100 students`);
    }

    // ===== A few example center assignments so the feature has visible data =====
    const { rows: allSchools } = await client.query('SELECT id, name FROM schools ORDER BY id');
    if (allSchools.length >= 4) {
      // School 3 and School 4 sit their exams at School 1 (a center)
      await client.query(
        `INSERT INTO center_assignments (home_school_id, center_school_id) VALUES ($1,$2), ($3,$2)
         ON CONFLICT DO NOTHING`,
        [allSchools[2].id, allSchools[0].id, allSchools[3].id]
      );
      console.log(`\n🏫 Example center assignment: "${allSchools[2].name}" and "${allSchools[3].name}" → center at "${allSchools[0].name}"`);
    }

    console.log('\n========================================');
    console.log('🎉 SEED COMPLETE');
    console.log('========================================\n');
    console.log('Board Admin:  boardadmin / Admin@2026\n');
    console.log('Sample School Admin & Teacher logins:');
    credentials.slice(0, 8).forEach(c => {
      console.log(`  [${c.role}] ${c.school} → ${c.username} / ${c.password}`);
    });
    console.log(`\n  …and ${credentials.length - 8} more (10 schools × 1 admin + 2 sample teachers shown above).`);
    console.log('All teacher passwords follow the pattern: <username>1234');
    console.log('All student passwords follow the pattern: <firstname-lowercase>1234\n');

  } catch (err) {
    console.error('❌ Seed failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
