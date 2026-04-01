const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres.elzmopyaubsmjdfxtiqk:BQgA$Thmny2tHPe@54.247.26.119:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to DB');
  try {
    const resOrg = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'organizations'`);
    console.log('Columns in organizations:');
    resOrg.rows.forEach(row => console.log(` - ${row.column_name} (${row.data_type})`));
    
    const resTour = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_tours'`);
    console.log('\nColumns in user_tours:');
    resTour.rows.forEach(row => console.log(` - ${row.column_name} (${row.data_type})`));
  } catch (err) {
    console.error('Error listing columns:', err.message);
  } finally {
    await client.end();
  }
}

run();
