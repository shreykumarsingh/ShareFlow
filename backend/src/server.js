const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Ensure backend .env is loaded regardless of process launch working directory
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Ensure upload directories exist
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads'));
const tempDir = path.join(uploadDir, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const { connectDatabase } = require('./database/connection');
const fileRoutes = require('./routes/fileRoutes');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads (when not using S3)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/files', fileRoutes);
app.use('/api/auth', authRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use(errorHandler);

// Database connection and server startup
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected successfully');

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV}`);
      console.log(`💾 Upload storage: ${process.env.SUPABASE_URL ? 'Supabase' : (process.env.USE_AWS_S3 === 'true' ? 'AWS S3' : 'Local')}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL}`);

      // Start background auto-expiry cleanup (runs on startup & every 1 hour)
      const File = require('./models/File');
      File.cleanupExpiredFiles().catch(err => console.error('Initial cleanup error:', err));
      setInterval(() => {
        console.log('⏰ Running scheduled 7-day auto-expiry cleanup...');
        File.cleanupExpiredFiles().catch(err => console.error('Scheduled cleanup error:', err));
      }, 60 * 60 * 1000);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

startServer();

module.exports = app;