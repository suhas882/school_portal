import pg from 'pg';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1')
    ? { rejectUnauthorized: false }
    : false
});

export async function closeDatabase() {
  // Stub for PostgreSQL connection lifecycle mapping
  return Promise.resolve();
}

export async function openDatabase() {
  // Stub for PostgreSQL connection lifecycle mapping
  return Promise.resolve();
}

// Promisified query helper interface matching SQLite structure
export const query = {
  async run(sql, params = []) {
    const client = await pool.connect();
    try {
      const res = await client.query(sql, params);
      const firstRow = res.rows && res.rows[0];
      return {
        id: firstRow && firstRow.id !== undefined ? firstRow.id : null,
        changes: res.rowCount,
        rows: res.rows
      };
    } finally {
      client.release();
    }
  },
  async get(sql, params = []) {
    const client = await pool.connect();
    try {
      const res = await client.query(sql, params);
      return res.rows[0] || null;
    } finally {
      client.release();
    }
  },
  async all(sql, params = []) {
    const client = await pool.connect();
    try {
      const res = await client.query(sql, params);
      return res.rows;
    } finally {
      client.release();
    }
  },
  async exec(sql) {
    const client = await pool.connect();
    try {
      await client.query(sql);
    } finally {
      client.release();
    }
  }
};

// Database Schema Initialization
export async function initDb() {
  // Safe migrations check: check if payments table exists in Postgres public schema
  try {
    const tableCheck = await query.get(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='payments'"
    );
    if (!tableCheck) {
      console.log('PostgreSQL schema initializing...');
    }
  } catch (err) {
    console.error('Error verifying database migrations state:', err);
  }

  const schema = `
    CREATE TABLE IF NOT EXISTS classes (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      day_scholar_fee DOUBLE PRECISION NOT NULL DEFAULT 0,
      hostel_student_fee DOUBLE PRECISION NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sections (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      class_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
      UNIQUE(name, class_id)
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      class_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
      UNIQUE(name, class_id)
    );

    CREATE TABLE IF NOT EXISTS parents (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      phone VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      roll_number VARCHAR(255) NOT NULL,
      class_id INTEGER NOT NULL,
      section_id INTEGER NOT NULL,
      parent_id INTEGER,
      type VARCHAR(50) CHECK(type IN ('Day Scholar', 'Hostel Student')) NOT NULL DEFAULT 'Day Scholar',
      fee_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
      concession DOUBLE PRECISION NOT NULL DEFAULT 0,
      fee_after_concession DOUBLE PRECISION NOT NULL DEFAULT 0,
      remaining_balance DOUBLE PRECISION NOT NULL DEFAULT 0,
      payment_status VARCHAR(50) CHECK(payment_status IN ('Pending', 'Paid')) NOT NULL DEFAULT 'Pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE RESTRICT,
      FOREIGN KEY(section_id) REFERENCES sections(id) ON DELETE RESTRICT,
      FOREIGN KEY(parent_id) REFERENCES parents(id) ON DELETE SET NULL,
      UNIQUE(roll_number, class_id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      student_id INTEGER NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      item_name VARCHAR(255) NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS homework (
      id SERIAL PRIMARY KEY,
      class_id INTEGER NOT NULL,
      section_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      due_date DATE NOT NULL,
      created_by INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY(section_id) REFERENCES sections(id) ON DELETE CASCADE,
      FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY(created_by) REFERENCES admins(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id SERIAL PRIMARY KEY,
      homework_id INTEGER NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_type VARCHAR(255),
      file_size INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(homework_id) REFERENCES homework(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notices (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      audience VARCHAR(50) CHECK(audience IN ('all', 'parents', 'admins')) NOT NULL DEFAULT 'all',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS school_info (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name VARCHAR(255) NOT NULL DEFAULT 'New Millennium School',
      address VARCHAR(500),
      phone VARCHAR(50),
      email VARCHAR(255),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      user_type VARCHAR(50) CHECK(user_type IN ('admin', 'parent')) NOT NULL,
      user_id INTEGER NOT NULL,
      action VARCHAR(255) NOT NULL,
      details TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await query.exec(schema);

  // Seed default admin if none exists
  const adminCount = await query.get('SELECT COUNT(*) as count FROM admins');
  if (parseInt(adminCount.count) === 0) {
    const defaultPassword = 'admin123';
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(defaultPassword, salt);
    await query.run(
      'INSERT INTO admins (username, email, password_hash) VALUES ($1, $2, $3)',
      ['admin', 'admin@school.com', hash]
    );
    console.log(`Default admin seeded. User: admin, Password: ${defaultPassword}`);
  }

  // Seed default school info if none exists
  const infoCount = await query.get('SELECT COUNT(*) as count FROM school_info');
  if (parseInt(infoCount.count) === 0) {
    await query.run(
      'INSERT INTO school_info (id, name, address, phone, email) VALUES (1, $1, $2, $3, $4)',
      ['New Millennium School', '123 Education Lane, Springfield', '555-0199', 'info@millennium.edu']
    );
  } else {
    await query.run('UPDATE school_info SET name = $1 WHERE id = 1', ['New Millennium School']);
  }

  // Seed starting classes if they don't exist
  const classCount = await query.get('SELECT COUNT(*) as count FROM classes');
  if (parseInt(classCount.count) === 0) {
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
        'INSERT INTO classes (name, day_scholar_fee, hostel_student_fee) VALUES ($1, $2, $3) RETURNING id',
        [item.name, item.day, item.hostel]
      );
      const classId = classResult.id;
      // For each class, seed sections A and B
      await query.run('INSERT INTO sections (name, class_id) VALUES ($1, $2)', ['A', classId]);
      await query.run('INSERT INTO sections (name, class_id) VALUES ($1, $2)', ['B', classId]);
      // Seed default subjects
      await query.run('INSERT INTO subjects (name, class_id) VALUES ($1, $2)', ['English', classId]);
      await query.run('INSERT INTO subjects (name, class_id) VALUES ($1, $2)', ['Mathematics', classId]);
      await query.run('INSERT INTO subjects (name, class_id) VALUES ($1, $2)', ['Science', classId]);
    }
    console.log('Seeded standard starting classes (with fees), sections, and subjects.');
  }
}

export default pool;
