import { z } from 'zod';

export const ContactPreferenceSchema = z.object({
  method: z.enum(['email', 'sms', 'whatsapp', 'phone', 'in_person']),
  value: z.string().min(1, 'Contact value is required'),
  isPreferred: z.boolean().default(false),
  timePreference: z.enum(['morning', 'afternoon', 'evening', 'anytime']).default('anytime'),
  language: z.enum(['es', 'en']).default('es')
});

export type ContactPreference = z.infer<typeof ContactPreferenceSchema>;

export class ContactPreferenceVO {
  private constructor(private readonly data: ContactPreference) {}

  static create(data: unknown): ContactPreferenceVO {
    const validated = ContactPreferenceSchema.parse(data);
    return new ContactPreferenceVO(validated);
  }

  static createEmail(email: string, isPreferred = false): ContactPreferenceVO {
    return new ContactPreferenceVO({
      method: 'email',
      value: email,
      isPreferred,
      timePreference: 'anytime',
      language: 'es'
    });
  }

  static createWhatsApp(phoneNumber: string, language: 'es' | 'en' = 'es'): ContactPreferenceVO {
    return new ContactPreferenceVO({
      method: 'whatsapp',
      value: phoneNumber,
      isPreferred: true,
      timePreference: 'anytime',
      language
    });
  }

  get method(): string {
    return this.data.method;
  }

  get value(): string {
    return this.data.value;
  }

  get isPreferred(): boolean {
    return this.data.isPreferred;
  }

  get timePreference(): string {
    return this.data.timePreference;
  }

  get language(): string {
    return this.data.language;
  }

  isDigitalChannel(): boolean {
    return ['email', 'sms', 'whatsapp'].includes(this.data.method);
  }

  requiresRealTimeResponse(): boolean {
    return ['phone', 'whatsapp'].includes(this.data.method);
  }

  toJSON(): ContactPreference {
    return { ...this.data };
  }
}