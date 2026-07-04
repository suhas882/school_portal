import { query } from '../db/db.js';

export async function logActivity(userType, userId, action, details = '') {
  try {
    await query.run(
      'INSERT INTO activity_logs (user_type, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [userType, userId, action, details]
    );
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
