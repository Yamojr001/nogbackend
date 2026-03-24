import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

import { SystemConfig } from './entities/system-config.entity';

async function run() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 5432),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'postgres',
    database: process.env.DB_NAME || 'postgres',
    entities: [SystemConfig],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connected.');

    const repo = dataSource.getRepository(SystemConfig);
    const configs = [
      { key: 'paystack.secret_key', value: '', category: 'paystack', description: 'Paystack Secret Key' },
      { key: 'paystack.public_key', value: '', category: 'paystack', description: 'Paystack Public Key' },
      { key: 'paystack.base_url', value: 'https://api.paystack.co', category: 'paystack', description: 'Paystack API Base URL' },
      { key: 'paystack.preferred_bank', value: 'access-bank', category: 'paystack', description: 'Preferred bank' },
      { key: 'paystack.enabled', value: 'false', category: 'paystack', description: 'Enable/Disable' },
    ];

    for (const c of configs) {
      const exists = await repo.findOne({ where: { key: c.key } });
      if (!exists) {
        await repo.save(repo.create(c));
        console.log(`Created: ${c.key}`);
      } else {
        console.log(`Exists: ${c.key}`);
      }
    }

    console.log('Paystack configuration initialized in database.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await dataSource.destroy();
  }
}

run();
