# ⚡ ShareFlow - Full-Stack File Sharing Web Application

A modern, high-performance, secure file-sharing web application built with **React 19**, **TypeScript**, **Express.js**, **Supabase PostgreSQL**, **Supabase Cloud Storage**, and **Clerk Authentication**.

---

## 🌟 Key Features

- **⚡ Instant Anonymous Uploads**: Drag-and-drop or browse files with immediate share link generation—no sign-up required.
- **🔐 Clerk User Authentication**: Seamless user authentication powered by Clerk. Registered users get access to a personal dashboard.
- **☁️ Cloud Storage (Supabase)**: Multi-tenant cloud storage support via `@supabase/supabase-js` storage buckets with local disk fallback.
- **🗄️ PostgreSQL Database (Supabase Pooler)**: Enterprise-grade database management via Supabase IPv4 Transaction Pooler (`aws-0-ap-southeast-1.pooler.supabase.com:6543`) with SSL encryption.
- **⏰ Automated 7-Day Auto-Expiry**: Automated background cleanup job runs every hour to physically purge expired files and database entries older than 7 days.
- **🛡️ 5-File Batch Limit**: Strict limit of 5 files per upload request enforced across frontend validation, Multer middleware, and backend API controllers.
- **🗑️ Dashboard File Management**: Logged-in users can manage, copy, preview, and permanently delete their uploaded files with real-time UI stats updates.
- **👁️ File Preview & Download**: Instant inline browser previews for supported media formats (images, PDFs, text, video, audio) and direct binary download streaming.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 19, TypeScript, React Router v6 |
| **Styling & UI** | Vanilla CSS / Tailwind CSS, Lucide React Icons, React Hot Toast |
| **Backend Framework** | Node.js, Express.js |
| **Database** | PostgreSQL on Supabase (Pooler Port 6543) via `pg` pool |
| **File Storage** | Supabase Storage (`@supabase/supabase-js`) |
| **Authentication** | Clerk Auth (`@clerk/clerk-react` & `@clerk/backend`) |
| **FileUpload Engine** | Multer (`multipart/form-data`) |

---

## 📊 Database Architecture & Data Flow

### How & Where Data is Stored

When a file is uploaded, the application splits file handling into **Physical Storage** and **Metadata Storage**:

```
           +-------------------------------------------------------+
           |                 User Web Browser                      |
           +---------------------------+---------------------------+
                                       |
                                       | FormData (File + User ID)
                                       v
           +-------------------------------------------------------+
           |             Node.js / Express Backend                 |
           |             (Port 5001 + Multer Engine)               |
           +-------------+---------------------------+-------------+
                         |                           |
        1. Store File    |                           | 2. Save Metadata
                         v                           v
  +------------------------------+           +------------------------------+
  |    Supabase Cloud Storage    |           |   Supabase PostgreSQL DB     |
  |  (Bucket: uploads/<file_id>) |           |    (Table: files in PG)       |
  |                              |           |                              |
  |  Stores actual binary bytes  |           |  Stores schema & metadata    |
  +------------------------------+           +------------------------------+
```

1. **Physical File Storage (`Supabase Storage`)**:
   - The raw binary contents of the file (images, PDFs, ZIPs, videos, etc.) are transmitted to your **Supabase Storage Bucket** under the key `uploads/<uuid>_<timestamp>.<ext>`.
   - If Supabase environment variables are absent, the application gracefully falls back to local disk storage (`backend/uploads/`).

2. **Metadata Storage (`Supabase PostgreSQL Database`)**:
   - File details and ownership records are stored in the PostgreSQL database table **`files`**.

#### Database Table Schema (`files`)

| Column Name | Data Type | Constraints / Details | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, Default `gen_random_uuid()` | Unique identifier for file and download link |
| `original_name` | `VARCHAR(255)` | `NOT NULL` | Original name of uploaded file (sanitized) |
| `stored_name` | `VARCHAR(255)` | `NOT NULL` | Unique internal filename generated for storage |
| `mime_type` | `VARCHAR(100)` | `NOT NULL` | MIME type (e.g. `image/png`, `application/pdf`) |
| `size_bytes` | `BIGINT` | `NOT NULL` | File size in bytes |
| `user_id` | `VARCHAR(255)` | Optional | Clerk User ID (`user_2...`) if logged in; `NULL` if anonymous |
| `upload_ip` | `INET` | Optional | Uploader IP address |
| `storage_type` | `VARCHAR(20)` | Default `'local'` | Storage provider (`'supabase'`, `'s3'`, `'local'`) |
| `storage_path` | `TEXT` | `NOT NULL` | Path key inside the Supabase Storage Bucket |
| `download_count` | `INTEGER` | Default `0` | Tracks number of successful downloads |
| `is_public` | `BOOLEAN` | Default `true` | Visibility flag |
| `expires_at` | `TIMESTAMPTZ` | Default `NOW() + 7 days` | Automatic deletion timestamp |
| `created_at` | `TIMESTAMPTZ` | Default `NOW()` | Timestamp when file was created |

---

## 📖 User Guide: How to Use the Application

### 1. Anonymous File Upload (No Login Required)
1. Navigate to the **Home Page** at `http://localhost:3000`.
2. Drag and drop up to **5 files** into the dropzone (or click to browse).
3. The upload progress bar will display uploading status.
4. Once completed, your **Share Link** is generated (e.g., `http://localhost:3000/download/3a9f...`).
5. Click **Copy Link** to copy the share link or **Preview** to view the file inline.
6. The link is saved in your browser's **Recent Uploads** history so you can retrieve it later.

### 2. Sharing & Downloading Files
1. Send the generated share link to any recipient.
2. The recipient opens `http://localhost:3000/download/<file-id>`.
3. Click **Download** to save the file to disk.
4. Click **Preview** to view images, text documents, PDFs, or media directly in a browser tab without downloading.

### 3. User Authentication & Profile
1. Click **Sign In** or **Sign Up** in the navigation bar.
2. Authenticate using Clerk (Email & Password, Magic Link, Google, etc.).
3. Once logged in, your profile avatar and identity appear in the header.

### 4. User Dashboard & File Management
1. Navigate to the **Dashboard** at `http://localhost:3000/dashboard`.
2. The dashboard fetches all files uploaded under your account from Supabase PostgreSQL.
3. View real-time statistics cards: **Total Files**, **Uploads**, **Downloads**, and **Active Links**.
4. To delete a file, click the red **Trash 🗑️** button next to the file record.
5. Confirm deletion in the prompt. The system permanently deletes the physical file from **Supabase Storage** and deletes the record from **PostgreSQL**.

### 5. Automated 7-Day File Expiry
1. All files automatically expire **7 days** after upload.
2. An automated background worker runs on your backend server every **60 minutes**.
3. It detects all records where `expires_at < NOW()`, deletes physical files from Supabase Storage, and purges database rows automatically.

---

## 📁 Project Directory Structure

```
FILE-SHARE-WEB-APP-main/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── fileController.js    # Upload, download, preview, list, and delete logic
│   │   │   └── authController.js    # Legacy/Clerk authentication helpers
│   │   ├── database/
│   │   │   ├── connection.js        # Supabase PostgreSQL pool connection (SSL enabled)
│   │   │   └── migrate.js           # Database migration script (tables, indexes, constraints)
│   │   ├── middleware/
│   │   │   ├── auth.js              # optionalAuth & Clerk token validation
│   │   │   └── errorHandler.js      # Global error handling middleware
│   │   ├── models/
│   │   │   ├── File.js              # File database model & auto-expiry cleanup job
│   │   │   └── User.js              # User database model
│   │   ├── routes/
│   │   │   ├── fileRoutes.js        # Express API routes for file management
│   │   │   └── authRoutes.js        # Express API routes for authentication
│   │   ├── utils/
│   │   │   ├── storageUtils.js      # StorageManager for Supabase Storage & Local Disk
│   │   │   └── fileUtils.js         # Sanitization, hashing, MIME validation, formatters
│   │   └── server.js                # Express entry point & background cron scheduler
│   ├── .env                         # Backend environment variables
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx           # Global navigation bar with Clerk UserButton
│   │   │   └── Upload/
│   │   │       └── DragDropZone.tsx # Drag & drop file dropzone
│   │   ├── pages/
│   │   │   ├── HomePage.tsx         # Anonymous upload hero & history page
│   │   │   ├── DashboardPage.tsx    # User dashboard, stats, & file deletion manager
│   │   │   └── DownloadPage.tsx     # Public file download & preview screen
│   │   ├── services/
│   │   │   └── api.ts               # Axios API service client & interceptors
│   │   ├── types/
│   │   │   └── index.ts             # TypeScript definitions & interfaces
│   │   └── App.tsx                  # Main router setup & Clerk Provider wrapper
│   ├── .env                         # Frontend environment variables
│   └── package.json
│
├── DEPLOYMENT.md                    # Production deployment instructions
└── README.md                        # Documentation & setup guide
```

---

## ⚙️ Installation & Environment Configuration

### Prerequisites
- **Node.js**: v16+ or v20+
- **npm**: v8+
- **Supabase Account**: Project Reference & Database Password
- **Clerk Account**: Publishable Key & Secret Key

---

### 1. Environment Variables Setup

#### 🔹 Backend Environment File (`backend/.env`)
Create or edit `backend/.env`:

```env
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Supabase PostgreSQL Connection Pooler (IPv4 Transaction Pooler)
DATABASE_URL=postgresql://postgres.ghsvspynieruxqllzsvj:%40Shreysupabase@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres

# Supabase Storage Credentials
SUPABASE_URL=https://ghsvspynieruxqllzsvj.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# Clerk Auth Credentials
CLERK_PUBLISHABLE_KEY=pk_test_ZW5vdWdoLWVncmV0LTgyNC5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_eeiXxwXARtvTb8Z7wQoRycv8wvr3TL5K74btyIp2Cm

# App Limits
MAX_FILE_SIZE=104857600
LINK_EXPIRY_DAYS=7
```

#### 🔹 Frontend Environment File (`frontend/.env`)
Create or edit `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:5001
REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_ZW5vdWdoLWVncmV0LTgyNC5jbGVyay5hY2NvdW50cy5kZXYk
```

---

### 2. Database Migration

Run the migration script to create tables (`users`, `files`), performance indexes, and column type modifications on your Supabase PostgreSQL instance:

```bash
cd backend
npm run migrate
```

*Expected Output:*
```
✅ Supabase PostgreSQL connected successfully
✅ Database tables created successfully
🎉 Migration completed successfully
```

---

### 3. Running the Application Locally

#### Start Backend Server (Port 5001)
```bash
cd backend
npm run dev
```

#### Start Frontend Server (Port 3000)
In a separate terminal window:
```bash
cd frontend
npm start
```

Open your browser and navigate to **`http://localhost:3000`**.

---

## 📡 API Reference

### File Management Routes (`/api/files`)

| Method | Endpoint | Description | Query / Body Params |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/files/upload` | Upload single file | `file` (FormData), `user_id` (optional) |
| `POST` | `/api/files/upload-multiple` | Upload batch (max 5) | `files` (FormData, max 5), `user_id` (optional) |
| `GET` | `/api/files` | List user files | `user_id` (optional), `page`, `limit` |
| `GET` | `/api/files/:id/info` | Fetch metadata | `id` (URL parameter) |
| `GET` | `/api/files/:id/download` | Download binary file | `id` (URL parameter) |
| `GET` | `/api/files/:id/preview` | Stream file inline preview | `id` (URL parameter) |
| `DELETE`| `/api/files/:id` | Delete file & storage object | `id` (URL parameter), `user_id` (query param) |

---

## 🧹 Automated Expiry Cleanup

The application automatically manages file lifecycles:
1. Every file uploaded receives a timestamp `expires_at = NOW() + 7 days`.
2. An automated background scheduler runs on server startup and **every 60 minutes**.
3. It identifies all records where `expires_at < NOW()`, deletes their physical files from **Supabase Storage**, and purges the records from PostgreSQL.

---

## ❓ Troubleshooting & Edge Cases

- **macOS Port 5000 Conflict (`EADDRINUSE`)**: macOS AirPlay Receiver occupies port 5000. The backend is configured to run on port `5001`.
- **Supabase PostgreSQL IPv6 Issue**: Connecting directly to `db.<ref>.supabase.co:5432` may fail on networks without IPv6 support. Always use the IPv4 Transaction Pooler hostname `aws-0-ap-southeast-1.pooler.supabase.com:6543`.
- **Special Password Characters**: When embedding passwords containing special characters (`@`, `#`, `%`) into `DATABASE_URL`, ensure URL encoding is applied (e.g. `@` -> `%40`).

---

## 📄 License

This project is licensed under the MIT License.