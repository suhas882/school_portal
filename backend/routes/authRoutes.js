import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/db.js';
import { JWT_SECRET, authenticate, authorizeRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

const router = express.Router();


// Admin Login
router.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const admin = await query.get(
      'SELECT * FROM admins WHERE username = ? OR email = ?',
      [username, username]
    );

    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, email: admin.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logActivity('admin', admin.id, 'Logged In', 'Admin session started');

    res.json({
      token,
      user: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        role: 'admin'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Parent Login
router.post('/parent/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const parent = await query.get(
      'SELECT * FROM parents WHERE username = ? OR email = ?',
      [username, username]
    );

    if (!parent) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, parent.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: parent.id, username: parent.username, email: parent.email, role: 'parent' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logActivity('parent', parent.id, 'Logged In', 'Parent session started');

    res.json({
      token,
      user: {
        id: parent.id,
        username: parent.username,
        email: parent.email,
        role: 'parent'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Change Password
router.post('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const { id, role } = req.user;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new passwords are required' });
  }

  try {
    let userRecord = null;
    let table = '';

    if (role === 'admin') {
      table = 'admins';
    } else if (role === 'parent') {
      table = 'parents';
    } else {
      return res.status(400).json({ message: 'Invalid user role' });
    }

    userRecord = await query.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    if (!userRecord) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, userRecord.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await query.run(`UPDATE ${table} SET password_hash = ? WHERE id = ?`, [newHash, id]);
    await logActivity(role, id, 'Password Changed', 'User updated password');

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Fetch school name for portal headers
router.get('/school-info', async (req, res) => {
  try {
    const info = await query.get('SELECT name FROM school_info WHERE id = 1');
    res.json(info);
  } catch (error) {
    res.status(500).json({ message: 'Error loading school name', error: error.message });
  }
});

// Get Parent Profile & Children Billing Details
router.get('/parent/profile', authenticate, authorizeRole(['parent']), async (req, res) => {
  try {
    const parent = await query.get('SELECT id, username, email, phone FROM parents WHERE id = ?', [req.user.id]);
    if (!parent) {
      return res.status(404).json({ message: 'Parent profile not found' });
    }

    // Fetch linked children details (including tuition fees)
    const children = await query.all(
      `SELECT s.id, s.name, s.roll_number, s.class_id, s.section_id, s.type, s.fee_amount, s.concession, s.fee_after_concession, s.remaining_balance, s.payment_status, c.name as class_name, sec.name as section_name 
       FROM students s
       JOIN classes c ON s.class_id = c.id
       JOIN sections sec ON s.section_id = sec.id
       WHERE s.parent_id = ?`,
      [req.user.id]
    );

    parent.children = children;
    res.json(parent);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving parent profile', error: error.message });
  }
});

// Get Parent's Child Payment Ledger
router.get('/parent/students/:studentId/payments', authenticate, authorizeRole(['parent']), async (req, res) => {
  const { studentId } = req.params;
  try {
    // Security check: Validate linkage
    const linkCheck = await query.get(
      'SELECT COUNT(*) as count FROM students WHERE id = ? AND parent_id = ?',
      [studentId, req.user.id]
    );
    if (linkCheck.count === 0) {
      return res.status(403).json({ message: 'Access denied: Student is not linked to your account' });
    }

    const payments = await query.all(
      'SELECT * FROM payments WHERE student_id = ? ORDER BY date DESC, created_at DESC',
      [studentId]
    );
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve payment history', error: error.message });
  }
});

// Fetch notices (accessible to both admin and parent roles)
router.get('/notices', authenticate, async (req, res) => {
  try {
    let sql = 'SELECT * FROM notices';
    const params = [];
    
    if (req.user.role === 'parent') {
      sql += " WHERE audience IN ('all', 'parents')";
    }
    sql += ' ORDER BY created_at DESC';
    
    const notices = await query.all(sql, params);
    res.json(notices);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notices', error: error.message });
  }
});

export default router;
