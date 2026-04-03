const { Client } = require('pg');
require('dotenv').config();

async function fixConfig() {
  const client = new Client({
    host: '54.247.26.119',
    port: 6543,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false },
  });

  const correctSecretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!correctSecretKey) {
    console.error('PAYSTACK_SECRET_KEY not found in .env');
    return;
  }

  try {
    await client.connect();
    console.log('Updating paystack.secret_key in system_config...');
    const res = await client.query(
      "UPDATE system_config SET value = $1 WHERE key = 'paystack.secret_key'",
      [correctSecretKey]
    );
    console.log(`Update result: ${res.rowCount} row(s) updated.`);
    
    // Also ensure paystack.enabled is true since we want to test it
    await client.query(
      "UPDATE system_config SET value = 'true' WHERE key = 'paystack.enabled'"
    );
    console.log('Ensure paystack.enabled is true.');

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

fixConfig();
