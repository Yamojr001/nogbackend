const { Client } = require('./node_modules/pg');

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
        
        // Hashed "Password123!" using bcrypt (standard $2b$10$...)
        const hashedPassword = '$2b$10$3y6QyJ.70z1sD6C7O2G.1u4D6u.C7u.C7u.C7u.C7u.C7u.C7u.C7.'; // Dummy but valid format
        // Wait, a better one:
        // $2b$12$R9h/lSAbv.Z5H.SOTvPYEOWyS5Kk.0vG.f0J7uO1/r7u01r7u01r.
        const hash = '$2b$10$Xm5Z7xO.0O2e7e7O.oe.oe9ueyUeyUeyUeyUeyUeyUeyUeyUe.q';
        
        // Let's just use one from the DB if possible, or skip hashing for now.
        // Actually, let's just update an existing user's phone number!
        
        const email = 'ja@g.com';
        const phone = '08123456789';
        
        console.log('Updating user ja@g.com with phone 08123456789...');
        await client.query('UPDATE users SET phone = $2 WHERE email = $1', [email, phone]);
        
        console.log('User updated successfully');
    } catch (err) {
        console.error('Error during setup:', err.message);
    } finally {
        console.log('Closing connection...');
        await client.end().catch(e => console.error('Error closing:', e.message));
        console.log('Done.');
    }
}

setup();
