import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticate, authorizeRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';
import { closeDatabase, openDatabase } from '../db/db.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '../data');
const backupsDir = path.join(__dirname, '../backups');

// Ensure backups directory exists
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// Enforce admin only
router.use(authenticate, authorizeRole(['admin']));

// Get all backups list
router.get('/backups', async (req, res) => {
  try {
    const files = fs.readdirSync(backupsDir);
    const backups = files
      .filter(f => f.startsWith('backup-') && f.endsWith('.db'))
      .map(file => {
        const filePath = path.join(backupsDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          createdAt: stats.mtime
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    res.json(backups);
  } catch (error) {
    res.status(500).json({ message: 'Error reading backups list', error: error.message });
  }
});

// Create Backup
router.post('/backup', async (req, res) => {
  const dbPath = path.join(dbDir, 'school.db');
  
  if (!fs.existsSync(dbPath)) {
    return res.status(404).json({ message: 'Database file not found' });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `backup-${timestamp}.db`;
  const backupPath = path.join(backupsDir, backupFileName);

  try {
    // Copy active database to backup location
    fs.copyFileSync(dbPath, backupPath);
    await logActivity('admin', req.user.id, 'Create Backup', `Created database backup: ${backupFileName}`);
    res.json({ message: 'Backup created successfully', filename: backupFileName });
  } catch (error) {
    res.status(500).json({ message: 'Error creating database backup', error: error.message });
  }
});

// Restore Backup
router.post('/restore', async (req, res) => {
  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({ message: 'Backup filename is required' });
  }

  // Prevent directory traversal attacks
  const safeFilename = path.basename(filename);
  if (safeFilename !== filename || !filename.startsWith('backup-') || !filename.endsWith('.db')) {
    return res.status(400).json({ message: 'Invalid backup file name' });
  }

  const backupPath = path.join(backupsDir, safeFilename);
  const dbPath = path.join(dbDir, 'school.db');

  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ message: 'Backup file not found' });
  }

  try {
    // 1. Close database connection
    await closeDatabase();

    // 2. Overwrite the database file
    fs.copyFileSync(backupPath, dbPath);

    // 3. Open new connection
    await openDatabase();

    await logActivity('admin', req.user.id, 'Restore Backup', `Restored database using backup: ${safeFilename}`);
    res.json({ message: 'Database restored successfully' });
  } catch (error) {
    // Attempt database reconnection if restore failed mid-way
    try {
      await openDatabase();
    } catch (e) {
      console.error('Critical database reopen error:', e);
    }
    res.status(500).json({ message: 'Error restoring database', error: error.message });
  }
});

// Delete Backup
router.delete('/backups/:filename', async (req, res) => {
  const { filename } = req.params;
  
  // Safe validation
  const safeFilename = path.basename(filename);
  if (safeFilename !== filename || !filename.startsWith('backup-') || !filename.endsWith('.db')) {
    return res.status(400).json({ message: 'Invalid backup file name' });
  }

  const backupPath = path.join(backupsDir, safeFilename);

  if (!fs.existsSync(backupPath)) {
    return res.status(404).json({ message: 'Backup file not found' });
  }

  try {
    fs.unlinkSync(backupPath);
    await logActivity('admin', req.user.id, 'Delete Backup', `Deleted backup file: ${safeFilename}`);
    res.json({ message: 'Backup file deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting backup file', error: error.message });
  }
});

export default router;
