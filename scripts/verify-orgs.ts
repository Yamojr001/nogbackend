import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function verifyOrgs() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('--- Testing Organisation Query Speed ---');
    const start = Date.now();
    const res = await client.query('SELECT * FROM organizations');
    const end = Date.now();
    console.log(`Found ${res.rows.length} organisations in ${end - start}ms`);
    
    if (res.rows.length > 0) {
      console.log('Sample Org:', {
        id: res.rows[0].id,
        name: res.rows[0].name,
        email: res.rows[0].email // Verify this column exists
      });
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

verifyOrgs();
