import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const requiredVars = [
  'PARALLEX_BASE_URL',
  'PARALLEX_PRIMARY_KEY',
  'PARALLEX_SECONDARY_KEY',
  'PARALLEX_ENABLED',
  'PARALLEX_USERNAME',
  'PARALLEX_PASSWORD',
  'PARALLEX_TRANSACTION_PIN',
  'PARALLEX_TRANSACTION_PASSWORD',
  'PARALLEX_WEBHOOK_URL',
];

function verifyEnv() {
  console.log('Verifying Parallex Environment Variables...');
  let missing = 0;

  requiredVars.forEach(v => {
    const val = process.env[v];
    if (!val || val.trim() === '') {
      console.warn(`[MISSING] ${v}`);
      missing++;
    } else {
      console.log(`[OK] ${v}`);
    }
  });

  if (missing === 0) {
    console.log('All required Parallex variables are set.');
  } else {
    console.error(`${missing} variables are missing or empty.`);
  }
}

verifyEnv();
