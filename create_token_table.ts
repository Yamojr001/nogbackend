import { DataSource } from 'typeorm';

const myDataSource = new DataSource({
    type: "postgres",
    url: "postgresql://postgres.elzmopyaubsmjdfxtiqk:BQgA$Thmny2tHPe@54.247.26.119:6543/postgres",
    ssl: { rejectUnauthorized: false }
});

async function run() {
    await myDataSource.initialize();
    const result = await myDataSource.query(`
        SELECT pg_get_constraintdef(c.oid) AS constraint_def
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'members' AND c.conname = 'members_status_check';
    `);
    console.log("Constraint definition:", result);
    process.exit(0);
}

run().catch(console.error);

