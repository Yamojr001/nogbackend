import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class ParallexConfigService {
  private readonly logger = new Logger(ParallexConfigService.name);
  private axiosInstance: AxiosInstance;

  constructor() {
    this.initializeAxios();
  }

  private initializeAxios() {
    const baseURL = process.env.PARALLEX_BASE_URL || 'https://parallex-apim.developer.azure-api.net';
    const apiKey =
      process.env.PARALLEX_PRIMARY_KEY ||
      process.env.PARALLEX_API_KEY ||
      process.env.PARALLEX_SECONDARY_KEY;

    this.axiosInstance = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'Ocp-Apim-Subscription-Key': apiKey }),
      },
      timeout: 30000,
    });
  }

  /**
   * Make HTTP request to Parallex API
   */
  async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any,
    headers?: Record<string, string>,
  ): Promise<{ data: T; status: number }> {
    try {
      const config: any = { headers };
      const response = await this.axiosInstance({
        method,
        url: endpoint,
        data,
        ...config,
      });

      return { data: response.data, status: response.status };
    } catch (err) {
      this.logger.error(`Parallex API request failed [${method} ${endpoint}]: ${err.message}`);
      throw err;
    }
  }

  /**
   * Check if Parallex is enabled
   */
  async isEnabled(): Promise<boolean> {
    const enabled = process.env.PARALLEX_ENABLED === 'true';
    if (!enabled) {
      this.logger.warn('Parallex payment gateway is disabled (set PARALLEX_ENABLED=true)');
    }
    return enabled;
  }

  /**
   * Get Parallex API Key
   */
  getApiKey(): string {
    return (
      process.env.PARALLEX_PRIMARY_KEY ||
      process.env.PARALLEX_API_KEY ||
      process.env.PARALLEX_SECONDARY_KEY ||
      ''
    );
  }

  getPrimaryKey(): string {
    return process.env.PARALLEX_PRIMARY_KEY || process.env.PARALLEX_API_KEY || '';
  }

  getSecondaryKey(): string {
    return process.env.PARALLEX_SECONDARY_KEY || '';
  }

  /**
   * Get Parallex Base URL
   */
  getBaseUrl(): string {
    return process.env.PARALLEX_BASE_URL || 'https://parallex-apim.developer.azure-api.net';
  }
}
