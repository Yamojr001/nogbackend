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
        const tokens = ['T3O41RMCRSOJBMR7ZIQY3IAAMJH6VIGZ8LS0U80F', 'AO5O44UV4BWMC5XUL9TCSZPEAP05152GJ8HV7G8S'];
        const res = await client.query('SELECT * FROM tokens WHERE token IN ($1, $2)', tokens);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
