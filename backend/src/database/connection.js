const { Pool } = require('pg');
const connectionSimple = require('./connection-simple');

let pool = null;

const connectDatabase = async () => {
  if (pool) return pool;
  const dbUrl = process.env.DATABASE_URL;

  // Fallback to demo mode if placeholder password is detected
  if (!dbUrl || dbUrl.includes('[YOUR-PASSWORD]') || dbUrl.includes('YOUR_ACTUAL_PASSWORD')) {
    console.log('ℹ️ Demo mode: Using in-memory database (Update [YOUR-PASSWORD] in backend/.env to connect Supabase PostgreSQL)');
    return connectionSimple.connectDatabase();
  }

  try {
    pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    console.log('✅ Supabase PostgreSQL connected successfully');
    
    // Auto-run schema migrations to ensure tables exist
    try {
      const { createTables } = require('./migrate');
      await createTables();
    } catch (migErr) {
      console.warn('Auto-migration warning:', migErr.message);
    }

    return pool;
  } catch (error) {
    console.error('⚠️ Could not connect to Supabase PostgreSQL:', error.message);
    console.log('ℹ️ Falling back to in-memory database for local testing');
    pool = null;
    return connectionSimple.connectDatabase();
  }
};

const getPool = () => {
  if (pool) {
    return pool;
  }
  return connectionSimple.getPool();
};

const closeDatabase = async () => {
  if (pool) {
    await pool.end();
    console.log('Database connection closed');
  } else {
    await connectionSimple.closeDatabase();
  }
};

module.exports = {
  connectDatabase,
  getPool,
  closeDatabase
};