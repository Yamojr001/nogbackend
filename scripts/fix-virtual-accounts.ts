import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixVirtualAccounts() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'virtual_accounts'
    `);
    const cols = new Set(res.rows.map(r => r.column_name));

    if (!cols.has('organisation_id')) {
      console.log('Adding organisation_id to virtual_accounts...');
      await client.query('ALTER TABLE virtual_accounts ADD COLUMN organisation_id INTEGER REFERENCES organizations(id)');
    }

    if (cols.has('user_id')) {
      console.log('Making user_id nullable in virtual_accounts...');
      await client.query('ALTER TABLE virtual_accounts ALTER COLUMN user_id DROP NOT NULL');
    }

    console.log('Virtual accounts schema updated successfully.');
  } catch (err) {
    console.error('Error updating virtual accounts schema:', err.message);
  } finally {
    await client.end();
  }
}

fixVirtualAccounts();
