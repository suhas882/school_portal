import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { query } from '../db/db.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if not existing
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Disk Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'));
  }
});

// File Filter for security (restricting malicious executables)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.txt'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Allowed files: PDF, images, Word, Excel, PowerPoint, Text.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// ==========================================
// ADMIN WORK: CREATE, EDIT, DELETE HOMEWORK
// ==========================================

// Create Homework (with optional file upload)
router.post(
  '/',
  authenticate,
  authorizeRole(['admin']),
  upload.array('files', 5), // allow up to 5 attachments
  async (req, res) => {
    const { class_id, section_id, subject_id, title, description, due_date } = req.body;

    if (!class_id || !section_id || !subject_id || !title || !description || !due_date) {
      if (req.files) {
        req.files.forEach(f => fs.unlinkSync(f.path));
      }
      return res.status(400).json({ message: 'All homework fields are required' });
    }

    try {
      // Create Homework Entry with RETURNING id for PostgreSQL
      const hwResult = await query.run(
        `INSERT INTO homework (class_id, section_id, subject_id, title, description, due_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [class_id, section_id, subject_id, title.trim(), description.trim(), due_date, req.user.id]
      );

      const homeworkId = hwResult.id;

      // Create Attachments Entries
      const attachments = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const relativePath = `/uploads/${file.filename}`;
          const attachResult = await query.run(
            `INSERT INTO attachments (homework_id, file_name, file_path, file_type, file_size)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [homeworkId, file.originalname, relativePath, file.mimetype, file.size]
          );
          attachments.push({
            id: attachResult.id,
            file_name: file.originalname,
            file_path: relativePath
          });
        }
      }

      await logActivity('admin', req.user.id, 'Create Homework', `Created homework "${title}" (ID: ${homeworkId})`);
      res.status(201).json({
        id: homeworkId,
        class_id,
        section_id,
        subject_id,
        title,
        description,
        due_date,
        attachments
      });
    } catch (error) {
      if (req.files) {
        req.files.forEach(f => {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });
      }
      res.status(500).json({ message: 'Error saving homework', error: error.message });
    }
  }
);

// Edit Homework
router.put(
  '/:id',
  authenticate,
  authorizeRole(['admin']),
  upload.array('files', 5),
  async (req, res) => {
    const { id } = req.params;
    const { class_id, section_id, subject_id, title, description, due_date, delete_attachments } = req.body;

    if (!class_id || !section_id || !subject_id || !title || !description || !due_date) {
      if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
      return res.status(400).json({ message: 'All fields are required' });
    }

    try {
      const existingHw = await query.get('SELECT * FROM homework WHERE id = $1', [id]);
      if (!existingHw) {
        if (req.files) req.files.forEach(f => fs.unlinkSync(f.path));
        return res.status(404).json({ message: 'Homework not found' });
      }

      // Update basic fields
      await query.run(
        `UPDATE homework 
         SET class_id = $1, section_id = $2, subject_id = $3, title = $4, description = $5, due_date = $6 
         WHERE id = $7`,
        [class_id, section_id, subject_id, title.trim(), description.trim(), due_date, id]
      );

      // Handle deleted attachments
      if (delete_attachments) {
        const toDeleteIds = Array.isArray(delete_attachments) ? delete_attachments : [delete_attachments];
        for (const attachId of toDeleteIds) {
          const fileRecord = await query.get('SELECT * FROM attachments WHERE id = $1 AND homework_id = $2', [attachId, id]);
          if (fileRecord) {
            const absolutePath = path.join(__dirname, '..', fileRecord.file_path);
            if (fs.existsSync(absolutePath)) {
              fs.unlinkSync(absolutePath);
            }
            await query.run('DELETE FROM attachments WHERE id = $1', [attachId]);
          }
        }
      }

      // Handle new uploads
      const newAttachments = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const relativePath = `/uploads/${file.filename}`;
          const attachResult = await query.run(
            `INSERT INTO attachments (homework_id, file_name, file_path, file_type, file_size)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [id, file.originalname, relativePath, file.mimetype, file.size]
          );
          newAttachments.push({
            id: attachResult.id,
            file_name: file.originalname,
            file_path: relativePath
          });
        }
      }

      await logActivity('admin', req.user.id, 'Update Homework', `Updated homework "${title}" (ID: ${id})`);
      res.json({ message: 'Homework updated successfully', newAttachments });
    } catch (error) {
      if (req.files) {
        req.files.forEach(f => {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        });
      }
      res.status(500).json({ message: 'Error updating homework', error: error.message });
    }
  }
);

// Delete Homework
router.delete('/:id', authenticate, authorizeRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const hw = await query.get('SELECT title FROM homework WHERE id = $1', [id]);
    if (!hw) return res.status(404).json({ message: 'Homework record not found' });

    // Find and delete physical attachments
    const fileRecords = await query.all('SELECT * FROM attachments WHERE homework_id = $1', [id]);
    for (const record of fileRecords) {
      const absolutePath = path.join(__dirname, '..', record.file_path);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    }

    await query.run('DELETE FROM homework WHERE id = $1', [id]);
    await logActivity('admin', req.user.id, 'Delete Homework', `Deleted homework "${hw.title}" (ID: ${id})`);

    res.json({ message: 'Homework and its attachments deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting homework', error: error.message });
  }
});

// ==========================================
// VIEW HOMEWORK (ROLES SUPPORT)
// ==========================================

// Get Homework Details
router.get('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const hw = await query.get(
      `SELECT h.*, c.name as class_name, s.name as section_name, sub.name as subject_name 
       FROM homework h
       JOIN classes c ON h.class_id = c.id
       JOIN sections s ON h.section_id = s.id
       JOIN subjects sub ON h.subject_id = sub.id
       WHERE h.id = $1`,
      [id]
    );

    if (!hw) return res.status(404).json({ message: 'Homework not found' });

    // Retrieve attachments
    hw.attachments = await query.all('SELECT id, file_name, file_path, file_size FROM attachments WHERE homework_id = $1', [id]);

    // Parent permission checks (ensure this homework belongs to their child's class and section)
    if (req.user.role === 'parent') {
      const parentChildren = await query.get(
        `SELECT COUNT(*) as count FROM students 
         WHERE parent_id = $1 AND class_id = $2 AND section_id = $3`,
        [req.user.id, hw.class_id, hw.section_id]
      );
      if (parseInt(parentChildren.count) === 0) {
        return res.status(403).json({ message: 'Access denied: Homework not assigned to your children' });
      }
    }

    res.json(hw);
  } catch (error) {
    res.status(500).json({ message: 'Error loading homework details', error: error.message });
  }
});

// Get Homework History (Dynamic PostgreSQL Query Parameters Builder)
router.get('/', authenticate, async (req, res) => {
  const { class_id, section_id, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let homeworks = [];
    let countResult = { count: 0 };

    if (req.user.role === 'admin') {
      // Admin sees everything, filterable
      let whereClause = ' WHERE 1=1';
      const params = [];
      let index = 1;

      if (class_id) {
        whereClause += ` AND h.class_id = $${index++}`;
        params.push(class_id);
      }
      if (section_id) {
        whereClause += ` AND h.section_id = $${index++}`;
        params.push(section_id);
      }

      // Count Query
      let countSql = 'SELECT COUNT(*) as count FROM homework WHERE 1=1';
      const countParams = [];
      let countIdx = 1;
      if (class_id) {
        countSql += ` AND class_id = $${countIdx++}`;
        countParams.push(class_id);
      }
      if (section_id) {
        countSql += ` AND section_id = $${countIdx++}`;
        countParams.push(section_id);
      }
      countResult = await query.get(countSql, countParams);

      let sql = `
        SELECT h.*, c.name as class_name, sec.name as section_name, sub.name as subject_name 
        FROM homework h
        JOIN classes c ON h.class_id = c.id
        JOIN sections sec ON h.section_id = sec.id
        JOIN subjects sub ON h.subject_id = sub.id
        ${whereClause}
        ORDER BY h.due_date DESC, h.created_at DESC 
        LIMIT $${index++} OFFSET $${index++}
      `;
      
      params.push(parseInt(limit), parseInt(offset));
      homeworks = await query.all(sql, params);
    } else if (req.user.role === 'parent') {
      // Parent sees only their child's homework
      const students = await query.all('SELECT class_id, section_id FROM students WHERE parent_id = $1', [req.user.id]);
      if (students.length === 0) {
        return res.json({ homework: [], total: 0, page: parseInt(page), limit: parseInt(limit) });
      }

      // Generate parameters list for SQL
      const classSecFilters = students.map(s => `(h.class_id = ${s.class_id} AND h.section_id = ${s.section_id})`).join(' OR ');

      const countSql = `SELECT COUNT(*) as count FROM homework h WHERE ${classSecFilters}`;
      countResult = await query.get(countSql);

      const sql = `
        SELECT h.*, c.name as class_name, sec.name as section_name, sub.name as subject_name 
        FROM homework h
        JOIN classes c ON h.class_id = c.id
        JOIN sections sec ON h.section_id = sec.id
        JOIN subjects sub ON h.subject_id = sub.id
        WHERE ${classSecFilters}
        ORDER BY h.due_date DESC, h.created_at DESC
        LIMIT $1 OFFSET $2
      `;

      homeworks = await query.all(sql, [parseInt(limit), parseInt(offset)]);
    }

    // Attach files to all homework list items
    for (let hw of homeworks) {
      hw.attachments = await query.all(
        'SELECT id, file_name, file_path, file_size FROM attachments WHERE homework_id = $1',
        [hw.id]
      );
    }

    res.json({
      homework: homeworks,
      total: parseInt(countResult.count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving homework history', error: error.message });
  }
});

export default router;
