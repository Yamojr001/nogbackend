import { DataSource } from 'typeorm';

const myDataSource = new DataSource({
    type: "postgres",
    url: "postgresql://postgres.elzmopyaubsmjdfxtiqk:BQgA$Thmny2tHPe@54.247.26.119:6543/postgres",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await myDataSource.initialize();
    const result = await myDataSource.query(`
        ALTER TABLE "tokens"
        ADD COLUMN IF NOT EXISTS "draftData" jsonb,
        ADD COLUMN IF NOT EXISTS "draftStep" integer DEFAULT 1;
    `);
    console.log("Tokens table altered successfully:", result);
    process.exit(0);
}

run().catch(console.error);

