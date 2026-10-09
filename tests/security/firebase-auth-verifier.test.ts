import { describe, expect, it, vi } from 'vitest';
import { verifyFirebaseIdToken } from '../../src/security/firebase-auth-verifier';

describe('Firebase ID token verification', () => {
  it('resolves the UID from Firebase account lookup', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      JSON.stringify({ users: [{ localId: 'verified-user' }] }),
      { status: 200 }
    ));

    await expect(verifyFirebaseIdToken({
      idToken: 'firebase-id-token',
      apiKey: 'public-web-api-key',
    }, fetcher)).resolves.toBe('verified-user');

    expect(fetcher).toHaveBeenCalledWith(
      'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=public-web-api-key',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ idToken: 'firebase-id-token' }),
      })
    );
  });

  it('rejects malformed credentials without making a request', async () => {
    const fetcher = vi.fn<typeof fetch>();

    await expect(verifyFirebaseIdToken({ idToken: '', apiKey: 'key' }, fetcher))
      .rejects.toThrow('Invalid Firebase authentication token.');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects tokens Firebase does not accept', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 }));

    await expect(verifyFirebaseIdToken({
      idToken: 'invalid-token',
      apiKey: 'public-web-api-key',
    }, fetcher)).rejects.toThrow('Firebase authentication validation failed.');
  });
});
