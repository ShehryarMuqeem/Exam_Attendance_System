require('dotenv').config();
const pool = require('../db');

async function cleanDuplicates() {
  const { rows: dupes } = await pool.query(`
    SELECT roll_no, class, school_id, array_agg(id ORDER BY id ASC) as ids, array_agg(unique_id ORDER BY id ASC) as uids
    FROM users 
    WHERE role='Student' AND roll_no IS NOT NULL AND roll_no != ''
    GROUP BY roll_no, class, school_id 
    HAVING count(*) > 1
  `);

  console.log('Found duplicate groups:', JSON.stringify(dupes, null, 2));

  for (const group of dupes) {
    const primaryId = group.ids[0];
    const duplicateIds = group.ids.slice(1);

    for (const dupId of duplicateIds) {
      const { rows: dupAtt } = await pool.query('SELECT * FROM attendance WHERE student_id = $1', [dupId]);
      for (const att of dupAtt) {
        const { rows: primAtt } = await pool.query('SELECT * FROM attendance WHERE student_id = $1 AND exam_id = $2', [primaryId, att.exam_id]);
        if (primAtt.length > 0) {
          if (att.status === 'Present' || att.copy_number) {
            await pool.query(
              'UPDATE attendance SET status = $1, copy_number = $2, qr_answer_scanned = $3, qr_admit_scanned = $4, marked_at = $5, teacher_id = $6, classroom = $7 WHERE id = $8',
              [att.status, att.copy_number, att.qr_answer_scanned, att.qr_admit_scanned, att.marked_at, att.teacher_id, att.classroom, primAtt[0].id]
            );
          }
          await pool.query('DELETE FROM attendance WHERE id = $1', [att.id]);
        } else {
          await pool.query('UPDATE attendance SET student_id = $1 WHERE id = $2', [primaryId, att.id]);
        }
      }
      await pool.query('DELETE FROM users WHERE id = $1', [dupId]);
      console.log(`Cleaned duplicate student ID ${dupId}, merged into primary ID ${primaryId}`);
    }
  }

  const { rows: remaining } = await pool.query(`
    SELECT roll_no, count(*) 
    FROM users 
    WHERE role='Student' AND roll_no IS NOT NULL AND roll_no != ''
    GROUP BY roll_no, class, school_id 
    HAVING count(*) > 1
  `);
  console.log('Remaining duplicate groups:', remaining);
  await pool.end();
}

cleanDuplicates().catch(e => {
  console.error('Error during cleanup:', e);
  process.exit(1);
});
