const { Client } = require('./node_modules/pg');
const client = new Client({
    user: 'postgres.elzmopyaubsmjdfxtiqk',
    host: '54.247.26.119',
    database: 'postgres',
    password: 'BQgA$Thmny2tHPe',
    port: 6543,
});

async function test() {
    try {
        await client.connect();
        const res = await client.query('SELECT email, phone FROM users WHERE phone IS NOT NULL LIMIT 5;');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error during DB query:', err.message);
    } finally {
        await client.end();
    }
}

test();
