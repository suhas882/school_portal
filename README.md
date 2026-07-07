# New Millennium School - School Management System

A secure, modern, responsive, and 100% free school management portal. This application completely replaces Firebase with a Node.js + Express backend, a SQLite database, local storage, and a React + Tailwind CSS frontend.

It is fully capable of managing ~1,000 students/parents and is optimized for low-resource self-hosting.

---

## Folder Structure

```
school-management-system/
├── backend/
│   ├── data/                 # Auto-created directory for SQLite database
│   │   └── school.db
│   ├── backups/              # Directory where database backups are stored
│   ├── uploads/              # Homework file attachments directory
│   ├── db/
│   │   └── db.js             # SQLite init, schema tables & seeding script
│   ├── middleware/
│   │   └── auth.js           # JWT authentication & RBAC middleware
│   ├── routes/
│   │   ├── authRoutes.js     # Admin/Parent Logins & Password changes
│   │   ├── adminRoutes.js    # Students, Parents, School Info, Notices & Logs
│   │   ├── homeworkRoutes.js # Homework uploads, attachments & Parent listings
│   │   └── systemRoutes.js   # DB backup creation, restore & deletion
│   ├── utils/
│   │   └── logger.js         # Audit log helper to write to database
│   ├── .env                  # Port, JWT Secret, and Environment configs
│   ├── package.json
│   └── server.js             # Main server setup & static bundle serving
│
└── frontend/
    ├── dist/                 # Production compiled frontend directory
    ├── src/
    │   ├── assets/
    │   ├── components/
    │   │   ├── Layout.jsx    # Dashboard layout grid with sidebar and header
    │   │   └── Sidebar.jsx   # Responsive sidebar navigation menu
    │   ├── pages/
    │   │   ├── Login.jsx            # Dynamic Login card (Admin & Parent portals)
    │   │   ├── AdminDashboard.jsx   # Stats cards, custom charts, logs overview
    │   │   ├── ManageStudents.jsx   # Enrolling students & parent bindings
    │   │   ├── ManageHomework.jsx   # Homework publishing & file uploader
    │   │   ├── ManageClasses.jsx    # Class, section & subject configurations
    │   │   ├── ParentAccounts.jsx   # Creating parent logins & password resets
    │   │   ├── ParentPortal.jsx     # Read-only portal for homework logs & notices
    │   │   ├── Notices.jsx          # Public announcements writer
    │   │   ├── Settings.jsx         # Profile changes, school metadata & backups
    │   │   └── ActivityLogs.jsx     # Audit logs explorer
    │   ├── utils/
    │   │   └── api.js        # Axios-free API requests client (verifies tokens)
    │   ├── App.jsx           # Core app state & router bindings
    │   ├── index.css         # Tailwind directives & CSS micro-animations
    │   └── main.jsx          # React renderer entry
    ├── tailwind.config.js
    ├── postcss.config.js
    └── package.json
```

---

## Database Schema (SQLite)

The database utilizes foreign keys and indexing. The schema contains the following tables:

*   `admins`: Stores administrative user accounts (seeded by default with `admin`/`admin123`).
*   `parents`: Stores parent portal user accounts.
*   `students`: Enrolled student directory, containing roll numbers and references to parents.
*   `classes`: Academic grades (e.g. nursery, UKG, Class 10).
*   `sections`: Class-specific divisions (e.g., Section A, Section B).
*   `subjects`: Class-specific courses (e.g., Mathematics, English).
*   `homework`: Assignment details (due dates, description body).
*   `attachments`: Uploaded homework documents (stores file names, static paths, and sizes).
*   `notices`: Announcements list (supports audience filtering for everyone, parents only, or admins only).
*   `school_info`: Key school metadata (customizable name, address, contact channels).
*   `activity_logs`: Audit registry logs of administrative modifications and login starts.

---

## API Endpoints

### 🔐 Authentication (`/api/auth`)
*   `POST /admin/login`: Verifies admin username/email + password. Returns JWT token.
*   `POST /parent/login`: Verifies parent username/email + password. Returns JWT token.
*   `POST /change-password`: Modifies password for active session user (Admin or Parent).
*   `GET /school-info`: Retrieves only the school name (Accessible to any logged-in user).

### 📋 Administrative Functions (`/api/admin`)
*   `GET /stats`: Returns counters (Students, Parents, Classes, Tasks today) and recent logs.
*   `GET /classes` | `POST /classes` | `DELETE /classes/:id`: Managing class lists.
*   `GET /sections` | `POST /sections` | `DELETE /sections/:id`: Managing section mappings.
*   `GET /subjects` | `POST /subjects` | `DELETE /subjects/:id`: Managing subject mappings.
*   `GET /students` | `POST /students` | `PUT /students/:id` | `DELETE /students/:id`: Managing enrolled students.
*   `GET /parents` | `POST /parents` | `PUT /parents/:id` | `DELETE /parents/:id`: Managing parent credentials.
*   `POST /parents/:id/reset-password`: Resets a parent's password to a default key.
*   `GET /notices` | `POST /notices` | `PUT /notices/:id` | `DELETE /notices/:id`: Creating notice board announcements.
*   `GET /school-info` | `PUT /school-info`: Editing school address details.
*   `GET /activity-logs`: Viewing audit logs registry (Last 500 actions).

### 📚 Homework & Attachments (`/api/homework`)
*   `POST /`: Publishes homework. Supports multi-file attachment uploads (via Multer).
*   `PUT /:id`: Edits details and manages uploads (adding new/removing existing).
*   `DELETE /:id`: Removes homework and deletes physical attachment files from disk.
*   `GET /:id`: Loads specific task details.
*   `GET /`: Fetches homework history.
    *   **Admin Mode**: Returns all assignments (filterable by class/section).
    *   **Parent Mode**: Returns *only* assignments assigned to classes/sections where the parent's children are enrolled.

### ⚙️ Database & Backups (`/api/system`)
*   `GET /backups`: Lists existing SQL database snapshots.
*   `POST /backup`: Safely copies active `school.db` to timestamped backup.
*   `POST /restore`: Overwrites active database connection with a snapshot file.
*   `DELETE /backups/:filename`: Irreversibly deletes backup file from disk.

---

## Security Implementation

1.  **JWT Sessions**: Authorization credentials are not saved in cookies. Tokens are placed in headers (`Authorization: Bearer <token>`) to protect against Cross-Site Request Forgery (CSRF).
2.  **Password Hashing**: Stored passwords use `bcryptjs` for encryption.
3.  **SQL Injection Protection**: Node-SQLite parameters binding (e.g. `?` binds) completely neutralizes query string injection vectors.
4.  **XSS Protection**: Helmet middlewares apply Cross-Origin Resource Policies and Content-Security-Policies. Combined with React's string escaping, this mitigates cross-site scripting risks.
5.  **Brute Force Protection**: Express rate limiters throttle login attempts to 15 tries per 5 minutes.
6.  **Remote Code Upload Prevention**: Multer only allows uploads matching whitelisted extensions (PDF, Word, Excel, Images) and limits file sizes to 5MB, preventing malicious executable execution.

---

## Installation & Setup Guide

### Prerequisites
*   Node.js (v18.0.0 or higher)
*   npm (v9.0.0 or higher)

### 1. Backend Setup
1.  Navigate to the backend folder:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Ensure `.env` contains:
    ```env
    PORT=5000
    JWT_SECRET=greenwood-academy-secure-session-signing-token-98231
    NODE_ENV=development
    ```
4.  Start backend server:
    ```bash
    npm run dev
    ```
    *The console will log:* `Default admin seeded. User: admin, Password: admin123`

### 2. Frontend Setup
1.  Navigate to the frontend folder:
    ```bash
    cd ../frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start development server:
    ```bash
    npm run dev
    ```
4.  Build for production:
    ```bash
    npm run build
    ```

*Once the frontend is built, the compiled assets will be stored in `frontend/dist`. The backend is configured to automatically serve these files. This means you can run the entire system by simply launching the backend server (`node backend/server.js`) on port 5000!*

---

## Operational Guide

### Default Credentials
*   **Admin Login**: User `admin` | Password `admin123`
    *(Go to Settings & Backups -> Profile & Security to change this password immediately after first login)*

### Database Backup & Restore Flow
1.  **Create Backup**: Under the Admin settings -> Database Backups page, click "Create DB Backup". It generates a file like `backup-YYYY-MM-DD-HH-MM-SS.db` inside `backend/backups/`.
2.  **Restore Backup**: In the backups list, locate the snapshot you wish to restore, click "Restore", and confirm. The Express backend will close active SQLite threads, copy the file, and rebuild connections in milliseconds.
3.  **Local storage files**: Homework attachments are stored inside `backend/uploads/`. It is recommended to backup the `uploads/` folder alongside database backups.

### Deploying for Free (e.g. Render / Railway)
1.  Push the project code to a private GitHub repository.
2.  Create a Web Service on **Render** (or a deployment server on **Railway**).
3.  Set the start command to launch backend:
    ```bash
    node backend/server.js
    ```
4.  Define environment variables on the provider control panel (`JWT_SECRET`, `NODE_ENV=production`).
5.  Add a **Persistent Disk/Volume** mapped to mount path `/opt/render/project/src/backend/data` (to prevent SQLite database erasure during re-deployments). Make sure to also map a volume for `/backend/uploads` if you want uploaded files to persist across deployments.
