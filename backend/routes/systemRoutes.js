import express from 'express';
import { authenticate, authorizeRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

const router = express.Router();

// Enforce admin only
router.use(authenticate, authorizeRole(['admin']));

// Get backups list
router.get('/backups', async (req, res) => {
  // PostgreSQL backups are managed in the cloud dashboard automatically.
  // We return an empty array to maintain UI compatibility with Settings tab.
  res.json([]);
});

// Create Backup (mocked for cloud provider)
router.post('/backup', async (req, res) => {
  try {
    await logActivity('admin', req.user.id, 'Trigger Backup', 'Requested cloud database snapshot validation');
    res.json({ 
      message: 'Your PostgreSQL database is securely hosted. Automated daily snapshots are managed directly on the cloud provider (Supabase/Neon dashboard).', 
      filename: 'Managed by Cloud Provider' 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error checking database backup status', error: error.message });
  }
});

// Restore Backup (mocked for cloud provider)
router.post('/restore', async (req, res) => {
  res.status(400).json({ 
    message: 'To perform database restoration, please navigate to your cloud database dashboard (Supabase/Neon) and utilize their point-in-time recovery tools.' 
  });
});

// Delete Backup (mocked)
router.delete('/backups/:filename', async (req, res) => {
  res.json({ message: 'Metadata logged' });
});

export default router;
