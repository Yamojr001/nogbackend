const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres.elzmopyaubsmjdfxtiqk:BQgA$Thmny2tHPe@54.247.26.119:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to DB');
  try {
    const tableRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log('\nTables in DB:');
    tableRes.rows.forEach(r => console.log(` - ${r.table_name}`));

    if (!tableRes.rows.some(r => r.table_name === 'system_config')) {
      console.log('Creating system_config table...');
      await client.query(`
        CREATE TABLE system_config (
          id SERIAL PRIMARY KEY,
          key VARCHAR(255) UNIQUE NOT NULL,
          value TEXT NOT NULL,
          description TEXT,
          category VARCHAR(255) DEFAULT 'apex',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('system_config table created.');
      
      console.log('Seeding system_config table...');
      await client.query(`
        INSERT INTO system_config (key, value, category, description) VALUES
        ('paystack.secret_key', 'sk_test_e23e2a7ed39152666e6712d33c6128d6b9b45e55', 'paystack', 'Paystack Secret Key'),
        ('paystack.public_key', 'pk_test_e23e2a7ed39152666e6712d33c6128d6b9b45e55', 'paystack', 'Paystack Public Key'),
        ('paystack.enabled', 'true', 'paystack', 'Enable/Disable Paystack integration'),
        ('paystack.base_url', 'https://api.paystack.co', 'paystack', 'Paystack API Base URL'),
        ('paystack.preferred_bank', 'access-bank', 'paystack', 'Preferred bank for dedicated virtual accounts')
      `);
      console.log('system_config table seeded.');
    }

  } catch (err) {
    console.error('Error listing tables:', err.message);
  } finally {
    await client.end();
  }
}

run();
