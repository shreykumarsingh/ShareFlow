const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const {
  uploadFile,
  uploadMultipleFiles,
  getFileInfo,
  downloadFile,
  previewFile,
  deleteFile,
  listUserFiles,
  updateFile
} = require('../controllers/fileController');

const router = express.Router();

const os = require('os');
const getTempDir = () => {
  const targetDir = process.env.RENDER ? os.tmpdir() : path.join(process.cwd(), 'uploads', 'temp');
  try {
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    return targetDir;
  } catch (e) {
    return os.tmpdir();
  }
};

// Multer configuration for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getTempDir());
  },
  filename: (req, file, cb) => {
    // Generate temporary filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'temp-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 104857600, // 100MB default
    files: 5 // Maximum 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // Basic file validation - detailed validation happens in controller
    if (!file.originalname) {
      return cb(new Error('Filename is required'), false);
    }
    
    // Check for potentially dangerous binary extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.scr', '.vbs', '.jar', '.sh'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (dangerousExtensions.includes(ext)) {
      return cb(new Error('File type not allowed for security reasons'), false);
    }
    
    cb(null, true);
  }
});

// Routes

// Upload single file
router.post('/upload', 
  optionalAuth, 
  upload.single('file'), 
  uploadFile
);

// Upload multiple files
router.post('/upload-multiple', 
  optionalAuth, 
  upload.array('files', 5), 
  uploadMultipleFiles
);

// Get file information
router.get('/:id/info', optionalAuth, getFileInfo);
router.post('/:id/info', optionalAuth, getFileInfo); // POST for password-protected files

// Download file
router.get('/:id/download', downloadFile);
router.post('/:id/download', downloadFile); // POST for password-protected files

// Preview file (inline display)
router.get('/:id/preview', previewFile);

// Delete file
router.delete('/:id', optionalAuth, deleteFile);

// Update file metadata (authenticated users only)
router.patch('/:id', authenticateToken, updateFile);
router.put('/:id', authenticateToken, updateFile);

// List user's files
router.get('/', optionalAuth, listUserFiles);

// Health check for file service
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'file-service',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        error: 'File too large',
        max_size: process.env.MAX_FILE_SIZE || 104857600
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({ 
        error: 'Too many files',
        max_files: 5
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field' });
    }
  }
  
  if (error.message && error.message.includes('File type not allowed')) {
    return res.status(422).json({ error: error.message });
  }
  
  next(error);
});

module.exports = router;