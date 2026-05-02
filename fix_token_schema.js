const { Client } = require('./node_modules/pg');

const client = new Client({
    user: 'postgres.elzmopyaubsmjdfxtiqk',
    host: '54.247.26.119',
    database: 'postgres',
    password: 'BQgA$Thmny2tHPe',
    port: 6543,
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database.');

        console.log('Adding "draftData" and "draftStep" columns to tokens table...');

        // Use double quotes for camelCase identifiers in Postgres
        await client.query('ALTER TABLE tokens ADD COLUMN IF NOT EXISTS "draftData" jsonb');
        await client.query('ALTER TABLE tokens ADD COLUMN IF NOT EXISTS "draftStep" int DEFAULT 1');

        console.log('Schema fixed successfully.');
    } catch (err) {
        console.error('Failed to fix schema:', err.message);
    } finally {
        await client.end();
    }
}

run();