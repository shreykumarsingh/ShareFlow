const os = require('os');
const AWS = require('aws-sdk');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const { ensureUploadDirectory, deleteFile } = require('./fileUtils');

// Supabase Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || 'filesharing';
const isRealSupabaseKey = SUPABASE_KEY && !SUPABASE_KEY.includes('your-supabase');
const USE_SUPABASE = (process.env.USE_SUPABASE === 'true' || (process.env.VERCEL && SUPABASE_URL && isRealSupabaseKey)) && SUPABASE_URL && isRealSupabaseKey;

let supabase = null;
if (USE_SUPABASE) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;
const USE_S3 = process.env.USE_AWS_S3 === 'true' && BUCKET_NAME;
const LOCAL_UPLOAD_DIR = process.env.VERCEL ? os.tmpdir() : (process.env.UPLOAD_DIR || './uploads');

// --- Supabase Storage Helpers ---
const uploadToSupabase = async (filePath, key, mimetype) => {
  try {
    const fileContent = fs.readFileSync(filePath);
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(key, fileContent, {
        contentType: mimetype,
        upsert: true
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(key);

    return {
      success: true,
      location: publicUrlData?.publicUrl,
      key: data.path
    };
  } catch (error) {
    console.error('Supabase Storage upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const downloadFromSupabase = async (key) => {
  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .download(key);

  if (error) throw error;

  const buffer = Buffer.from(await data.arrayBuffer());
  return Readable.from(buffer);
};

const deleteFromSupabase = async (key) => {
  try {
    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .remove([key]);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Supabase Storage delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// --- AWS S3 Helpers ---
const uploadToS3 = async (filePath, key, mimetype) => {
  try {
    const fileContent = fs.readFileSync(filePath);
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: mimetype,
      ServerSideEncryption: 'AES256',
      StorageClass: 'STANDARD_IA'
    };

    const result = await s3.upload(params).promise();
    return {
      success: true,
      location: result.Location,
      key: result.Key,
      etag: result.ETag
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const downloadFromS3 = (key) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key
  };

  return s3.getObject(params).createReadStream();
};

const getS3FileMetadata = async (key) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    const result = await s3.headObject(params).promise();
    return {
      success: true,
      contentLength: result.ContentLength,
      contentType: result.ContentType,
      lastModified: result.LastModified,
      etag: result.ETag
    };
  } catch (error) {
    console.error('S3 metadata error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const deleteFromS3 = async (key) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };

    await s3.deleteObject(params).promise();
    return { success: true };
  } catch (error) {
    console.error('S3 delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const generateSignedUrl = (key, expiresIn = 3600) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expiresIn
    };

    return {
      success: true,
      url: s3.getSignedUrl('getObject', params)
    };
  } catch (error) {
    console.error('S3 signed URL error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// --- Local Storage Helpers ---
const storeFileLocally = async (file, storedName) => {
  try {
    await ensureUploadDirectory(LOCAL_UPLOAD_DIR);
    const localPath = path.join(LOCAL_UPLOAD_DIR, storedName);
    
    try {
      fs.renameSync(file.path, localPath);
    } catch (renameErr) {
      // Fallback for cross-device or cross-drive moves
      fs.copyFileSync(file.path, localPath);
      try {
        fs.unlinkSync(file.path);
      } catch (e) {}
    }
    
    return {
      success: true,
      path: localPath,
      relativePath: path.relative(process.cwd(), localPath)
    };
  } catch (error) {
    console.error('Local storage error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const getLocalFileStream = (filePath) => {
  try {
    return fs.createReadStream(filePath);
  } catch (error) {
    console.error('Local file stream error:', error);
    throw error;
  }
};

const deleteLocalFile = async (filePath) => {
  return await deleteFile(filePath);
};

// --- Generic Storage Interface ---
class StorageManager {
  constructor() {
    this.useSupabase = USE_SUPABASE;
    this.useS3 = USE_S3;
  }

  async storeFile(file, storedName) {
    if (this.useSupabase) {
      const localResult = await storeFileLocally(file, storedName);
      if (!localResult.success) return localResult;

      const supabaseKey = `uploads/${storedName}`;
      const supabaseResult = await uploadToSupabase(localResult.path, supabaseKey, file.mimetype);
      await deleteLocalFile(localResult.path);

      if (supabaseResult.success) {
        return {
          success: true,
          storageType: 'supabase',
          storagePath: supabaseKey,
          location: supabaseResult.location
        };
      } else {
        return supabaseResult;
      }
    } else if (this.useS3) {
      const localResult = await storeFileLocally(file, storedName);
      if (!localResult.success) {
        return localResult;
      }

      const s3Key = `uploads/${storedName}`;
      const s3Result = await uploadToS3(localResult.path, s3Key, file.mimetype);
      await deleteLocalFile(localResult.path);

      if (s3Result.success) {
        return {
          success: true,
          storageType: 's3',
          storagePath: s3Key,
          location: s3Result.location
        };
      } else {
        return s3Result;
      }
    } else {
      const result = await storeFileLocally(file, storedName);
      if (result.success) {
        return {
          success: true,
          storageType: 'local',
          storagePath: result.relativePath,
          location: result.path
        };
      } else {
        return result;
      }
    }
  }

  async getFile(storagePath, storageType) {
    if (storageType === 'supabase') {
      return await downloadFromSupabase(storagePath);
    } else if (storageType === 's3') {
      return downloadFromS3(storagePath);
    } else {
      const fullPath = path.isAbsolute(storagePath) ? storagePath : path.join(process.cwd(), storagePath);
      return getLocalFileStream(fullPath);
    }
  }

  async deleteFile(storagePath, storageType) {
    if (storageType === 'supabase') {
      return await deleteFromSupabase(storagePath);
    } else if (storageType === 's3') {
      return await deleteFromS3(storagePath);
    } else {
      const fullPath = path.isAbsolute(storagePath) ? storagePath : path.join(process.cwd(), storagePath);
      return await deleteLocalFile(fullPath);
    }
  }

  async getFileMetadata(storagePath, storageType) {
    if (storageType === 's3') {
      return await getS3FileMetadata(storagePath);
    } else {
      try {
        const fullPath = path.isAbsolute(storagePath) ? storagePath : path.join(process.cwd(), storagePath);
        const stats = fs.statSync(fullPath);
        return {
          success: true,
          contentLength: stats.size,
          lastModified: stats.mtime
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    }
  }

  async generateDownloadUrl(storagePath, storageType, expiresIn = 3600) {
    if (storageType === 'supabase') {
      const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath);
      return {
        success: true,
        url: data.publicUrl
      };
    } else if (storageType === 's3') {
      return generateSignedUrl(storagePath, expiresIn);
    } else {
      return {
        success: true,
        url: `/uploads/${path.basename(storagePath)}`
      };
    }
  }
}

const storageManager = new StorageManager();

module.exports = {
  storageManager,
  StorageManager,
  uploadToSupabase,
  downloadFromSupabase,
  deleteFromSupabase,
  uploadToS3,
  downloadFromS3,
  getS3FileMetadata,
  deleteFromS3,
  generateSignedUrl,
  storeFileLocally,
  getLocalFileStream,
  deleteLocalFile,
  USE_SUPABASE,
  USE_S3
};