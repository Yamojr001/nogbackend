import { TwilioProvider, HttpSmsProvider, SmsproviderNgProvider, SmsProvider } from './sms.providers';

type ProviderConfig = {
  provider: 'twilio' | 'http' | string;
  options: Record<string, any>;
};

export class SmsService {
  private provider: SmsProvider;

  constructor(config?: ProviderConfig) {
    const cfg = config || this.loadFromEnv();

    if (cfg.provider === 'twilio') {
      this.provider = new TwilioProvider({
        accountSid: cfg.options.TWILIO_ACCOUNT_SID,
        authToken: cfg.options.TWILIO_AUTH_TOKEN,
        from: cfg.options.TWILIO_FROM
      });
    } else if (cfg.provider === 'smsprovider.com.ng' || cfg.provider === 'smsprovider') {
      this.provider = new SmsproviderNgProvider({
        endpoint: cfg.options.SMSPROVIDER_ENDPOINT,
        username: cfg.options.SMSPROVIDER_USERNAME,
        password: cfg.options.SMSPROVIDER_PASSWORD,
        senderId: cfg.options.SMSPROVIDER_SENDER_ID
      });
    } else if (cfg.provider === 'http') {
      this.provider = new HttpSmsProvider({
        endpoint: cfg.options.HTTP_ENDPOINT,
        method: cfg.options.HTTP_METHOD || 'POST',
        headers: cfg.options.HTTP_HEADERS,
        payloadTemplate: cfg.options.HTTP_PAYLOAD_TEMPLATE
      });
    } else {
      // Fallback: create a simple HTTP provider from env
      this.provider = new HttpSmsProvider({
        endpoint: cfg.options.HTTP_ENDPOINT || '',
        headers: cfg.options.HTTP_HEADERS
      });
    }
  }

  private loadFromEnv(): ProviderConfig {
    const provider = process.env.SMS_PROVIDER || 'smsprovider.com.ng';

    if (provider === 'twilio') {
      return {
        provider: 'twilio',
        options: {
          TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
          TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
          TWILIO_FROM: process.env.TWILIO_FROM
        }
      };
    }

    if (provider === 'smsprovider.com.ng' || provider === 'smsprovider') {
      return {
        provider: 'smsprovider.com.ng',
        options: {
          SMSPROVIDER_ENDPOINT: process.env.SMSPROVIDER_ENDPOINT || 'https://customer.smsprovider.com.ng/api/',
          SMSPROVIDER_USERNAME: process.env.SMSPROVIDER_USERNAME || '',
          SMSPROVIDER_PASSWORD: process.env.SMSPROVIDER_PASSWORD || '',
          SMSPROVIDER_SENDER_ID: process.env.SMSPROVIDER_SENDER_ID || 'NOGALSS'
        }
      };
    }

    // generic http provider
    return {
      provider: 'http',
      options: {
        HTTP_ENDPOINT: process.env.SMS_HTTP_ENDPOINT,
        HTTP_METHOD: (process.env.SMS_HTTP_METHOD as any) || 'POST',
        HTTP_HEADERS: process.env.SMS_HTTP_HEADERS
          ? JSON.parse(process.env.SMS_HTTP_HEADERS)
          : undefined,
        // optional: evaluate payload template in code if provided
        HTTP_PAYLOAD_TEMPLATE: undefined
      }
    };
  }

  async sendSMS(to: string, message: string, opts?: any) {
    if (!this.provider) throw new Error('No SMS provider configured');
    return this.provider.send(to, message, opts);
  }
}

// Usage example (backend):
// const sms = new SmsService();
// await sms.sendSMS('+2348012345678', 'Your OTP is 123456');
