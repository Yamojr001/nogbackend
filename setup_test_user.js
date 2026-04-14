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
        console.log('Connecting to DB...');
        await client.connect();
        console.log('Connected.');
        
        console.log('Hashing password...');
        const hashedPassword = await bcrypt.hash('Password123!', 10);
        
        const email = 'test_dual_login@example.com';
        const phone = '08123456789';
        
        console.log('Deleting existing test user if any...');
        await client.query('DELETE FROM users WHERE email = $1 OR phone = $2', [email, phone]);
        
        console.log('Inserting test user...');
        await client.query(
            'INSERT INTO users (email, phone, password, role, status, is_verified, name) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [email, phone, hashedPassword, 'member', 'active', true, 'Test Dual Login User']
        );
        
        console.log('Test user created successfully');
    } catch (err) {
        console.error('Error during setup:', err.message);
    } finally {
        console.log('Closing connection...');
        await client.end().catch(e => console.error('Error closing:', e.message));
        console.log('Done.');
    }
}

setup();
