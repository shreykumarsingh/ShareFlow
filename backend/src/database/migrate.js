require('dotenv').config();
const { connectDatabase, getPool, closeDatabase } = require('./connection');

const createTables = async () => {
  const pool = getPool();
  
  try {
    await pool.query('BEGIN');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create files table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_name VARCHAR(255) NOT NULL,
        stored_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size_bytes BIGINT NOT NULL,
        user_id VARCHAR(255),
        upload_ip INET,
        storage_type VARCHAR(20) NOT NULL DEFAULT 'local',
        storage_path TEXT NOT NULL,
        download_count INTEGER DEFAULT 0,
        is_public BOOLEAN DEFAULT true,
        password_hash VARCHAR(255),
        text_content TEXT,
        custom_slug VARCHAR(100),
        is_edit_locked BOOLEAN DEFAULT false,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_accessed_at TIMESTAMP WITH TIME ZONE
      );
      
      ALTER TABLE files DROP CONSTRAINT IF EXISTS files_user_id_fkey;
      ALTER TABLE files ALTER COLUMN user_id TYPE VARCHAR(255);
      ALTER TABLE files ADD COLUMN IF NOT EXISTS text_content TEXT;
      ALTER TABLE files ADD COLUMN IF NOT EXISTS custom_slug VARCHAR(100);
      ALTER TABLE files ADD COLUMN IF NOT EXISTS is_edit_locked BOOLEAN DEFAULT false;
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_files_expires_at ON files(expires_at);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_files_custom_slug ON files(custom_slug);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);
    `);

    // Create function to update updated_at timestamp
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers for updated_at
    await pool.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON users 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS update_files_updated_at ON files;
      CREATE TRIGGER update_files_updated_at 
        BEFORE UPDATE ON files 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await pool.query('COMMIT');
    console.log('✅ Database tables created successfully');
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Database migration failed:', error);
    throw error;
  }
};

const runMigration = async () => {
  try {
    await connectDatabase();
    await createTables();
    console.log('🎉 Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { createTables };