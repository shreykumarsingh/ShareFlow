const { getPool } = require('../database/connection');
const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.name;
    this.password_hash = data.password_hash;
    this.is_verified = data.is_verified;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  static async create({ email, password, name }) {
    const pool = getPool();
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    try {
      const result = await pool.query(
        `INSERT INTO users (email, password_hash, name) 
         VALUES ($1, $2, $3) 
         RETURNING id, email, name, is_verified, created_at, updated_at`,
        [email, hashedPassword, name]
      );
      
      return new User(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  static async findByEmail(email) {
    const pool = getPool();
    
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    const pool = getPool();
    
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [id]
      );
      
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  async verifyPassword(password) {
    return await bcrypt.compare(password, this.password_hash);
  }

  async updatePassword(newPassword) {
    const pool = getPool();
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    try {
      const result = await pool.query(
        `UPDATE users 
         SET password_hash = $1 
         WHERE id = $2 
         RETURNING id, email, name, is_verified, created_at, updated_at`,
        [hashedPassword, this.id]
      );
      
      return result.rows.length > 0 ? new User(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  async update({ name, email }) {
    const pool = getPool();

    try {
      const result = await pool.query(
        `UPDATE users 
         SET name = COALESCE($1, name), email = COALESCE($2, email)
         WHERE id = $3 
         RETURNING id, email, name, is_verified, created_at, updated_at`,
        [name, email, this.id]
      );
      
      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
        return this;
      }
      return null;
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      is_verified: this.is_verified,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = User;