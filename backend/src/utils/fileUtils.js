const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const mimeTypes = require('mime-types');
const { v4: uuidv4 } = require('uuid');

// Sanitize filename to prevent path traversal attacks
const sanitizeFilename = (filename) => {
  // Remove or replace dangerous characters
  let sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
  
  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^\.+|\.+$/g, '').trim();
  
  // Limit length
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    sanitized = name.substring(0, 255 - ext.length) + ext;
  }
  
  // Ensure it's not empty
  if (!sanitized || sanitized === '') {
    sanitized = 'unnamed_file';
  }
  
  return sanitized;
};

// Generate unique filename for storage
const generateUniqueFilename = (originalName) => {
  const ext = path.extname(originalName);
  const uuid = uuidv4();
  const timestamp = Date.now();
  return `${uuid}_${timestamp}${ext}`;
};

// Validate file type
const validateFileType = (filename, mimetype, allowedTypes = '*') => {
  if (allowedTypes === '*') {
    return true;
  }

  const allowedArray = Array.isArray(allowedTypes) ? allowedTypes : allowedTypes.split(',');
  
  // Check by MIME type
  if (allowedArray.some(type => mimetype.startsWith(type.trim()))) {
    return true;
  }

  // Check by extension
  const ext = path.extname(filename).toLowerCase();
  if (allowedArray.some(type => type.trim().toLowerCase() === ext)) {
    return true;
  }

  return false;
};

// Validate file size
const validateFileSize = (fileSize, maxSize = null) => {
  const maxFileSize = maxSize || parseInt(process.env.MAX_FILE_SIZE) || 104857600; // 100MB default
  return fileSize <= maxFileSize;
};

// Get file MIME type
const getMimeType = (filename) => {
  return mimeTypes.lookup(filename) || 'application/octet-stream';
};

// Check if file is an image
const isImageFile = (mimetype) => {
  return mimetype.startsWith('image/');
};

// Check if file is a document
const isDocumentFile = (mimetype) => {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ];
  
  return documentTypes.includes(mimetype);
};

// Check if file can be previewed
const isPreviewableFile = (mimetype) => {
  return isImageFile(mimetype) || 
         mimetype === 'application/pdf' || 
         mimetype.startsWith('text/') ||
         mimetype.startsWith('video/') ||
         mimetype.startsWith('audio/');
};

// Generate file hash
const generateFileHash = async (filePath) => {
  try {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  } catch (error) {
    console.error('Error generating file hash:', error);
    return null;
  }
};

// Create upload directory if it doesn't exist
const ensureUploadDirectory = async (uploadPath) => {
  try {
    await fs.access(uploadPath);
  } catch (error) {
    // Directory doesn't exist, create it
    await fs.mkdir(uploadPath, { recursive: true });
  }
};

// Delete file safely
const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Format file size to human readable
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get file extension from MIME type
const getExtensionFromMimeType = (mimetype) => {
  return mimeTypes.extension(mimetype) || 'bin';
};

// Validate file upload
const validateFileUpload = (file, options = {}) => {
  const {
    maxSize = parseInt(process.env.MAX_FILE_SIZE) || 104857600,
    allowedTypes = process.env.ALLOWED_FILE_TYPES || '*'
  } = options;

  const errors = [];

  // Check file size
  if (!validateFileSize(file.size, maxSize)) {
    errors.push(`File too large. Maximum size is ${formatFileSize(maxSize)}`);
  }

  // Check file type
  if (!validateFileType(file.originalname, file.mimetype, allowedTypes)) {
    errors.push(`File type not allowed. Allowed types: ${allowedTypes}`);
  }

  // Check filename
  if (!file.originalname || file.originalname.trim() === '') {
    errors.push('Filename cannot be empty');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  sanitizeFilename,
  generateUniqueFilename,
  validateFileType,
  validateFileSize,
  getMimeType,
  isImageFile,
  isDocumentFile,
  isPreviewableFile,
  generateFileHash,
  ensureUploadDirectory,
  deleteFile,
  formatFileSize,
  getExtensionFromMimeType,
  validateFileUpload
};