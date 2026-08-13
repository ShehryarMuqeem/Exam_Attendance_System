const pool = require('../db');

async function inspect() {
  const client = await pool.connect();
  try {
    console.log('--- TABLES ---');
    const { rows: tables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(tables.map(t => t.table_name));

    console.log('\n--- COLUMNS IN schools ---');
    const { rows: schoolCols } = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'schools'
    `);
    console.log(schoolCols);

    console.log('\n--- COLUMNS IN users ---');
    const { rows: userCols } = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    console.log(userCols);

    console.log('\n--- CONSTRAINTS ON users ---');
    const { rows: constraints } = await client.query(`
      SELECT 
        tc.constraint_name, 
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.table_name = 'users'
    `);
    console.log(constraints);

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    await pool.end();
  }
}

inspect();
