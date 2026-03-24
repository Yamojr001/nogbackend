import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'postgres',
  url: process.env.DATABASE_URL,
});

async function fix() {
  await AppDataSource.initialize();
  console.log('Connected to DB');

  const hash = await bcrypt.hash('password123', 10);
  
  const result = await AppDataSource.query(
    'UPDATE "user" SET password = $1 WHERE email IN ($2, $3, $4)',
    [hash, 'admin@nogalss.org', 'member@example.com', 'partner@example.com']
  );
  
  console.log('Fixed passwords:', result);
  await AppDataSource.destroy();
}

fix().catch(console.error);
