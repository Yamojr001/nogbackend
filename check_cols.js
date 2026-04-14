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
        const tables = ['program_applications', 'kyc_documents', 'kyc_records', 'members', 'member_profiles', 'wallets', 'approvals', 'audit_logs', 'notifications'];
        for (const table of tables) {
            const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`);
            console.log(`Table: ${table}`);
            console.log(JSON.stringify(res.rows.map(r => r.column_name), null, 2));
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
