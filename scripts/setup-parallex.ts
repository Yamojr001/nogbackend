import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';

dotenv.config({ path: path.join(__dirname, '../.env') });

const PARALLEX_BASE_URL = process.env.PARALLEX_BASE_URL || 'https://parallex-apim.developer.azure-api.net';
const PARALLEX_API_KEY = process.env.PARALLEX_PRIMARY_KEY || process.env.PARALLEX_API_KEY;
const WEBHOOK_URL = process.env.PARALLEX_WEBHOOK_URL;
const TRANSACTION_PASSWORD = process.env.PARALLEX_TRANSACTION_PASSWORD;

async function setupParallex() {
  if (!PARALLEX_API_KEY) {
    console.error('PARALLEX_API_KEY is not set in .env');
    return;
  }

  const client = axios.create({
    baseURL: PARALLEX_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': PARALLEX_API_KEY,
    },
  });

  // 1. Register Webhook
  if (WEBHOOK_URL) {
    console.log(`Registering Webhook URL: ${WEBHOOK_URL}...`);
    try {
      const res = await client.post('/virtualaccount/VirtualAccount/v1/VirtualAccount/AddWebHookURL', {
        callBackURL: WEBHOOK_URL,
        webHookType: 'INFLOW',
      });
      console.log('Webhook Response:', res.data);
    } catch (err) {
      console.error('Webhook Registration Error:', err.response?.data || err.message);
    }
  } else {
    console.warn('PARALLEX_WEBHOOK_URL not set, skipping webhook registration.');
  }

  // 2. Enable Outflow
  if (TRANSACTION_PASSWORD) {
    console.log('Enabling Outflow Processing...');
    try {
      const res = await client.post('/virtualaccount/VirtualAccount/v1/VirtualAccount/EnableOutflowProcessing', {
        enableOutFlow: true,
        transactionPassword: Buffer.from(TRANSACTION_PASSWORD).toString('base64'),
      });
      console.log('Outflow Response:', res.data);
    } catch (err) {
      console.error('Outflow Enablement Error:', err.response?.data || err.message);
    }
  } else {
    console.warn('PARALLEX_TRANSACTION_PASSWORD not set, skipping outflow enablement.');
  }

  console.log('Setup process complete.');
}

setupParallex();
