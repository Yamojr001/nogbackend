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

    this.logger.log(`Attempting Monnify login at: ${baseUrl}/api/v1/auth/login`);
    const auth = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
    
    try {
      const axios = require('axios');
      const res = await axios.post(`${baseUrl}/api/v1/auth/login`, {}, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });

      const json = res.data;
      
      if (json.requestSuccessful) {
        this.accessToken = json.responseBody.accessToken;
        this.tokenExpiry = Date.now() + (json.responseBody.expiresIn * 1000) - 60000;
        return this.accessToken!;
      } else {
        this.logger.error(`Monnify Auth Error Response: ${JSON.stringify(json)}`);
        throw new Error(`Monnify Auth Error: ${json.responseMessage}`);
      }
    } catch (err: any) {
      this.logger.error(`Monnify Network Error: ${err.message}`);
      throw err;
    }
  }

  async request<T = any>(method: 'GET' | 'POST', path: string, body?: object): Promise<T> {
    const token = await this.getAccessToken();
    const baseUrl = await this.getBaseUrl();
    const url = new URL(path, baseUrl);
    const axios = require('axios');

    try {
      const res = await axios({
        method,
        url: url.toString(),
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: body,
      });

      return res.data as T;
    } catch (err: any) {
      throw new Error(`Monnify API Error: ${err.message}`);
    }
  }
}
