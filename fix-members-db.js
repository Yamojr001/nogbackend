const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres.elzmopyaubsmjdfxtiqk:BQgA$Thmny2tHPe@54.247.26.119:6543/postgres",
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to DB');
  try {
    const sql = `
      DO $$ 
      BEGIN 
          -- Required for registration state
          BEGIN ALTER TABLE "members" ADD COLUMN "is_registration_fee_paid" BOOLEAN DEFAULT FALSE; EXCEPTION WHEN duplicate_column THEN END;
          BEGIN ALTER TABLE "members" ADD COLUMN "payment_reference" CHARACTER VARYING; EXCEPTION WHEN duplicate_column THEN END;

          -- Required for wallet functionality
          BEGIN ALTER TABLE "wallets" ADD COLUMN "balance" NUMERIC(15,2) DEFAULT 0; EXCEPTION WHEN duplicate_column THEN END;
      END $$;
    `;
    await client.query(sql);
    console.log('Schema update successful');
  } catch (err) {
    console.error('Error updating schema:', err.message);
  } finally {
    await client.end();
  }
}

run();
