import { ValueTransformer } from 'typeorm';
import { EncryptionService } from './encryption.service';

export class EncryptionTransformer implements ValueTransformer {
  to(value: string | null): string | null {
    if (!value || !EncryptionService.instance) return value;
    return EncryptionService.instance.encrypt(value);
  }

  from(value: string | null): string | null {
    if (!value || !EncryptionService.instance) return value;
    return EncryptionService.instance.decrypt(value);
  }
}
