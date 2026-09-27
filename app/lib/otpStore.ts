import crypto from 'crypto';

// Unified in-memory OTP store for Mobile Phone & Email Address verification
export interface OtpEntry {
  code: string;
  identifier: string; // normalized phone (+91...) or email (lowercase)
  type: 'phone' | 'email';
  expiresAt: number;
  attempts: number;
  createdAt: number;
  lastSentAt: number;
}

const globalForOtp = globalThis as unknown as {
  __nichehire_otp_store?: Map<string, OtpEntry>;
};

if (!globalForOtp.__nichehire_otp_store) {
  globalForOtp.__nichehire_otp_store = new Map<string, OtpEntry>();
}

export const otpStore = globalForOtp.__nichehire_otp_store;

export function normalizePhoneNumber(raw: string): string {
  // Strip non-digits except leading +
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+91')) return digits;
  if (digits.startsWith('91') && digits.length === 12) return '+' + digits;
  if (digits.length === 10) return '+91' + digits;
  if (digits.startsWith('+')) return digits;
  return digits.length > 0 ? '+91' + digits : '';
}

export function normalizeIdentifier(raw: string): {
  identifier: string;
  type: 'phone' | 'email';
  isValid: boolean;
  error?: string;
} {
  const clean = (raw || '').trim();
  if (!clean) {
    return { identifier: '', type: 'email', isValid: false, error: 'Email or Mobile Number is required.' };
  }

  // Check if email
  if (clean.includes('@')) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      return { identifier: clean, type: 'email', isValid: false, error: 'Please enter a valid email address.' };
    }
    return { identifier: clean.toLowerCase(), type: 'email', isValid: true };
  }

  // Check if mobile phone
  const normalizedPhone = normalizePhoneNumber(clean);
  const digitsOnly = normalizedPhone.replace(/\D/g, '');
  if (digitsOnly.length < 10) {
    return {
      identifier: normalizedPhone,
      type: 'phone',
      isValid: false,
      error: 'Please enter a valid 10-digit mobile number.',
    };
  }

  return { identifier: normalizedPhone, type: 'phone', isValid: true };
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP code.
 * Guaranteed to be between 100000 and 999999.
 */
export function generateSecureOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Masks identifier for safe display in UI toasts and messages.
 * e.g., +91 98765 43210 -> +91 ••••• •4321
 * e.g., testuser@example.com -> t••••••r@example.com
 */
export function maskIdentifier(identifier: string, type: 'phone' | 'email'): string {
  if (type === 'email') {
    const [local, domain] = identifier.split('@');
    if (!domain) return identifier;
    if (local.length <= 2) return `${local[0]}*@${domain}`;
    return `${local[0]}${'•'.repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}@${domain}`;
  } else {
    // Phone
    const digits = identifier.replace(/\D/g, '');
    const last4 = digits.slice(-4);
    const prefix = identifier.startsWith('+') ? identifier.slice(0, 3) : '';
    return `${prefix} ••••• ${last4}`;
  }
}
