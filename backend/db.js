const { Pool, types } = require('pg');
require('dotenv').config();

// Parse PostgreSQL TIMESTAMP (without timezone) as UTC so it aligns with client timezone offset
types.setTypeParser(types.builtins.TIMESTAMP, (str) => {
  if (!str) return null;
  return new Date(str.replace(' ', 'T') + 'Z');
});

// Remove sslmode from connection string and handle SSL manually
const connectionString = process.env.DATABASE_URL?.replace('?sslmode=disable', '').replace('?sslmode=require', '');

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },

  // Without an explicit connectionTimeoutMillis, pool.connect() can hang
  // indefinitely if the network/host is unreachable — that silently breaks the
  // server's retry-with-backoff logic in server.js, which depends on the
  // connection attempt actually failing (and failing promptly) to trigger a retry.
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: parseInt(process.env.DB_POOL_MAX || '20'),
});

// Without this handler, an idle client erroring out (network blip, Supabase
// restart) crashes the whole Node process instead of just that one connection.
pool.on('error', (err) => {
  console.error('⚠ Unexpected PG pool error (handled, process stays alive):', err.message);
});

module.exports = pool;
