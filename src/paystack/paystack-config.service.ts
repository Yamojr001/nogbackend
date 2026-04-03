import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '../entities/system-config.entity';
import * as https from 'https';

/**
 * PaystackConfigService
 * ─────────────────────
 * Reads Paystack API keys and settings from the SystemConfig DB table.
 * This means no hard-coded secrets — Super Admin can update them via the
 * admin panel without touching the .env file or redeploying.
 *
 * Required SystemConfig rows (category = 'paystack'):
 *   paystack.secret_key      → sk_test_xxx or sk_live_xxx
 *   paystack.base_url        → https://api.paystack.co  (default)
 *   paystack.preferred_bank  → access-bank  (default)
 *   paystack.enabled         → true / false
 */
@Injectable()
export class PaystackConfigService {
  private readonly logger = new Logger(PaystackConfigService.name);

  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
  ) {}

  private async get(key: string, fallback = ''): Promise<string> {
    try {
      const row = await this.configRepo.findOne({ where: { key } });
      return (row?.value ?? fallback).trim();
    } catch (error) {
      this.logger.warn(`Failed to fetch system config for key "${key}": ${error.message}. Using fallback.`);
      // Fallback: Try a raw query to bypass entity schema if columns are missing
      try {
        const rows = await this.configRepo.query(
          'SELECT value FROM system_config WHERE key = $1 LIMIT 1',
          [key]
        );
        return (rows[0]?.value ?? fallback).trim();
      } catch (innerError) {
        return fallback.trim();
      }
    }
  }

  async getSecretKey(): Promise<string> {
    return this.get('paystack.secret_key', process.env.PAYSTACK_SECRET_KEY ?? '');
  }

  async getBaseUrl(): Promise<string> {
    return this.get('paystack.base_url', process.env.PAYSTACK_BASE_URL ?? 'https://api.paystack.co');
  }

  async getPreferredBank(): Promise<string> {
    return this.get('paystack.preferred_bank', process.env.PAYSTACK_PREFERRED_BANK ?? 'access-bank');
  }

  async isEnabled(): Promise<boolean> {
    const val = await this.get('paystack.enabled', 'false');
    return val === 'true';
  }

  /** Upsert a config value — called from admin controller */
  async set(key: string, value: string, description?: string): Promise<void> {
    let row = await this.configRepo.findOne({ where: { key } });
    if (!row) {
      row = this.configRepo.create({ key, value, category: 'paystack', description });
    } else {
      row.value = value;
      if (description) row.description = description;
    }
    await this.configRepo.save(row);
  }

  /** Low-level HTTP helper — avoids adding axios dependency for a single module */
  async request<T = any>(
    method: 'GET' | 'POST',
    path: string,
    body?: object,
  ): Promise<T> {
    const secretKey = await this.getSecretKey();
    const baseUrl   = await this.getBaseUrl();

    if (!secretKey) {
      throw new Error('Paystack secret key not configured. Go to Admin → Payment Settings to add it.');
    }

    this.logger.debug(`Making Paystack request to ${path} using key ending in ...${secretKey.slice(-4)}`);

    return new Promise((resolve, reject) => {
      const url     = new URL(path, baseUrl);
      const payload = body ? JSON.stringify(body) : undefined;

      const options: https.RequestOptions = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.status === false) {
              reject(new Error(`Paystack error: ${json.message}`));
            } else {
              resolve(json as T);
            }
          } catch {
            reject(new Error(`Invalid JSON from Paystack: ${data}`));
          }
        });
      });

      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }
}
