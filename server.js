// server.js - Express backend for Lunaris Hacks forms (Complete with Database Fix)
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Create tables if they don't exist (WITH FIX FOR SPONSORSHIP TABLE)
const createTables = async () => {
  try {
    // Drop the old sponsorship table and recreate it with correct structure
    await pool.query(`DROP TABLE IF EXISTS sponsorship_form`);
    
    // General Interest Form table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS interest_form (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        program VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sponsorship Form table (with correct columns matching frontend)
    await pool.query(`
      CREATE TABLE sponsorship_form (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables created successfully');
  } catch (err) {
    console.error('Error creating tables:', err);
  }
};

// Initialize database
createTables();

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Lunaris Hacks API is running' });
});

// Submit interest form
app.post('/api/interest-form', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      program
    } = req.body;

    console.log('Received interest form data:', { firstName, lastName, email, program });

    // Validate required fields
    if (!firstName || !lastName || !email || !program) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const query = `
      INSERT INTO interest_form (first_name, last_name, email, program)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;

    const values = [firstName, lastName, email, program];

    const result = await pool.query(query, values);

    console.log('Interest form saved successfully with ID:', result.rows[0].id);

    res.status(201).json({
      success: true,
      message: 'Interest form submitted successfully!',
      id: result.rows[0].id
    });

  } catch (error) {
    console.error('Error submitting interest form:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Email already registered. Please use a different email.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error submitting form. Please try again later.'
    });
  }
});

// Submit sponsorship form (FIXED - matches frontend exactly)
app.post('/api/sponsorship-form', async (req, res) => {
  try {
    const {
      name,
      email,
      phoneNumber,
      comment
    } = req.body;

    console.log('Received sponsorship form data:', { name, email, phoneNumber, comment });

    // Validate required fields
    if (!name || !email || !phoneNumber || !comment) {
      console.log('Validation failed - missing fields');
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    const query = `
      INSERT INTO sponsorship_form (name, email, phone_number, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;

    const values = [name, email, phoneNumber, comment];

    const result = await pool.query(query, values);

    console.log('Sponsorship form saved successfully with ID:', result.rows[0].id);

    res.status(201).json({
      success: true,
      message: 'Sponsorship form submitted successfully!',
      id: result.rows[0].id
    });

  } catch (error) {
    console.error('Error submitting sponsorship form:', error);

    res.status(500).json({
      success: false,
      message: 'Error submitting form. Please try again later.'
    });
  }
});

// Get all interest form submissions (admin route)
app.get('/api/admin/interest-forms', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM interest_form ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching interest forms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all sponsorship form submissions (admin route)
app.get('/api/admin/sponsorship-forms', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM sponsorship_form ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sponsorship forms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
