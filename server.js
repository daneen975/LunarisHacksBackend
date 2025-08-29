// server.js - Express backend for Lunaris Hacks forms
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

// Create tables if they don't exist
const createTables = async () => {
  try {
    // General Interest Form table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS interest_form (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        university VARCHAR(255),
        year_of_study VARCHAR(100),
        major VARCHAR(255),
        engineering_discipline VARCHAR(255),
        experience_level VARCHAR(100),
        interests TEXT[],
        hackathon_experience VARCHAR(100),
        team_preference VARCHAR(100),
        dietary_restrictions TEXT,
        accessibility_needs TEXT,
        emergency_contact_name VARCHAR(255),
        emergency_contact_phone VARCHAR(20),
        emergency_contact_relationship VARCHAR(100),
        hear_about_us VARCHAR(255),
        additional_info TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sponsorship Form table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sponsorship_form (
        id SERIAL PRIMARY KEY,
        contact_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        company VARCHAR(255) NOT NULL,
        job_title VARCHAR(255),
        phone VARCHAR(20),
        company_size VARCHAR(100),
        industry VARCHAR(255),
        website VARCHAR(500),
        sponsorship_tier VARCHAR(100),
        sponsorship_budget VARCHAR(100),
        primary_goals TEXT[],
        target_audience VARCHAR(255),
        previous_sponsorship VARCHAR(100),
        booth_interest BOOLEAN DEFAULT FALSE,
        workshop_interest BOOLEAN DEFAULT FALSE,
        judging_interest BOOLEAN DEFAULT FALSE,
        networking_interest BOOLEAN DEFAULT FALSE,
        special_requirements TEXT,
        marketing_materials TEXT,
        additional_info TEXT,
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
      phone,
      university,
      yearOfStudy,
      major,
      engineeringDiscipline,
      experienceLevel,
      interests,
      hackathonExperience,
      teamPreference,
      dietaryRestrictions,
      accessibilityNeeds,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelationship,
      hearAboutUs,
      additionalInfo
    } = req.body;

    const query = `
      INSERT INTO interest_form (
        first_name, last_name, email, phone, university, year_of_study,
        major, engineering_discipline, experience_level, interests,
        hackathon_experience, team_preference, dietary_restrictions,
        accessibility_needs, emergency_contact_name, emergency_contact_phone,
        emergency_contact_relationship, hear_about_us, additional_info
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id
    `;

    const values = [
      firstName, lastName, email, phone, university, yearOfStudy,
      major, engineeringDiscipline, experienceLevel, interests,
      hackathonExperience, teamPreference, dietaryRestrictions,
      accessibilityNeeds, emergencyContactName, emergencyContactPhone,
      emergencyContactRelationship, hearAboutUs, additionalInfo
    ];

    const result = await pool.query(query, values);

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

// Submit sponsorship form
app.post('/api/sponsorship-form', async (req, res) => {
  try {
    const {
      contactName,
      email,
      company,
      jobTitle,
      phone,
      companySize,
      industry,
      website,
      sponsorshipTier,
      sponsorshipBudget,
      primaryGoals,
      targetAudience,
      previousSponsorship,
      boothInterest,
      workshopInterest,
      judgingInterest,
      networkingInterest,
      specialRequirements,
      marketingMaterials,
      additionalInfo
    } = req.body;

    const query = `
      INSERT INTO sponsorship_form (
        contact_name, email, company, job_title, phone, company_size,
        industry, website, sponsorship_tier, sponsorship_budget,
        primary_goals, target_audience, previous_sponsorship,
        booth_interest, workshop_interest, judging_interest,
        networking_interest, special_requirements, marketing_materials,
        additional_info
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING id
    `;

    const values = [
      contactName, email, company, jobTitle, phone, companySize,
      industry, website, sponsorshipTier, sponsorshipBudget,
      primaryGoals, targetAudience, previousSponsorship,
      boothInterest, workshopInterest, judgingInterest,
      networkingInterest, specialRequirements, marketingMaterials,
      additionalInfo
    ];

    const result = await pool.query(query, values);

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