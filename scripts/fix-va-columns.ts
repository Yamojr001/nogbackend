import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixColumns() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    console.log('Adding missing columns to virtual_accounts...');
    
    // Add parallex_account_id
    await client.query(`
      ALTER TABLE virtual_accounts 
      ADD COLUMN IF NOT EXISTS parallex_account_id VARCHAR(255)
    `);
    console.log('- Added parallex_account_id');

    // Add raw_parallex_response
    await client.query(`
      ALTER TABLE virtual_accounts 
      ADD COLUMN IF NOT EXISTS raw_parallex_response JSONB
    `);
    console.log('- Added raw_parallex_response');

    // Add gateway
    await client.query(`
      ALTER TABLE virtual_accounts 
      ADD COLUMN IF NOT EXISTS gateway VARCHAR(50) DEFAULT 'paystack'
    `);
    console.log('- Added gateway');

    console.log('Database schema updated successfully.');

  } catch (err) {
    console.error('Error updating schema:', err.message);
  } finally {
    await client.end();
  }
}

fixColumns();
