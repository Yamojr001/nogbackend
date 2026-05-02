import axios from 'axios';

export interface SmsProvider {
  send(to: string, message: string, opts?: any): Promise<any>;
}

function normalizeMobiles(to: string | string[]): string {
  const values = Array.isArray(to) ? to : String(to || '').split(',');
  return values
    .map((value) => String(value).trim())
    .filter(Boolean)
    .map((value) => {
      const digits = value.replace(/[^0-9]/g, '');
      if (!digits) return '';
      if (digits.startsWith('234')) return digits;
      if (digits.startsWith('0') && digits.length === 11) return `234${digits.slice(1)}`;
      return digits;
    })
    .filter(Boolean)
    .join(',');
}

export class TwilioProvider implements SmsProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(opts: { accountSid: string; authToken: string; from: string }) {
    this.accountSid = opts.accountSid;
    this.authToken = opts.authToken;
    this.fromNumber = opts.from;
  }

  async send(to: string, message: string) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const params = new URLSearchParams();
    params.append('To', to);
    params.append('From', this.fromNumber);
    params.append('Body', message);

    const auth = {
      username: this.accountSid,
      password: this.authToken
    };

    const response = await axios.post(url, params.toString(), {
      auth,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    return response.data;
  }
}

export class HttpSmsProvider implements SmsProvider {
  private endpoint: string;
  private method: 'POST' | 'PUT' | 'GET';
  private headers: Record<string, string>;
  private payloadTemplate?: (to: string, message: string) => any;

  constructor(opts: {
    endpoint: string;
    method?: 'POST' | 'PUT' | 'GET';
    headers?: Record<string, string>;
    payloadTemplate?: (to: string, message: string) => any;
  }) {
    this.endpoint = opts.endpoint;
    this.method = opts.method || 'POST';
    this.headers = opts.headers || { 'Content-Type': 'application/json' };
    this.payloadTemplate = opts.payloadTemplate;
  }

  async send(to: string, message: string) {
    const payload = this.payloadTemplate
      ? this.payloadTemplate(to, message)
      : { to, message };

    const response = await axios.request({
      url: this.endpoint,
      method: this.method,
      headers: this.headers,
      data: payload
    });

    return response.data;
  }
}

export class SmsproviderNgProvider implements SmsProvider {
  private endpoint: string;
  private username: string;
  private password: string;
  private senderId: string;

  constructor(opts: { endpoint: string; username?: string; password?: string; senderId?: string }) {
    this.endpoint = opts.endpoint || 'https://customer.smsprovider.com.ng/api/';
    this.username = opts.username || '';
    this.password = opts.password || '';
    this.senderId = opts.senderId || 'NOGALSS';
  }

  async send(to: string, message: string, opts?: any) {
    const mobiles = normalizeMobiles(to);
    if (!this.username || !this.password) {
      throw new Error('smsprovider.com.ng configuration missing: username or password not set');
    }

    const params = new URLSearchParams();
    params.set('username', opts?.username || this.username);
    params.set('password', opts?.password || this.password);
    params.set('message', message);
    params.set('sender', opts?.sender || this.senderId);
    params.set('mobiles', mobiles);

    if (opts?.type) params.set('type', opts.type);
    if (opts?.action) params.set('action', opts.action);
    if (opts?.url) params.set('url', opts.url);

    const response = await axios.request({
      url: this.endpoint,
      method: opts?.method || 'GET',
      params: opts?.method === 'POST' ? undefined : Object.fromEntries(params.entries()),
      data: opts?.method === 'POST' ? Object.fromEntries(params.entries()) : undefined,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data;
  }
}

// Example: additional providers (e.g., Parallex SMS) can implement SmsProvider
