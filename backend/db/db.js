import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'school.db');
export let db = new sqlite3.Database(dbPath);

// Enable foreign key support
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON;');
});

export function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function openDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) return reject(err);
      db.run('PRAGMA foreign_keys = ON;', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

// Helper functions wrapping sqlite3 in Promises
export const query = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  exec(sql) {
    return new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
};

// Database Schema Initialization
export async function initDb() {
  // Check if upgrade is needed (e.g., payments table does not exist)
  try {
    const tableCheck = await query.get(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='payments'"
    );
    if (!tableCheck) {
      console.log('Upgraded schema detected. Dropping old tables to recreate with fee ledger...');
      await query.exec('DROP TABLE IF EXISTS attachments;');
      await query.exec('DROP TABLE IF EXISTS homework;');
      await query.exec('DROP TABLE IF EXISTS students;');
      await query.exec('DROP TABLE IF EXISTS subjects;');
      await query.exec('DROP TABLE IF EXISTS sections;');
      await query.exec('DROP TABLE IF EXISTS classes;');
      await query.exec('DROP TABLE IF EXISTS parents;');
      await query.exec('DROP TABLE IF EXISTS admins;');
      await query.exec('DROP TABLE IF EXISTS notices;');
      await query.exec('DROP TABLE IF EXISTS school_info;');
      await query.exec('DROP TABLE IF EXISTS activity_logs;');
      await query.exec('DROP TABLE IF EXISTS expenses;');
    }
  } catch (err) {
    console.error('Error verifying database migrations state:', err);
  }

  const schema = `
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      day_scholar_fee REAL NOT NULL DEFAULT 0,
      hostel_student_fee REAL NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      class_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
      UNIQUE(name, class_id)
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      class_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
      UNIQUE(name, class_id)
    );

    CREATE TABLE IF NOT EXISTS parents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      roll_number TEXT NOT NULL,
      class_id INTEGER NOT NULL,
      section_id INTEGER NOT NULL,
      parent_id INTEGER,
      type TEXT CHECK(type IN ('Day Scholar', 'Hostel Student')) NOT NULL DEFAULT 'Day Scholar',
      fee_amount REAL NOT NULL DEFAULT 0,
      concession REAL NOT NULL DEFAULT 0,
      fee_after_concession REAL NOT NULL DEFAULT 0,
      remaining_balance REAL NOT NULL DEFAULT 0,
      payment_status TEXT CHECK(payment_status IN ('Pending', 'Paid')) NOT NULL DEFAULT 'Pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE RESTRICT,
      FOREIGN KEY(section_id) REFERENCES sections(id) ON DELETE RESTRICT,
      FOREIGN KEY(parent_id) REFERENCES parents(id) ON DELETE SET NULL,
      UNIQUE(roll_number, class_id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL,
      amount REAL NOT NULL,
      date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS homework (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      section_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      due_date DATE NOT NULL,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY(section_id) REFERENCES sections(id) ON DELETE CASCADE,
      FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES admins(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      homework_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(homework_id) REFERENCES homework(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      audience TEXT CHECK(audience IN ('all', 'parents', 'admins')) NOT NULL DEFAULT 'all',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS school_info (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL DEFAULT 'New Millennium School',
      address TEXT,
      phone TEXT,
      email TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_type TEXT CHECK(user_type IN ('admin', 'parent')) NOT NULL,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_students_parent ON students(parent_id);
    CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
    CREATE INDEX IF NOT EXISTS idx_homework_class_section ON homework(class_id, section_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_time ON activity_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
  `;

  await query.exec(schema);

  // Seed default admin if none exists
  const adminCount = await query.get('SELECT COUNT(*) as count FROM admins');
  if (adminCount.count === 0) {
    const defaultPassword = 'admin123';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(defaultPassword, salt);
    await query.run(
      'INSERT INTO admins (username, email, password_hash) VALUES (?, ?, ?)',
      ['admin', 'admin@school.com', hash]
    );
    console.log(`Default admin seeded. User: admin, Password: ${defaultPassword}`);
  }

  // Seed default school info if none exists
  const infoCount = await query.get('SELECT COUNT(*) as count FROM school_info');
  if (infoCount.count === 0) {
    await query.run(
      'INSERT INTO school_info (id, name, address, phone, email) VALUES (1, ?, ?, ?, ?)',
      ['New Millennium School', '123 Education Lane, Springfield', '555-0199', 'info@millennium.edu']
    );
  } else {
    // If it exists, update it to the new rebranded name
    await query.run('UPDATE school_info SET name = ? WHERE id = 1', ['New Millennium School']);
  }

  // Seed starting classes if they don't exist
  const classCount = await query.get('SELECT COUNT(*) as count FROM classes');
  if (classCount.count === 0) {
    const baseClasses = [
      { name: 'Nursery', day: 4000, hostel: 8000 },
      { name: 'LKG', day: 4500, hostel: 9000 },
      { name: 'UKG', day: 4500, hostel: 9000 },
      { name: 'Class 1', day: 5000, hostel: 10000 },
      { name: 'Class 2', day: 5000, hostel: 10000 },
      { name: 'Class 3', day: 5500, hostel: 11000 },
      { name: 'Class 4', day: 5500, hostel: 11000 },
      { name: 'Class 5', day: 6000, hostel: 12000 },
      { name: 'Class 6', day: 6500, hostel: 13000 },
      { name: 'Class 7', day: 7000, hostel: 14000 },
      { name: 'Class 8', day: 7500, hostel: 15000 },
      { name: 'Class 9', day: 8000, hostel: 16000 },
      { name: 'Class 10', day: 9000, hostel: 18000 }
    ];
    for (const item of baseClasses) {
      const classResult = await query.run(
        'INSERT INTO classes (name, day_scholar_fee, hostel_student_fee) VALUES (?, ?, ?)',
        [item.name, item.day, item.hostel]
      );
      // For each class, seed sections A and B
      await query.run('INSERT INTO sections (name, class_id) VALUES (?, ?)', ['A', classResult.id]);
      await query.run('INSERT INTO sections (name, class_id) VALUES (?, ?)', ['B', classResult.id]);
      // Seed default subjects
      await query.run('INSERT INTO subjects (name, class_id) VALUES (?, ?)', ['English', classResult.id]);
      await query.run('INSERT INTO subjects (name, class_id) VALUES (?, ?)', ['Mathematics', classResult.id]);
      await query.run('INSERT INTO subjects (name, class_id) VALUES (?, ?)', ['Science', classResult.id]);
    }
    console.log('Seeded standard starting classes (with fees), sections, and subjects.');
  }
}

export default db;
