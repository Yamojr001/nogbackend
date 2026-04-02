const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres.elzmopyaubsmjdfxtiqk:BQgA$Thmny2tHPe@54.247.26.119:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to DB');
  try {
    const res1 = await client.query(`SELECT * FROM bank_accounts LIMIT 0`);
    console.log('\nColumns in bank_accounts:');
    res1.fields.forEach(f => console.log(` - ${f.name}`));

    const res2 = await client.query(`SELECT * FROM next_of_kin LIMIT 0`);
    console.log('\nColumns in next_of_kin:');
    res2.fields.forEach(f => console.log(` - ${f.name}`));
  } catch (err) {
    console.error('Error listing columns:', err.message);
  } finally {
    await client.end();
  }
}

run();
