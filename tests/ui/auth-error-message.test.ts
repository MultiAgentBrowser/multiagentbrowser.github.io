import { describe, expect, it } from 'vitest';
import { getSignInErrorMessage } from '../../src/ui/services/auth-error-message';

describe('getSignInErrorMessage', () => {
  it('explains disabled accounts without exposing Firebase error details', () => {
    expect(getSignInErrorMessage({ code: 'auth/user-disabled', message: 'Firebase: Error (auth/user-disabled).' }))
      .toBe('This account has been disabled. Please contact your administrator.');
  });

  it('uses a neutral message for invalid credentials', () => {
    expect(getSignInErrorMessage({ code: 'auth/invalid-credential' }))
      .toBe('The email or password is incorrect. Please check your details and try again.');
  });

  it('does not display raw or unknown errors', () => {
    expect(getSignInErrorMessage(new Error('Firebase: Error (auth/internal-error).')))
      .toBe('Sign-in failed. Please verify your details or contact your administrator.');
  });
});
