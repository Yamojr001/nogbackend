const { Client } = require('./node_modules/pg');
const bcrypt = require('./node_modules/bcrypt');

async function setup() {
    console.log('Starting setup...');
    const client = new Client({
        user: 'postgres.elzmopyaubsmjdfxtiqk',
        host: '54.247.26.119',
        database: 'postgres',
        password: 'BQgA$Thmny2tHPe',
        port: 6543,
    });

    try {
        await client.connect();
        console.log('Connected.');
        
        console.log('Hashing "Password123!"...');
        const hashedPassword = await bcrypt.hash('Password123!', 10);
        console.log('Hash generated.');
        
        const email = 'ja@g.com';
        const phone = '08123456789';
        
        console.log('Updating user ja@g.com password...');
        await client.query('UPDATE users SET password = $2, phone = $3, status = $4, is_verified = $5 WHERE email = $1', [email, hashedPassword, phone, 'active', true]);
        
        console.log('User password updated successfully');
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end().catch(e => {});
        console.log('Done.');
    }
}

setup();
