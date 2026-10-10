import { createHash } from 'crypto';

export function getProfileFingerprintSeed(profileId: string): string {
  return createHash('sha256')
    .update(`privacy-browser:fingerprint:${profileId}`)
    .digest('hex');
}
