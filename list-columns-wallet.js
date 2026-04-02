const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres.elzmopyaubsmjdfxtiqk:BQgA$Thmny2tHPe@54.247.26.119:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to DB');
  try {
    const res1 = await client.query(`SELECT * FROM wallets LIMIT 0`);
    console.log('\nColumns in wallets:');
    res1.fields.forEach(f => console.log(` - ${f.name}`));
  } catch (err) {
    console.error('Error listing columns:', err.message);
  } finally {
    await client.end();
  }
}

run();
