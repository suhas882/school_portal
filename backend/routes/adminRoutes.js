import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/db.js';
import { authenticate, authorizeRole } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

const router = express.Router();

// Enforce admin permission for all routes here
router.use(authenticate, authorizeRole(['admin']));

// ==========================================
// DASHBOARD STATS
// ==========================================
router.get('/stats', async (req, res) => {
  try {
    const studentCount = await query.get('SELECT COUNT(*) as count FROM students');
    const parentCount = await query.get('SELECT COUNT(*) as count FROM parents');
    const classCount = await query.get('SELECT COUNT(*) as count FROM classes');
    
    // Homework today (matching YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    const homeworkCount = await query.get(
      'SELECT COUNT(*) as count FROM homework WHERE DATE(created_at) = $1',
      [today]
    );

    // Financial summaries
    const incomeResult = await query.get('SELECT SUM(amount) as total FROM payments');
    const expenseResult = await query.get('SELECT SUM(amount) as total FROM expenses');
    
    const totalIncome = parseFloat(incomeResult.total) || 0;
    const totalExpenses = parseFloat(expenseResult.total) || 0;
    const netBalance = totalIncome - totalExpenses;

    // Recent activities (last 10 entries)
    const recentActivities = await query.all(
      'SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 10'
    );

    res.json({
      totalStudents: parseInt(studentCount.count),
      totalParents: parseInt(parentCount.count),
      totalClasses: parseInt(classCount.count),
      homeworkToday: homeworkCount ? parseInt(homeworkCount.count) : 0,
      totalIncome,
      totalExpenses,
      netBalance,
      recentActivities
    });
  } catch (error) {
    res.status(500).json({ message: 'Error loading statistics', error: error.message });
  }
});

// ==========================================
// CLASSES & SECTIONS & SUBJECTS & FEES
// ==========================================

// --- Classes ---
router.get('/classes', async (req, res) => {
  try {
    const classes = await query.all('SELECT * FROM classes ORDER BY name');
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: 'Error loading classes', error: error.message });
  }
});

router.post('/classes', async (req, res) => {
  const { name, day_scholar_fee, hostel_student_fee } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: 'Class name is required' });

  const dayFee = parseFloat(day_scholar_fee) || 0;
  const hostelFee = parseFloat(hostel_student_fee) || 0;

  try {
    const result = await query.run(
      'INSERT INTO classes (name, day_scholar_fee, hostel_student_fee) VALUES ($1, $2, $3) RETURNING id',
      [name.trim(), dayFee, hostelFee]
    );
    await logActivity('admin', req.user.id, 'Create Class', `Created class ${name} with day scholar fee: ₹${dayFee}, hostel fee: ₹${hostelFee}`);
    res.status(201).json({ id: result.id, name, day_scholar_fee: dayFee, hostel_student_fee: hostelFee });
  } catch (error) {
    if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
      return res.status(400).json({ message: 'Class name already exists' });
    }
    res.status(500).json({ message: 'Error creating class', error: error.message });
  }
});

router.put('/classes/:id', async (req, res) => {
  const { name, day_scholar_fee, hostel_student_fee } = req.body;
  const { id } = req.params;
  if (!name || !name.trim()) return res.status(400).json({ message: 'Class name is required' });

  const dayFee = parseFloat(day_scholar_fee) || 0;
  const hostelFee = parseFloat(hostel_student_fee) || 0;

  try {
    const oldClass = await query.get('SELECT name FROM classes WHERE id = $1', [id]);
    await query.run(
      'UPDATE classes SET name = $1, day_scholar_fee = $2, hostel_student_fee = $3 WHERE id = $4',
      [name.trim(), dayFee, hostelFee, id]
    );

    // Sync fees for all students currently registered under this class
    // 1. Sync Day Scholars
    const dayScholars = await query.all('SELECT id, concession FROM students WHERE class_id = $1 AND type = \'Day Scholar\'', [id]);
    for (const student of dayScholars) {
      const paymentsSum = await query.get('SELECT SUM(amount) as total FROM payments WHERE student_id = $1', [student.id]);
      const paid = parseFloat(paymentsSum.total) || 0;
      const feeAfter = dayFee - student.concession;
      const remaining = Math.max(0, feeAfter - paid);
      const status = remaining <= 0 ? 'Paid' : 'Pending';
      await query.run(
        'UPDATE students SET fee_amount = $1, fee_after_concession = $2, remaining_balance = $3, payment_status = $4 WHERE id = $5',
        [dayFee, feeAfter, remaining, status, student.id]
      );
    }
    // 2. Sync Hostel Students
    const hostelStudents = await query.all('SELECT id, concession FROM students WHERE class_id = $1 AND type = \'Hostel Student\'', [id]);
    for (const student of hostelStudents) {
      const paymentsSum = await query.get('SELECT SUM(amount) as total FROM payments WHERE student_id = $1', [student.id]);
      const paid = parseFloat(paymentsSum.total) || 0;
      const feeAfter = hostelFee - student.concession;
      const remaining = Math.max(0, feeAfter - paid);
      const status = remaining <= 0 ? 'Paid' : 'Pending';
      await query.run(
        'UPDATE students SET fee_amount = $1, fee_after_concession = $2, remaining_balance = $3, payment_status = $4 WHERE id = $5',
        [hostelFee, feeAfter, remaining, status, student.id]
      );
    }

    await logActivity('admin', req.user.id, 'Update Class', `Updated class ${oldClass ? oldClass.name : id} name and billing fees`);
    res.json({ message: 'Class and student balances synchronized successfully' });
  } catch (error) {
    if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
      return res.status(400).json({ message: 'Class name already exists' });
    }
    res.status(500).json({ message: 'Error updating class', error: error.message });
  }
});

// Update Class Fees Only
router.put('/classes/:id/fees', async (req, res) => {
  const { id } = req.params;
  const { day_scholar_fee, hostel_student_fee } = req.body;

  const dayFee = parseFloat(day_scholar_fee) || 0;
  const hostelFee = parseFloat(hostel_student_fee) || 0;

  if (dayFee < 0 || hostelFee < 0) {
    return res.status(400).json({ message: 'Fees cannot be negative values' });
  }

  try {
    await query.run(
      'UPDATE classes SET day_scholar_fee = $1, hostel_student_fee = $2 WHERE id = $3',
      [dayFee, hostelFee, id]
    );

    // Sync student records
    const dayScholars = await query.all('SELECT id, concession FROM students WHERE class_id = $1 AND type = \'Day Scholar\'', [id]);
    for (const student of dayScholars) {
      const paymentsSum = await query.get('SELECT SUM(amount) as total FROM payments WHERE student_id = $1', [student.id]);
      const paid = parseFloat(paymentsSum.total) || 0;
      const feeAfter = dayFee - student.concession;
      const remaining = Math.max(0, feeAfter - paid);
      const status = remaining <= 0 ? 'Paid' : 'Pending';
      await query.run(
        'UPDATE students SET fee_amount = $1, fee_after_concession = $2, remaining_balance = $3, payment_status = $4 WHERE id = $5',
        [dayFee, feeAfter, remaining, status, student.id]
      );
    }

    const hostelStudents = await query.all('SELECT id, concession FROM students WHERE class_id = $1 AND type = \'Hostel Student\'', [id]);
    for (const student of hostelStudents) {
      const paymentsSum = await query.get('SELECT SUM(amount) as total FROM payments WHERE student_id = $1', [student.id]);
      const paid = parseFloat(paymentsSum.total) || 0;
      const feeAfter = hostelFee - student.concession;
      const remaining = Math.max(0, feeAfter - paid);
      const status = remaining <= 0 ? 'Paid' : 'Pending';
      await query.run(
        'UPDATE students SET fee_amount = $1, fee_after_concession = $2, remaining_balance = $3, payment_status = $4 WHERE id = $5',
        [hostelFee, feeAfter, remaining, status, student.id]
      );
    }

    const cls = await query.get('SELECT name FROM classes WHERE id = $1', [id]);
    await logActivity('admin', req.user.id, 'Update Class Fees', `Updated tuition keys for ${cls ? cls.name : id}`);
    res.json({ message: 'Tuition fees updated and student balances re-calculated.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update class fees', error: error.message });
  }
});

router.delete('/classes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const oldClass = await query.get('SELECT name FROM classes WHERE id = $1', [id]);
    // Check if students are using it
    const activeStudents = await query.get('SELECT COUNT(*) as count FROM students WHERE class_id = $1', [id]);
    if (parseInt(activeStudents.count) > 0) {
      return res.status(400).json({ message: 'Cannot delete class with enrolled students' });
    }

    await query.run('DELETE FROM classes WHERE id = $1', [id]);
    await logActivity('admin', req.user.id, 'Delete Class', `Deleted class ${oldClass ? oldClass.name : id}`);
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting class', error: error.message });
  }
});

// --- Sections ---
router.get('/sections', async (req, res) => {
  try {
    const sections = await query.all(
      `SELECT s.*, c.name as class_name FROM sections s 
       JOIN classes c ON s.class_id = c.id 
       ORDER BY c.name, s.name`
    );
    res.json(sections);
  } catch (error) {
    res.status(500).json({ message: 'Error loading sections', error: error.message });
  }
});

router.get('/sections/by-class/:class_id', async (req, res) => {
  try {
    const sections = await query.all('SELECT * FROM sections WHERE class_id = $1 ORDER BY name', [req.params.class_id]);
    res.json(sections);
  } catch (error) {
    res.status(500).json({ message: 'Error loading class sections', error: error.message });
  }
});

router.post('/sections', async (req, res) => {
  const { name, class_id } = req.body;
  if (!name || !name.trim() || !class_id) {
    return res.status(400).json({ message: 'Section name and class selection are required' });
  }

  try {
    const result = await query.run('INSERT INTO sections (name, class_id) VALUES ($1, $2) RETURNING id', [name.trim().toUpperCase(), class_id]);
    const cls = await query.get('SELECT name FROM classes WHERE id = $1', [class_id]);
    await logActivity('admin', req.user.id, 'Create Section', `Created section ${name} for ${cls ? cls.name : class_id}`);
    res.status(201).json({ id: result.id, name, class_id });
  } catch (error) {
    if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
      return res.status(400).json({ message: 'Section name already exists in this class' });
    }
    res.status(500).json({ message: 'Error creating section', error: error.message });
  }
});

router.delete('/sections/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const sec = await query.get('SELECT * FROM sections WHERE id = $1', [id]);
    if (!sec) return res.status(404).json({ message: 'Section not found' });

    const activeStudents = await query.get('SELECT COUNT(*) as count FROM students WHERE section_id = $1', [id]);
    if (parseInt(activeStudents.count) > 0) {
      return res.status(400).json({ message: 'Cannot delete section containing students' });
    }

    await query.run('DELETE FROM sections WHERE id = $1', [id]);
    const cls = await query.get('SELECT name FROM classes WHERE id = $1', [sec.class_id]);
    await logActivity('admin', req.user.id, 'Delete Section', `Deleted section ${sec.name} from ${cls ? cls.name : sec.class_id}`);
    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting section', error: error.message });
  }
});

// --- Subjects ---
router.get('/subjects', async (req, res) => {
  try {
    const subjects = await query.all(
      `SELECT s.*, c.name as class_name FROM subjects s 
       JOIN classes c ON s.class_id = c.id 
       ORDER BY c.name, s.name`
    );
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Error loading subjects', error: error.message });
  }
});

router.get('/subjects/by-class/:class_id', async (req, res) => {
  try {
    const subjects = await query.all('SELECT * FROM subjects WHERE class_id = $1 ORDER BY name', [req.params.class_id]);
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Error loading subjects for class', error: error.message });
  }
});

router.post('/subjects', async (req, res) => {
  const { name, class_id } = req.body;
  if (!name || !name.trim() || !class_id) {
    return res.status(400).json({ message: 'Subject name and class are required' });
  }

  try {
    const result = await query.run('INSERT INTO subjects (name, class_id) VALUES ($1, $2) RETURNING id', [name.trim(), class_id]);
    const cls = await query.get('SELECT name FROM classes WHERE id = $1', [class_id]);
    await logActivity('admin', req.user.id, 'Create Subject', `Created subject ${name} for class ${cls ? cls.name : class_id}`);
    res.status(201).json({ id: result.id, name, class_id });
  } catch (error) {
    if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
      return res.status(400).json({ message: 'Subject already exists in this class' });
    }
    res.status(500).json({ message: 'Error creating subject', error: error.message });
  }
});

router.delete('/subjects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const sub = await query.get('SELECT * FROM subjects WHERE id = $1', [id]);
    if (!sub) return res.status(404).json({ message: 'Subject not found' });

    await query.run('DELETE FROM subjects WHERE id = $1', [id]);
    const cls = await query.get('SELECT name FROM classes WHERE id = $1', [sub.class_id]);
    await logActivity('admin', req.user.id, 'Delete Subject', `Deleted subject ${sub.name} from class ${cls ? cls.name : sub.class_id}`);
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting subject', error: error.message });
  }
});

// ==========================================
// STUDENTS
// ==========================================
router.get('/students', async (req, res) => {
  const { search, class_id, section_id, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  let querySql = `
    SELECT s.*, c.name as class_name, sec.name as section_name, p.username as parent_name, p.email as parent_email 
    FROM students s
    JOIN classes c ON s.class_id = c.id
    JOIN sections sec ON s.section_id = sec.id
    LEFT JOIN parents p ON s.parent_id = p.id
    WHERE 1=1
  `;
  const params = [];
  let index = 1;

  if (search && search.trim()) {
    querySql += ` AND (s.name ILIKE $${index} OR s.roll_number ILIKE $${index})`;
    params.push(`%${search.trim()}%`);
    index++;
  }

  if (class_id) {
    querySql += ` AND s.class_id = $${index++}`;
    params.push(class_id);
  }

  if (section_id) {
    querySql += ` AND s.section_id = $${index++}`;
    params.push(section_id);
  }

  let countSql = `SELECT COUNT(*) as count FROM students s WHERE 1=1`;
  const countParams = [];
  let countIdx = 1;
  if (search && search.trim()) {
    countSql += ` AND (s.name ILIKE $${countIdx} OR s.roll_number ILIKE $${countIdx})`;
    countParams.push(`%${search.trim()}%`);
    countIdx++;
  }
  if (class_id) {
    countSql += ` AND s.class_id = $${countIdx++}`;
    countParams.push(class_id);
  }
  if (section_id) {
    countSql += ` AND s.section_id = $${countIdx++}`;
    countParams.push(section_id);
  }

  try {
    const totalCount = await query.get(countSql, countParams);
    
    querySql += ` ORDER BY c.name, sec.name, s.name LIMIT $${index++} OFFSET $${index++}`;
    params.push(parseInt(limit), parseInt(offset));

    const students = await query.all(querySql, params);

    res.json({
      students,
      total: parseInt(totalCount.count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error loading students', error: error.message });
  }
});

router.post('/students', async (req, res) => {
  const { name, roll_number, class_id, section_id, parent_id, type, concession } = req.body;

  if (!name || !name.trim() || !roll_number || !class_id || !section_id) {
    return res.status(400).json({ message: 'Name, roll number, class, and section are required' });
  }

  const studentType = type || 'Day Scholar';
  const parsedConcession = parseFloat(concession) || 0;

  try {
    // Fetch base fee from class definition
    const classData = await query.get('SELECT day_scholar_fee, hostel_student_fee FROM classes WHERE id = $1', [class_id]);
    if (!classData) return res.status(404).json({ message: 'Selected class does not exist' });

    const baseFee = studentType === 'Day Scholar' ? classData.day_scholar_fee : classData.hostel_student_fee;
    if (parsedConcession > baseFee) {
      return res.status(400).json({ message: `Concession cannot exceed base tuition fee of ₹${baseFee}` });
    }

    const feeAfter = baseFee - parsedConcession;
    const remaining = feeAfter;
    const status = remaining <= 0 ? 'Paid' : 'Pending';

    const result = await query.run(
      `INSERT INTO students (name, roll_number, class_id, section_id, parent_id, type, fee_amount, concession, fee_after_concession, remaining_balance, payment_status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [name.trim(), roll_number.trim(), class_id, section_id, parent_id || null, studentType, baseFee, parsedConcession, feeAfter, remaining, status]
    );

    await logActivity('admin', req.user.id, 'Create Student', `Enrolled student ${name} with roll no ${roll_number}`);
    res.status(201).json({ id: result.id, name, roll_number, class_id, section_id, parent_id, type: studentType, remaining_balance: remaining });
  } catch (error) {
    if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
      return res.status(400).json({ message: 'Roll number already exists in this class' });
    }
    res.status(500).json({ message: 'Error creating student', error: error.message });
  }
});

router.put('/students/:id', async (req, res) => {
  const { name, roll_number, class_id, section_id, parent_id, type, concession } = req.body;
  const { id } = req.params;

  if (!name || !name.trim() || !roll_number || !class_id || !section_id) {
    return res.status(400).json({ message: 'Name, roll number, class, and section are required' });
  }

  const studentType = type || 'Day Scholar';
  const parsedConcession = parseFloat(concession) || 0;

  try {
    const classData = await query.get('SELECT day_scholar_fee, hostel_student_fee FROM classes WHERE id = $1', [class_id]);
    if (!classData) return res.status(404).json({ message: 'Selected class does not exist' });

    const baseFee = studentType === 'Day Scholar' ? classData.day_scholar_fee : classData.hostel_student_fee;
    if (parsedConcession > baseFee) {
      return res.status(400).json({ message: `Concession cannot exceed base tuition fee of ₹${baseFee}` });
    }

    const feeAfter = baseFee - parsedConcession;

    // Fetch existing payments sum to calculate remaining balance accurately
    const paymentsSum = await query.get('SELECT SUM(amount) as total FROM payments WHERE student_id = $1', [id]);
    const paid = parseFloat(paymentsSum.total) || 0;
    const remaining = Math.max(0, feeAfter - paid);
    const status = remaining <= 0 ? 'Paid' : 'Pending';

    await query.run(
      `UPDATE students 
       SET name = $1, roll_number = $2, class_id = $3, section_id = $4, parent_id = $5, type = $6, fee_amount = $7, concession = $8, fee_after_concession = $9, remaining_balance = $10, payment_status = $11 
       WHERE id = $12`,
      [name.trim(), roll_number.trim(), class_id, section_id, parent_id || null, studentType, baseFee, parsedConcession, feeAfter, remaining, status, id]
    );

    await logActivity('admin', req.user.id, 'Update Student', `Updated details for student ${name} (ID: ${id})`);
    res.json({ message: 'Student details updated and ledger balances synchronized.' });
  } catch (error) {
    if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
      return res.status(400).json({ message: 'Roll number already exists in this class' });
    }
    res.status(500).json({ message: 'Error updating student', error: error.message });
  }
});

router.delete('/students/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const student = await query.get('SELECT name FROM students WHERE id = $1', [id]);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    await query.run('DELETE FROM students WHERE id = $1', [id]);
    await logActivity('admin', req.user.id, 'Delete Student', `Removed student ${student.name} (ID: ${id})`);
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting student', error: error.message });
  }
});

// ==========================================
// STUDENT PAYMENTS
// ==========================================
router.get('/students/:id/payments', async (req, res) => {
  try {
    const payments = await query.all('SELECT * FROM payments WHERE student_id = $1 ORDER BY date DESC, created_at DESC', [req.params.id]);
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve payment history', error: error.message });
  }
});

router.post('/students/:id/payments', async (req, res) => {
  const { id } = req.params;
  const { amount, date } = req.body;

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ message: 'Valid payment amount is required' });
  }
  if (!date) return res.status(400).json({ message: 'Payment date is required' });

  try {
    const student = await query.get('SELECT name, remaining_balance, fee_after_concession FROM students WHERE id = $1', [id]);
    if (!student) return res.status(404).json({ message: 'Student profile not found' });

    const studentBalance = parseFloat(student.remaining_balance) || 0;
    if (parsedAmount > studentBalance) {
      return res.status(400).json({ message: `Payment exceeds student's remaining balance of ₹${studentBalance}` });
    }

    // Insert payment record with RETURNING id for PostgreSQL
    const result = await query.run('INSERT INTO payments (student_id, amount, date) VALUES ($1, $2, $3) RETURNING id', [id, parsedAmount, date]);

    // Recalculate student balance
    const nextBalance = Math.max(0, studentBalance - parsedAmount);
    const status = nextBalance <= 0 ? 'Paid' : 'Pending';

    await query.run(
      'UPDATE students SET remaining_balance = $1, payment_status = $2 WHERE id = $3',
      [nextBalance, status, id]
    );

    await logActivity('admin', req.user.id, 'Record Payment', `Recorded payment of ₹${parsedAmount} for student ${student.name}`);
    res.status(201).json({ id: result.id, amount: parsedAmount, date, remainingBalance: nextBalance, paymentStatus: status });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save payment record', error: error.message });
  }
});

// ==========================================
// SCHOOL EXPENSES
// ==========================================
router.get('/expenses', async (req, res) => {
  try {
    const expenses = await query.all('SELECT * FROM expenses ORDER BY date DESC, created_at DESC');
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve expenses', error: error.message });
  }
});

router.post('/expenses', async (req, res) => {
  const { item_name, amount, date } = req.body;
  
  if (!item_name || !item_name.trim()) return res.status(400).json({ message: 'Expenditure item name is required' });
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    return res.status(400).json({ message: 'Valid expenditure cost is required' });
  }
  if (!date) return res.status(400).json({ message: 'Date of transaction is required' });

  try {
    const result = await query.run(
      'INSERT INTO expenses (item_name, amount, date) VALUES ($1, $2, $3) RETURNING id',
      [item_name.trim(), parsedAmount, date]
    );

    await logActivity('admin', req.user.id, 'Record Expense', `Added expenditure: ${item_name} for ₹${parsedAmount}`);
    res.status(201).json({ id: result.id, item_name, amount: parsedAmount, date });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save expense log', error: error.message });
  }
});

router.delete('/expenses/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const exp = await query.get('SELECT item_name, amount FROM expenses WHERE id = $1', [id]);
    if (!exp) return res.status(404).json({ message: 'Expense record not found' });

    await query.run('DELETE FROM expenses WHERE id = $1', [id]);
    await logActivity('admin', req.user.id, 'Delete Expense', `Deleted expense: ${exp.item_name} (₹${exp.amount})`);
    res.json({ message: 'Expense log deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete expense log', error: error.message });
  }
});

// ==========================================
// PARENT ACCOUNTS
// ==========================================
router.get('/parents', async (req, res) => {
  const { search } = req.query;
  let sql = 'SELECT id, username, email, phone, created_at FROM parents';
  const params = [];

  if (search && search.trim()) {
    sql += ' WHERE username ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1';
    params.push(`%${search.trim()}%`);
  }
  sql += ' ORDER BY username';

  try {
    const parents = await query.all(sql, params);
    
    for (let parent of parents) {
      parent.children = await query.all(
        `SELECT s.id, s.name, s.class_id, s.section_id, s.type, s.fee_amount, s.concession, s.fee_after_concession, s.remaining_balance, s.payment_status, c.name as class_name, sec.name as section_name 
         FROM students s
         JOIN classes c ON s.class_id = c.id
         JOIN sections sec ON s.section_id = sec.id
         WHERE s.parent_id = $1`,
        [parent.id]
      );
    }

    res.json(parents);
  } catch (error) {
    res.status(500).json({ message: 'Error loading parents', error: error.message });
  }
});

router.post('/parents', async (req, res) => {
  const { username, email, password, phone } = req.body;
  if (!username || !username.trim() || !email || !email.trim() || !password) {
    return res.status(400).json({ message: 'Username, email, and password are required' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const result = await query.run(
      'INSERT INTO parents (username, email, password_hash, phone) VALUES ($1, $2, $3, $4) RETURNING id',
      [username.trim().toLowerCase(), email.trim().toLowerCase(), hash, phone || null]
    );

    await logActivity('admin', req.user.id, 'Create Parent Account', `Created parent account for ${username}`);
    res.status(201).json({ id: result.id, username, email, phone });
  } catch (error) {
    if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
      return res.status(400).json({ message: 'Username or Email already registered' });
    }
    res.status(500).json({ message: 'Error creating parent account', error: error.message });
  }
});

router.put('/parents/:id', async (req, res) => {
  const { username, email, phone } = req.body;
  const { id } = req.params;

  if (!username || !username.trim() || !email || !email.trim()) {
    return res.status(400).json({ message: 'Username and email are required' });
  }

  try {
    await query.run(
      'UPDATE parents SET username = $1, email = $2, phone = $3 WHERE id = $4',
      [username.trim().toLowerCase(), email.trim().toLowerCase(), phone || null, id]
    );

    await logActivity('admin', req.user.id, 'Update Parent Account', `Updated parent account ID: ${id}`);
    res.json({ message: 'Parent details updated successfully' });
  } catch (error) {
    if (error.message.includes('unique') || error.message.includes('UNIQUE')) {
      return res.status(400).json({ message: 'Username or Email already in use' });
    }
    res.status(500).json({ message: 'Error updating parent details', error: error.message });
  }
});

router.delete('/parents/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const parent = await query.get('SELECT username FROM parents WHERE id = $1', [id]);
    if (!parent) return res.status(404).json({ message: 'Parent not found' });

    await query.run('UPDATE students SET parent_id = NULL WHERE parent_id = $1', [id]);
    await query.run('DELETE FROM parents WHERE id = $1', [id]);

    await logActivity('admin', req.user.id, 'Delete Parent Account', `Deleted parent account ${parent.username}`);
    res.json({ message: 'Parent account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting parent account', error: error.message });
  }
});

router.post('/parents/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ message: 'New password must be at least 4 characters' });
  }

  try {
    const parent = await query.get('SELECT username FROM parents WHERE id = $1', [id]);
    if (!parent) return res.status(404).json({ message: 'Parent account not found' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    await query.run('UPDATE parents SET password_hash = $1 WHERE id = $2', [hash, id]);
    await logActivity('admin', req.user.id, 'Reset Parent Password', `Reset password for parent: ${parent.username}`);

    res.json({ message: `Password for parent '${parent.username}' reset successfully.` });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting parent password', error: error.message });
  }
});

// ==========================================
// NOTICES & ANNOUNCEMENTS
// ==========================================
router.get('/notices', async (req, res) => {
  try {
    const notices = await query.all('SELECT * FROM notices ORDER BY created_at DESC');
    res.json(notices);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notices', error: error.message });
  }
});

router.post('/notices', async (req, res) => {
  const { title, content, audience } = req.body;
  if (!title || !content || !audience) {
    return res.status(400).json({ message: 'Title, content, and audience are required' });
  }

  try {
    const result = await query.run(
      'INSERT INTO notices (title, content, audience) VALUES ($1, $2, $3) RETURNING id',
      [title.trim(), content.trim(), audience]
    );

    await logActivity('admin', req.user.id, 'Create Notice', `Created notice: ${title} for ${audience}`);
    res.status(201).json({ id: result.id, title, content, audience });
  } catch (error) {
    res.status(500).json({ message: 'Error creating notice', error: error.message });
  }
});

router.put('/notices/:id', async (req, res) => {
  const { title, content, audience } = req.body;
  const { id } = req.params;

  if (!title || !content || !audience) {
    return res.status(400).json({ message: 'Title, content, and audience are required' });
  }

  try {
    await query.run(
      'UPDATE notices SET title = $1, content = $2, audience = $3 WHERE id = $4',
      [title.trim(), content.trim(), audience, id]
    );
    await logActivity('admin', req.user.id, 'Update Notice', `Updated notice ID: ${id}`);
    res.json({ message: 'Notice updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notice', error: error.message });
  }
});

router.delete('/notices/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query.run('DELETE FROM notices WHERE id = $1', [id]);
    await logActivity('admin', req.user.id, 'Delete Notice', `Deleted notice ID: ${id}`);
    res.json({ message: 'Notice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notice', error: error.message });
  }
});

// ==========================================
// SCHOOL INFO
// ==========================================
router.get('/school-info', async (req, res) => {
  try {
    const info = await query.get('SELECT * FROM school_info WHERE id = 1');
    res.json(info);
  } catch (error) {
    res.status(500).json({ message: 'Error loading school information', error: error.message });
  }
});

router.put('/school-info', async (req, res) => {
  const { name, address, phone, email } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'School name is required' });
  }

  try {
    await query.run(
      'UPDATE school_info SET name = $1, address = $2, phone = $3, email = $4, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [name.trim(), address || null, phone || null, email || null]
    );

    await logActivity('admin', req.user.id, 'Update School Info', `Updated school details`);
    res.json({ message: 'School information updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating school info', error: error.message });
  }
});

// ==========================================
// ACTIVITY LOGS
// ==========================================
router.get('/activity-logs', async (req, res) => {
  try {
    const logs = await query.all('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 500');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching activity logs', error: error.message });
  }
});

export default router;
