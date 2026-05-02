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
        const res = await client.query("SELECT count(*) FROM members");
        console.log('Member count: ' + res.rows[0].count);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
