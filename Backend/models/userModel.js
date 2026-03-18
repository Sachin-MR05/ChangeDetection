const db = require('../config/db');

// Create user table if it doesn't exist
const initializeUserTable = async () => {
  const queryText = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await db.query(queryText);
    console.log('User table initialized');
  } catch (err) {
    console.error('Error initializing user table', err);
  }
};

const createUser = async (email, hashedPassword) => {
  const queryText = 'INSERT INTO users(email, password) VALUES($1, $2) RETURNING id, email, created_at';
  const { rows } = await db.query(queryText, [email, hashedPassword]);
  return rows[0];
};

const getUserByEmail = async (email) => {
  const queryText = 'SELECT * FROM users WHERE email = $1';
  const { rows } = await db.query(queryText, [email]);
  return rows[0];
};

module.exports = {
  initializeUserTable,
  createUser,
  getUserByEmail
};
