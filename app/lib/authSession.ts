// app/lib/authSession.ts
// Centralized authentication session tracker enforcing a strict 2.5-hour (150 minutes) auto-logout.

export const SESSION_MAX_AGE_MS = 2.5 * 60 * 60 * 1000; // 150 minutes in milliseconds

export interface StoredCandidateSession {
  user: any;
  sessionToken?: string;
  referralCode?: string;
  authenticatedAt: number;
  expiresAt: number;
}

/**
 * Persists candidate session with timestamp and strict expiry boundary.
 */
export function saveCandidateSession(user: any, sessionToken?: string, referralCode?: string): void {
  if (typeof window === 'undefined') return;
  const now = Date.now();
  const sessionData: StoredCandidateSession = {
    user,
    sessionToken,
    referralCode,
    authenticatedAt: now,
    expiresAt: now + SESSION_MAX_AGE_MS,
  };
  try {
    localStorage.setItem('nichehire_auth_session', JSON.stringify(sessionData));
  } catch (e) {
    console.warn('Could not save candidate auth session:', e);
  }
}

/**
 * Retrieves candidate session if and only if within the 2.5-hour validity window.
 * Cleans up and returns null immediately if expired.
 */
export function getCandidateSession(): StoredCandidateSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('nichehire_auth_session');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const now = Date.now();

    // Check expiry: either explicit expiresAt or elapsed time since authenticatedAt
    if (!parsed.authenticatedAt || (parsed.expiresAt && now > parsed.expiresAt) || (now - parsed.authenticatedAt > SESSION_MAX_AGE_MS)) {
      clearCandidateSession();
      return null;
    }
    return parsed;
  } catch {
    clearCandidateSession();
    return null;
  }
}

export function clearCandidateSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('nichehire_auth_session');
  } catch {}
}

/**
 * Persists employer login with timestamp.
 */
export function saveEmployerSession(email: string, company: string, referralCode?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('nichehire_employer_email', email.trim());
    localStorage.setItem('nichehire_employer_company', company.trim());
    localStorage.setItem('nichehire_employer_login_time', Date.now().toString());
    if (referralCode) {
      localStorage.setItem('nichehire_employer_referral_code', referralCode.trim());
    }
  } catch (e) {
    console.warn('Could not save employer auth session:', e);
  }
}

/**
 * Retrieves employer credentials if within the 2.5-hour window.
 */
export function getEmployerSession(): { email: string; company: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const email = localStorage.getItem('nichehire_employer_email');
    const company = localStorage.getItem('nichehire_employer_company') || '';
    const loginTimeStr = localStorage.getItem('nichehire_employer_login_time');

    if (!email) return null;

    const now = Date.now();
    const loginTime = loginTimeStr ? parseInt(loginTimeStr, 10) : 0;

    if (!loginTime || now - loginTime > SESSION_MAX_AGE_MS) {
      clearEmployerSession();
      return null;
    }

    return { email, company };
  } catch {
    clearEmployerSession();
    return null;
  }
}

export function clearEmployerSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('nichehire_employer_email');
    localStorage.removeItem('nichehire_employer_company');
    localStorage.removeItem('nichehire_employer_login_time');
    localStorage.removeItem('nichehire_employer_profile');
  } catch {}
}

/**
 * Checks all local sessions and clears any that exceeded the 2.5-hour cutoff.
 * Returns true if an active session was found to be expired and purged.
 */
export function enforceSessionExpiry(): boolean {
  if (typeof window === 'undefined') return false;
  let didExpire = false;

  const rawCandidate = localStorage.getItem('nichehire_auth_session');
  if (rawCandidate) {
    try {
      const parsed = JSON.parse(rawCandidate);
      const now = Date.now();
      if (!parsed.authenticatedAt || (parsed.expiresAt && now > parsed.expiresAt) || (now - parsed.authenticatedAt > SESSION_MAX_AGE_MS)) {
        clearCandidateSession();
        didExpire = true;
      }
    } catch {
      clearCandidateSession();
      didExpire = true;
    }
  }

  const rawEmployerTime = localStorage.getItem('nichehire_employer_login_time');
  const employerEmail = localStorage.getItem('nichehire_employer_email');
  if (employerEmail) {
    const now = Date.now();
    const loginTime = rawEmployerTime ? parseInt(rawEmployerTime, 10) : 0;
    if (!loginTime || now - loginTime > SESSION_MAX_AGE_MS) {
      clearEmployerSession();
      didExpire = true;
    }
  }

  return didExpire;
}
