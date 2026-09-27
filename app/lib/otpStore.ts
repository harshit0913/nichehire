// In-memory OTP store for mobile number verification
interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
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
  return digits;
}
