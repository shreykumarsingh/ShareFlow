const File = require('../models/File');
const { storageManager } = require('../utils/storageUtils');
const { 
  sanitizeFilename, 
  generateUniqueFilename, 
  validateFileUpload,
  isPreviewableFile 
} = require('../utils/fileUtils');
const { isAuthenticated } = require('../middleware/auth');

// Helper to sanitize IP addresses for PostgreSQL INET column
const getCleanIp = (req) => {
  let ip = req.headers['x-forwarded-for'] || req.ip || (req.connection ? req.connection.remoteAddress : null);
  if (typeof ip === 'string') {
    ip = ip.split(',')[0].trim();
    if (ip.startsWith('::ffff:')) {
      ip = ip.replace('::ffff:', '');
    }
    if (ip === '::1') {
      ip = '127.0.0.1';
    }
  }
  return ip || null;
};

// Upload single file or text note
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file && (!req.body.text_content || req.body.text_content.trim() === '')) {
      return res.status(400).json({ error: 'No file or text note provided' });
    }

    let originalName;
    let storedName;
    let mimeType;
    let sizeBytes;
    let storageType = 'local';
    let storagePath = '';

    if (req.file) {
      // Validate file
      const validation = validateFileUpload(req.file);
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'File validation failed',
          details: validation.errors
        });
      }

      // Sanitize filename
      originalName = sanitizeFilename(req.file.originalname);
      storedName = generateUniqueFilename(originalName);

      // Store file
      const storageResult = await storageManager.storeFile(req.file, storedName);
      if (!storageResult.success) {
        return res.status(500).json({
          error: 'Failed to store file',
          details: storageResult.error
        });
      }

      storageType = storageResult.storageType;
      storagePath = storageResult.storagePath;
      mimeType = req.file.mimetype;
      sizeBytes = req.file.size;
    } else {
      // Text note only
      originalName = req.body.original_name || 'shared_note.txt';
      storedName = generateUniqueFilename(originalName);
      mimeType = 'text/plain';
      sizeBytes = Buffer.byteLength(req.body.text_content, 'utf8');

      // Create physical note file in writable uploads directory (/tmp on Vercel)
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      const localUploadDir = process.env.VERCEL ? os.tmpdir() : (process.env.UPLOAD_DIR || './uploads');
      try {
        if (!fs.existsSync(localUploadDir)) {
          fs.mkdirSync(localUploadDir, { recursive: true });
        }
        const notePath = path.join(localUploadDir, storedName);
        fs.writeFileSync(notePath, req.body.text_content, 'utf8');
        storagePath = process.env.VERCEL ? notePath : path.relative(process.cwd(), notePath);
      } catch (e) {
        console.warn('Physical note creation warning:', e.message);
        storagePath = storedName;
      }
    }

    // Get sanitized user IP
    const uploadIp = getCleanIp(req);

    // Create database record
    const fileRecord = await File.create({
      original_name: originalName,
      stored_name: storedName,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      user_id: req.body.user_id || (req.user ? req.user.id : null),
      upload_ip: uploadIp,
      storage_type: storageType,
      storage_path: storagePath,
      is_public: req.body.is_public !== 'false',
      password: req.body.password || null,
      text_content: req.body.text_content || null,
      custom_slug: req.body.custom_slug || null,
      is_edit_locked: req.body.is_edit_locked === 'true' || req.body.is_edit_locked === true,
      expires_in_hours: req.body.expires_in_hours || null,
      expires_at: req.body.expires_at || null
    });

    // Generate shareable link dynamically based on request host or process.env.FRONTEND_URL
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const baseUrl = (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost')) 
      ? process.env.FRONTEND_URL 
      : `${protocol}://${host}`;

    const shareSlug = fileRecord.custom_slug || fileRecord.id;
    const shareableLink = `${baseUrl}/download/${shareSlug}`;

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      file: fileRecord.toPublicJSON(),
      shareable_link: shareableLink,
      can_preview: isPreviewableFile(fileRecord.mime_type)
    });

  } catch (error) {
    next(error);
  }
};

// Upload multiple files
const uploadMultipleFiles = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedFiles = [];
    const errors = [];

    // Process each file
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      
      try {
        // Validate file
        const validation = validateFileUpload(file);
        if (!validation.isValid) {
          errors.push({
            file: file.originalname,
            errors: validation.errors
          });
          continue;
        }

        // Sanitize filename
        const originalName = sanitizeFilename(file.originalname);
        const storedName = generateUniqueFilename(originalName);

        // Store file
        const storageResult = await storageManager.storeFile(file, storedName);
        if (!storageResult.success) {
          errors.push({
            file: file.originalname,
            error: `Failed to store: ${storageResult.error}`
          });
          continue;
        }

        // Get sanitized user IP
        const uploadIp = getCleanIp(req);

        // Create database record
        const fileRecord = await File.create({
          original_name: originalName,
          stored_name: storedName,
          mime_type: file.mimetype,
          size_bytes: file.size,
          user_id: req.body.user_id || (req.user ? req.user.id : null),
          upload_ip: uploadIp,
          storage_type: storageResult.storageType,
          storage_path: storageResult.storagePath,
          is_public: req.body.is_public !== 'false',
          password: req.body.password || null,
          expires_at: req.body.expires_at || null
        });

        const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
        const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
        const baseUrl = (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost')) 
          ? process.env.FRONTEND_URL 
          : `${protocol}://${host}`;

        uploadedFiles.push({
          file: fileRecord.toPublicJSON(),
          shareable_link: `${baseUrl}/download/${fileRecord.id}`,
          can_preview: isPreviewableFile(fileRecord.mime_type)
        });

      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        errors.push({
          file: file.originalname,
          error: fileError.message
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} files uploaded successfully`,
      uploaded_files: uploadedFiles,
      ...(errors.length > 0 && { errors })
    });

  } catch (error) {
    next(error);
  }
};

// Get file info
const getFileInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    let file = await File.findById(id);
    if (!file) {
      file = await File.findBySlug(id);
    }
    if (!file) {
      return res.status(404).json({ error: 'File or shared page not found' });
    }

    // Check if file is expired
    if (file.isExpired()) {
      return res.status(410).json({ error: 'File has expired' });
    }

    // If file is password protected and no password provided, don't return full info
    if (file.isPasswordProtected() && !req.body.password) {
      return res.status(200).json({
        id: file.id,
        original_name: file.original_name,
        size_formatted: file.formatSize(),
        is_password_protected: true,
        created_at: file.created_at,
        expires_at: file.expires_at
      });
    }

    // Verify password if provided
    if (file.isPasswordProtected() && req.body.password) {
      const isPasswordValid = await file.verifyPassword(req.body.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    res.json({
      success: true,
      file: file.toPublicJSON(),
      can_preview: isPreviewableFile(file.mime_type)
    });

  } catch (error) {
    next(error);
  }
};

// Download file
const downloadFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    let file = await File.findById(id);
    if (!file) {
      file = await File.findBySlug(id);
    }
    if (!file) {
      return res.status(404).json({ error: 'File or shared page not found' });
    }

    // Check if file is expired
    if (file.isExpired()) {
      return res.status(410).json({ error: 'File has expired' });
    }

    // Verify password if file is protected
    if (file.isPasswordProtected()) {
      if (!password) {
        return res.status(401).json({ error: 'Password required' });
      }

      const isPasswordValid = await file.verifyPassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    // Increment download count
    await file.incrementDownloadCount();

    // Get file stream
    try {
      const fileStream = await storageManager.getFile(file.storage_path, file.storage_type);
      
      // Set response headers
      res.setHeader('Content-Type', file.mime_type);
      res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
      res.setHeader('Content-Length', file.size_bytes);

      // Stream file to response with error handler & database text_content fallback
      fileStream.on('error', (err) => {
        console.error('Stream reading error during download:', err);
        if (!res.headersSent) {
          if (file.text_content) {
            const buffer = Buffer.from(file.text_content, 'utf8');
            res.setHeader('Content-Length', buffer.length);
            return res.end(buffer);
          }
          res.status(404).json({ error: 'File not found on storage server' });
        }
      });
      fileStream.pipe(res);

    } catch (streamError) {
      console.error('File streaming error:', streamError);
      if (file.text_content) {
        const buffer = Buffer.from(file.text_content, 'utf8');
        res.setHeader('Content-Type', file.mime_type || 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
        res.setHeader('Content-Length', buffer.length);
        return res.end(buffer);
      }
      return res.status(500).json({ error: 'Failed to retrieve file' });
    }

  } catch (error) {
    next(error);
  }
};

// Preview file (for images, PDFs, etc.)
const previewFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.query;

    let file = await File.findById(id);
    if (!file) {
      file = await File.findBySlug(id);
    }
    if (!file) {
      return res.status(404).json({ error: 'File or shared page not found' });
    }

    // Check if file is expired
    if (file.isExpired()) {
      return res.status(410).json({ error: 'File has expired' });
    }

    // Check if file can be previewed
    if (!isPreviewableFile(file.mime_type)) {
      return res.status(422).json({ error: 'File cannot be previewed' });
    }

    // Verify password if file is protected
    if (file.isPasswordProtected()) {
      if (!password) {
        return res.status(401).json({ error: 'Password required' });
      }

      const isPasswordValid = await file.verifyPassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }

    // Get file stream
    try {
      const fileStream = await storageManager.getFile(file.storage_path, file.storage_type);
      
      // Set response headers for preview
      res.setHeader('Content-Type', file.mime_type);
      res.setHeader('Content-Disposition', 'inline');

      // Stream file to response with error handler
      fileStream.on('error', (err) => {
        console.error('Stream reading error during preview:', err);
        if (!res.headersSent) {
          if (file.text_content) {
            const buffer = Buffer.from(file.text_content, 'utf8');
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            return res.end(buffer);
          }
          res.status(404).json({ error: 'File not found on storage server' });
        }
      });
      fileStream.pipe(res);

    } catch (streamError) {
      console.error('File streaming error:', streamError);
      if (file.text_content) {
        const buffer = Buffer.from(file.text_content, 'utf8');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.end(buffer);
      }
      return res.status(500).json({ error: 'Failed to retrieve file' });
    }

  } catch (error) {
    next(error);
  }
};

// Delete file
const deleteFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.query.user_id || req.body.user_id || (req.user ? req.user.id : null);

    let file = await File.findById(id);
    if (!file) {
      file = await File.findBySlug(id);
    }
    if (!file) {
      return res.status(404).json({ error: 'File or shared page not found' });
    }

    // Check if edit locked
    if (file.is_edit_locked && (!userId || file.user_id !== userId)) {
      return res.status(403).json({ error: 'This page is Edit-Locked (read-only mode)' });
    }

    // Check ownership if user_id was set on the file
    if (file.user_id && userId && file.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied: You do not own this file' });
    }

    // Delete physical file
    await storageManager.deleteFile(file.storage_path, file.storage_type);

    // Delete database record
    await file.delete();

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    next(error);
  }
};

// List user files
const listUserFiles = async (req, res, next) => {
  try {
    const userId = req.query.user_id || (req.user ? req.user.id : null);
    if (!userId) {
      return res.json({
        success: true,
        files: [],
        pagination: { page: 1, limit: 20, count: 0, has_more: false }
      });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const files = await File.findByUserId(userId, limit, offset);
    
    res.json({
      success: true,
      files: files.map(file => file.toJSON()),
      pagination: {
        page,
        limit,
        count: files.length,
        has_more: files.length === limit
      }
    });

  } catch (error) {
    next(error);
  }
};

// Update file metadata (authenticated users only)
const updateFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { original_name, is_public, expires_at } = req.body;

    const file = await File.findById(id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if user owns the file
    if (!isAuthenticated(req) || (file.user_id && file.user_id !== req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update file
    const updateData = {};
    if (original_name !== undefined) updateData.original_name = sanitizeFilename(original_name);
    if (is_public !== undefined) updateData.is_public = is_public;
    if (expires_at !== undefined) updateData.expires_at = expires_at;

    const updatedFile = await file.update(updateData);

    res.json({
      success: true,
      message: 'File updated successfully',
      file: updatedFile.toJSON()
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFile,
  uploadMultipleFiles,
  getFileInfo,
  downloadFile,
  previewFile,
  deleteFile,
  listUserFiles,
  updateFile
};