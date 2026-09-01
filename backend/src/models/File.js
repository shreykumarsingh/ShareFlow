const { getPool } = require('../database/connection');
const bcrypt = require('bcryptjs');

class File {
  constructor(data) {
    this.id = data.id;
    this.original_name = data.original_name;
    this.stored_name = data.stored_name;
    this.mime_type = data.mime_type;
    this.size_bytes = data.size_bytes;
    this.user_id = data.user_id;
    this.upload_ip = data.upload_ip;
    this.storage_type = data.storage_type;
    this.storage_path = data.storage_path;
    this.download_count = data.download_count;
    this.is_public = data.is_public;
    this.password_hash = data.password_hash;
    this.text_content = data.text_content || null;
    this.custom_slug = data.custom_slug || null;
    this.is_edit_locked = data.is_edit_locked || false;
    this.expires_at = data.expires_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.last_accessed_at = data.last_accessed_at;
  }

  static async create({
    original_name,
    stored_name,
    mime_type,
    size_bytes,
    user_id = null,
    upload_ip,
    storage_type = 'local',
    storage_path,
    is_public = true,
    password = null,
    text_content = null,
    custom_slug = null,
    is_edit_locked = false,
    expires_in_hours = null,
    expires_at = null
  }) {
    const pool = getPool();
    let passwordHash = null;

    // Hash password if provided
    if (password) {
      const saltRounds = 12;
      passwordHash = await bcrypt.hash(password, saltRounds);
    }

    // Set custom expiry if hours provided, or default 7 days
    if (expires_in_hours) {
      expires_at = new Date(Date.now() + parseFloat(expires_in_hours) * 60 * 60 * 1000);
    } else if (!expires_at) {
      const expiryDays = parseInt(process.env.LINK_EXPIRY_DAYS) || 7;
      expires_at = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    }

    try {
      const result = await pool.query(
        `INSERT INTO files (
          original_name, stored_name, mime_type, size_bytes, 
          user_id, upload_ip, storage_type, storage_path, 
          is_public, password_hash, text_content, custom_slug, is_edit_locked, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
        RETURNING *`,
        [
          original_name, stored_name, mime_type, size_bytes,
          user_id, upload_ip, storage_type, storage_path,
          is_public, passwordHash, text_content, custom_slug, is_edit_locked, expires_at
        ]
      );

      return new File(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  static async findById(id) {
    const pool = getPool();

    try {
      const result = await pool.query(
        'SELECT * FROM files WHERE id = $1',
        [id]
      );

      return result.rows.length > 0 ? new File(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  static async findBySlug(slug) {
    const pool = getPool();

    try {
      const result = await pool.query(
        'SELECT * FROM files WHERE custom_slug = $1',
        [slug]
      );

      return result.rows.length > 0 ? new File(result.rows[0]) : null;
    } catch (error) {
      throw error;
    }
  }

  static async findByUserId(userId, limit = 50, offset = 0) {
    const pool = getPool();

    try {
      const result = await pool.query(
        `SELECT * FROM files 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      return result.rows.map(row => new File(row));
    } catch (error) {
      throw error;
    }
  }

  static async findPublicFiles(limit = 50, offset = 0) {
    const pool = getPool();

    try {
      const result = await pool.query(
        `SELECT * FROM files 
         WHERE is_public = true 
         AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return result.rows.map(row => new File(row));
    } catch (error) {
      throw error;
    }
  }

  static async cleanupExpiredFiles() {
    const pool = getPool();
    const { storageManager } = require('../utils/storageUtils');

    try {
      // 1. Fetch expired files
      const result = await pool.query(
        `SELECT * FROM files WHERE expires_at IS NOT NULL AND expires_at < NOW()`
      );

      const expiredFiles = result.rows.map(row => new File(row));

      // 2. Delete physical file from storage (Supabase or Local)
      for (const file of expiredFiles) {
        try {
          await storageManager.deleteFile(file.storage_path, file.storage_type);
          console.log(`🧹 Cleanup: Deleted physical expired file ${file.original_name} (${file.id})`);
        } catch (err) {
          console.error(`⚠️ Cleanup: Failed deleting file ${file.id}:`, err.message);
        }
      }

      // 3. Delete database records
      if (expiredFiles.length > 0) {
        await pool.query(
          `DELETE FROM files WHERE expires_at IS NOT NULL AND expires_at < NOW()`
        );
        console.log(`✅ Cleanup: Purged ${expiredFiles.length} expired file records from database.`);
      }

      return expiredFiles;
    } catch (error) {
      console.error('Error during cleanupExpiredFiles:', error);
      throw error;
    }
  }

  async verifyPassword(password) {
    if (!this.password_hash) {
      return true; // No password protection
    }
    return await bcrypt.compare(password, this.password_hash);
  }

  async incrementDownloadCount() {
    const pool = getPool();

    try {
      const result = await pool.query(
        `UPDATE files 
         SET download_count = download_count + 1, 
             last_accessed_at = NOW() 
         WHERE id = $1 
         RETURNING *`,
        [this.id]
      );

      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
      }
      return this;
    } catch (error) {
      throw error;
    }
  }

  async update(data) {
    const pool = getPool();
    const updateFields = [];
    const values = [];
    let paramCount = 0;

    // Build dynamic update query
    Object.keys(data).forEach(key => {
      if (['original_name', 'is_public', 'expires_at'].includes(key)) {
        updateFields.push(`${key} = $${++paramCount}`);
        values.push(data[key]);
      }
    });

    if (updateFields.length === 0) {
      return this;
    }

    values.push(this.id);
    const query = `
      UPDATE files 
      SET ${updateFields.join(', ')} 
      WHERE id = $${++paramCount} 
      RETURNING *
    `;

    try {
      const result = await pool.query(query, values);
      
      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
      }
      return this;
    } catch (error) {
      throw error;
    }
  }

  async delete() {
    const pool = getPool();

    try {
      const result = await pool.query(
        'DELETE FROM files WHERE id = $1 RETURNING *',
        [this.id]
      );

      return result.rows.length > 0;
    } catch (error) {
      throw error;
    }
  }

  isExpired() {
    if (!this.expires_at) {
      return false;
    }
    return new Date() > new Date(this.expires_at);
  }

  isPasswordProtected() {
    return !!this.password_hash;
  }

  formatSize() {
    const bytes = this.size_bytes;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  toJSON() {
    return {
      id: this.id,
      original_name: this.original_name,
      mime_type: this.mime_type,
      size_bytes: this.size_bytes,
      size_formatted: this.formatSize(),
      user_id: this.user_id,
      text_content: this.text_content,
      custom_slug: this.custom_slug,
      is_edit_locked: this.is_edit_locked,
      download_count: this.download_count,
      is_public: this.is_public,
      is_password_protected: this.isPasswordProtected(),
      is_expired: this.isExpired(),
      expires_at: this.expires_at,
      created_at: this.created_at,
      last_accessed_at: this.last_accessed_at
    };
  }

  toPublicJSON() {
    return {
      id: this.id,
      original_name: this.original_name,
      mime_type: this.mime_type,
      size_formatted: this.formatSize(),
      text_content: this.text_content,
      custom_slug: this.custom_slug,
      is_edit_locked: this.is_edit_locked,
      is_password_protected: this.isPasswordProtected(),
      is_expired: this.isExpired(),
      expires_at: this.expires_at,
      created_at: this.created_at
    };
  }
}

module.exports = File;