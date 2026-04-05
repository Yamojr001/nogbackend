import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function auditPerformance() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('--- Row Counts ---');
    const orgCount = await client.query('SELECT count(*) FROM organizations');
    console.log(`organizations: ${orgCount.rows[0].count}`);
    
    const bankCount = await client.query('SELECT count(*) FROM banks');
    console.log(`banks: ${bankCount.rows[0].count}`);

    const userCount = await client.query('SELECT count(*) FROM users');
    console.log(`users: ${userCount.rows[0].count}`);

    console.log('\n--- Active Queries (> 5s) ---');
    const slowQueries = await client.query(`
      SELECT pid, now() - query_start AS duration, query, state
      FROM pg_stat_activity
      WHERE state != 'idle' AND now() - query_start > interval '5 seconds'
    `);
    console.table(slowQueries.rows);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

auditPerformance();
