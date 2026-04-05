import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function fixSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully.');

    // 1. Fix members table
    console.log('Checking "members" table columns...');
    const memberCols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'members'
    `);
    const existingMemberCols = new Set(memberCols.rows.map(r => r.column_name));

    if (!existingMemberCols.has('is_registration_fee_paid')) {
      console.log('Adding "is_registration_fee_paid" to "members"...');
      await client.query('ALTER TABLE members ADD COLUMN is_registration_fee_paid BOOLEAN DEFAULT FALSE');
    }
    if (!existingMemberCols.has('payment_reference')) {
      console.log('Adding "payment_reference" to "members"...');
      await client.query('ALTER TABLE members ADD COLUMN payment_reference VARCHAR(255)');
    }

    // 2. Fix organizations table
    console.log('Checking "organizations" table columns...');
    const orgCols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'organizations'
    `);
    const existingOrgCols = new Set(orgCols.rows.map(r => r.column_name));

    if (!existingOrgCols.has('parent_id')) {
      console.log('Adding "parent_id" to "organizations"...');
      await client.query('ALTER TABLE organizations ADD COLUMN parent_id INTEGER REFERENCES organizations(id)');
    }
    if (!existingOrgCols.has('email')) {
      console.log('Adding "email" to "organizations"...');
      await client.query('ALTER TABLE organizations ADD COLUMN email VARCHAR(255)');
    }
    if (!existingOrgCols.has('phone')) {
      console.log('Adding "phone" to "organizations"...');
      await client.query('ALTER TABLE organizations ADD COLUMN phone VARCHAR(255)');
    }
    if (!existingOrgCols.has('acronym')) {
      console.log('Adding "acronym" to "organizations"...');
      await client.query('ALTER TABLE organizations ADD COLUMN acronym VARCHAR(255)');
    }
    if (!existingOrgCols.has('sector')) {
      console.log('Adding "sector" to "organizations"...');
      await client.query('ALTER TABLE organizations ADD COLUMN sector VARCHAR(255)');
    }
    if (!existingOrgCols.has('registration_number')) {
      console.log('Adding "registration_number" to "organizations"...');
      await client.query('ALTER TABLE organizations ADD COLUMN registration_number VARCHAR(255)');
    }

    // 3. Fix members table again for good measure
    if (!existingMemberCols.has('is_registration_fee_paid')) {
      console.log('Adding "is_registration_fee_paid" to "members"...');
      await client.query('ALTER TABLE members ADD COLUMN is_registration_fee_paid BOOLEAN DEFAULT FALSE');
    }
    if (!existingMemberCols.has('payment_reference')) {
      console.log('Adding "payment_reference" to "members"...');
      await client.query('ALTER TABLE members ADD COLUMN payment_reference VARCHAR(255)');
    }

    console.log('Schema fix completed successfully.');
  } catch (err) {
    console.error('Fatal error during schema fix:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixSchema();
