const db = require('../config/db');

// Create detection_history table if it doesn't exist
const initializeHistoryTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS detection_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      change_percentage DECIMAL(5,2) NOT NULL,
      start_date VARCHAR(20) NOT NULL,
      end_date VARCHAR(20) NOT NULL,
      bounding_box JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await db.query(queryText);
    console.log('Detection history table initialized');
  } catch (err) {
    console.error('Error initializing detection_history table', err);
  }
};

const createHistoryEntry = async (userId, changePercentage, startDate, endDate, boundingBox) => {
  const queryText = `
    INSERT INTO detection_history(user_id, change_percentage, start_date, end_date, bounding_box)
    VALUES($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const { rows } = await db.query(queryText, [
    userId,
    changePercentage,
    startDate,
    endDate,
    JSON.stringify(boundingBox)
  ]);
  return rows[0];
};

const getHistoryByUserId = async (userId) => {
  const queryText = `
    SELECT * FROM detection_history
    WHERE user_id = $1
    ORDER BY created_at DESC
  `;
  const { rows } = await db.query(queryText, [userId]);
  return rows;
};

module.exports = {
  initializeHistoryTable,
  createHistoryEntry,
  getHistoryByUserId
};
