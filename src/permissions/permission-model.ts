import { z } from 'zod';

export const PermissionTypeSchema = z.enum([
  'media',
  'geolocation',
  'notifications',
  'clipboard-read',
  'clipboard-sanitized-write',
  'midi',
  'midiSysex',
  'sensors',
  'pointerLock',
  'openExternal',
  'unknown',
]);
export type PermissionType = z.infer<typeof PermissionTypeSchema>;

export const PermissionDecisionSchema = z.enum(['allow', 'block', 'ask']);
export type PermissionDecision = z.infer<typeof PermissionDecisionSchema>;

export const PermissionRecordSchema = z.object({
  profileId: z.string(),
  origin: z.string(),
  permission: PermissionTypeSchema,
  decision: PermissionDecisionSchema,
  updatedAt: z.number(),
});
export type PermissionRecord = z.infer<typeof PermissionRecordSchema>;

