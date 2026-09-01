// Simple in-memory database for demo purposes
// In production, this would connect to PostgreSQL

let users = [];
let files = [];

// Simple UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Simulate database connection
const connectDatabase = async () => {
  console.log('✅ Using in-memory database for demo');
  return true;
};

// Simple query interface
const query = async (sql, params = []) => {
  // This is a simplified implementation for demo
  // In production, this would be actual SQL queries
  
  console.log('Database Query:', sql, params);
  
  if (sql.includes('INSERT INTO users')) {
    const user = {
      id: generateUUID(),
      email: params[0],
      password_hash: params[1],
      name: params[2],
      is_verified: false,
      created_at: new Date(),
      updated_at: new Date()
    };
    users.push(user);
    console.log('User created:', user.id);
    return { rows: [user] };
  }
  
  if (sql.includes('SELECT * FROM users WHERE email')) {
    const user = users.find(u => u.email === params[0]);
    return { rows: user ? [user] : [] };
  }
  
  if (sql.includes('SELECT * FROM users WHERE id')) {
    const user = users.find(u => u.id === params[0]);
    return { rows: user ? [user] : [] };
  }
  
  if (sql.includes('INSERT INTO files')) {
    const file = {
      id: generateUUID(),
      original_name: params[0],
      stored_name: params[1],
      mime_type: params[2],
      size_bytes: params[3],
      user_id: params[4],
      upload_ip: params[5],
      storage_type: params[6] || 'local',
      storage_path: params[7],
      download_count: 0,
      is_public: params[8] !== false,
      password_hash: params[9],
      expires_at: params[10],
      created_at: new Date(),
      updated_at: new Date(),
      last_accessed_at: null
    };
    files.push(file);
    console.log('File created with ID:', file.id);
    console.log('Total files in database:', files.length);
    return { rows: [file] };
  }
  
  if (sql.includes('SELECT * FROM files WHERE id')) {
    console.log('Looking for file with ID:', params[0]);
    console.log('Available files:', files.map(f => f.id));
    const file = files.find(f => f.id === params[0]);
    console.log('Found file:', file ? 'Yes' : 'No');
    return { rows: file ? [file] : [] };
  }
  
  if (sql.includes('UPDATE files') && sql.includes('download_count')) {
    const file = files.find(f => f.id === params[0]);
    if (file) {
      file.download_count = (file.download_count || 0) + 1;
      file.last_accessed_at = new Date();
      return { rows: [file] };
    }
    return { rows: [] };
  }
  
  // Default empty result
  return { rows: [] };
};

const getPool = () => {
  return { query };
};

const closeDatabase = async () => {
  console.log('Database connection closed');
};

module.exports = {
  connectDatabase,
  getPool,
  closeDatabase
};