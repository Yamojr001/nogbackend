import { Client } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Database connected');

    const res = await client.query(`
      SELECT table_schema, table_name, column_name 
      FROM information_schema.columns 
      WHERE table_name = 'members' AND column_name = 'address'
    `);
    console.log('Members tables with address column:', res.rows);

    const res2 = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name = 'members'
    `);
    console.log('All members tables:', res2.rows);

    await client.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

run();
