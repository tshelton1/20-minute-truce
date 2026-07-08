/* src/lib/authSession.ts */
import { AuthApiError, type SupabaseClient } from '@supabase/supabase-js';

export const INVALID_REFRESH_TOKEN_MESSAGE =
  "You've been signed out on this device. Please sign in again.";

export function isInvalidRefreshTokenError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const message =
    error instanceof AuthApiError
      ? error.message
      : 'message' in error && typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : '';

  return message.includes('Refresh Token');
}

let explicitSignOutInProgress = false;
let invalidRefreshRecoveryInProgress = false;
let invalidRefreshTokenHandler: (() => void) | null = null;

export function isExplicitSignOutInProgress(): boolean {
  return explicitSignOutInProgress;
}

export function isInvalidRefreshRecoveryInProgress(): boolean {
  return invalidRefreshRecoveryInProgress;
}

export function registerInvalidRefreshTokenHandler(handler: () => void): void {
  invalidRefreshTokenHandler = handler;
}

export function notifyInvalidRefreshTokenDetected(): void {
  invalidRefreshTokenHandler?.();
}

export function configureSupabaseAuthRecovery(supabase: SupabaseClient): void {
  const auth = supabase.auth;

  const originalGetSession = auth.getSession.bind(auth);
  auth.getSession = async (...args) => {
    const result = await originalGetSession(...args);
    if (isInvalidRefreshTokenError(result.error)) {
      notifyInvalidRefreshTokenDetected();
    }
    return result;
  };

  const originalGetUser = auth.getUser.bind(auth);
  auth.getUser = async (...args) => {
    const result = await originalGetUser(...args);
    if (isInvalidRefreshTokenError(result.error)) {
      notifyInvalidRefreshTokenDetected();
    }
    return result;
  };

  const originalSignOut = auth.signOut.bind(auth);
  auth.signOut = async (options) => {
    const isExplicit = options?.scope !== 'local';
    if (isExplicit) {
      explicitSignOutInProgress = true;
    }

    try {
      return await originalSignOut(options);
    } finally {
      if (isExplicit) {
        explicitSignOutInProgress = false;
      }
    }
  };
}

export async function clearInvalidRefreshSession(supabase: SupabaseClient): Promise<void> {
  if (invalidRefreshRecoveryInProgress) return;

  invalidRefreshRecoveryInProgress = true;
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } finally {
    invalidRefreshRecoveryInProgress = false;
  }
}
