import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from '../entities/system-config.entity';
import * as https from 'https';

@Injectable()
export class MonnifyConfigService {
  private readonly logger = new Logger(MonnifyConfigService.name);
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  constructor(
    @InjectRepository(SystemConfig)
    private readonly configRepo: Repository<SystemConfig>,
  ) {}

  private async get(key: string, fallback = ''): Promise<string> {
    const row = await this.configRepo.findOne({ where: { key } });
    return (row?.value ?? fallback).trim();
  }

  async getApiKey(): Promise<string> {
    return this.get('monnify.api_key', process.env.MONNIFY_API_KEY ?? '');
  }

  async getSecretKey(): Promise<string> {
    return this.get('monnify.secret_key', process.env.MONNIFY_SECRET_KEY ?? '');
  }

  async getContractCode(): Promise<string> {
    return this.get('monnify.contract_code', process.env.MONNIFY_CONTRACT_CODE ?? '');
  }

  async getBaseUrl(): Promise<string> {
    return this.get('monnify.base_url', process.env.MONNIFY_BASE_URL ?? 'https://api.monnify.com');
  }

  async isEnabled(): Promise<boolean> {
    const val = await this.get('monnify.enabled', 'true');
    return val === 'true';
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const apiKey = await this.getApiKey();
    const secretKey = await this.getSecretKey();
    const baseUrl = await this.getBaseUrl();

    if (!apiKey || !secretKey) {
      throw new Error('Monnify configuration missing: API Key or Secret Key not found in DB or .env');
    }

    return new Promise((resolve, reject) => {
      this.logger.log(`Attempting Monnify login at: ${baseUrl}/api/v1/auth/login`);
      const auth = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
      const options: https.RequestOptions = {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
        },
        timeout: 10000, // 10s timeout
      };

      const req = https.request(`${baseUrl}/api/v1/auth/login`, options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 400) {
              this.logger.error(`Monnify Auth HTTP Error ${res.statusCode}: ${data}`);
              return reject(new Error(`Monnify HTTP Error ${res.statusCode}`));
            }
            const json = JSON.parse(data);
            if (json.requestSuccessful) {
              this.accessToken = json.responseBody.accessToken;
              this.tokenExpiry = Date.now() + (json.responseBody.expiresIn * 1000) - 60000;
              resolve(this.accessToken!);
            } else {
              this.logger.error(`Monnify Auth Error Response: ${data}`);
              reject(new Error(`Monnify Auth Error: ${json.responseMessage}`));
            }
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Monnify Auth Timeout (ETIMEDOUT)'));
      });
      req.on('error', (err) => {
        this.logger.error(`Monnify Network Error: ${err.message}`);
        reject(err);
      });
      req.end();
    });
  }

  async request<T = any>(method: 'GET' | 'POST', path: string, body?: object): Promise<T> {
    const token = await this.getAccessToken();
    const baseUrl = await this.getBaseUrl();

    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const payload = body ? JSON.stringify(body) : undefined;

      const options: https.RequestOptions = {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: {
          Authorization: `Bearer ${token}`,
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
            resolve(json as T);
          } catch {
            reject(new Error(`Invalid JSON from Monnify: ${data}`));
          }
        });
      });

      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }
}
