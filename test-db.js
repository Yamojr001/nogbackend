const { Client } = require('pg');
require('dotenv').config();

async function checkSeed() {
  const dbName = process.env.DB_NAME || 'postgres';
  const client = new Client({
    host: '54.247.26.119',
    port: 6543,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: dbName,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    
    console.log('--- USERS ---');
    const resUsers = await client.query('SELECT name, email, role FROM users LIMIT 5'); 
    resUsers.rows.forEach(u => console.log(`- ${u.name} (${u.role})`));

    console.log('--- CONFIGS ---');
    const resConfigs = await client.query("SELECT key, value FROM system_config WHERE key LIKE 'paystack.%'");
    resConfigs.rows.forEach(c => console.log(`- ${c.key}: ${c.value}`));
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkSeed();
