import { z } from 'zod';
import {
  PrivacyLevelSchema,
  WebRTCPolicySchema,
  ProxyConfigSchema,
  PrivacyLevel,
  WebRTCPolicy,
  ProxyConfig,
} from '../security/ipc-contracts';

export const ProfileRecordSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(64),
  isTemporary: z.boolean().default(false),
  privacyLevel: PrivacyLevelSchema.default('balanced'),
  webrtcPolicy: WebRTCPolicySchema.default('default_public_interface_only'),
  proxy: ProxyConfigSchema.default({
    enabled: false,
    mode: 'direct',
    host: '',
    port: 8080,
  }),
  os: z.enum(['mac', 'windows']).default('mac'),
  notes: z.string().default(''),
  tags: z.array(z.string()).default([]),
  color: z.string().default('#3b82f6'),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type ProfileRecord = z.infer<typeof ProfileRecordSchema>;

export const ProfileExportSchema = z.object({
  version: z.literal(1),
  exportedAt: z.number(),
  profile: ProfileRecordSchema,
});

export type ProfileExport = z.infer<typeof ProfileExportSchema>;

export interface CreateProfileDTO {
  name: string;
  isTemporary?: boolean;
  privacyLevel?: PrivacyLevel;
  webrtcPolicy?: WebRTCPolicy;
  proxy?: ProxyConfig;
  os?: 'mac' | 'windows';
  notes?: string;
  tags?: string[];
  color?: string;
}

export interface UpdateProfileDTO {
  name?: string;
  privacyLevel?: PrivacyLevel;
  webrtcPolicy?: WebRTCPolicy;
  proxy?: ProxyConfig;
  os?: 'mac' | 'windows';
  notes?: string;
  tags?: string[];
  color?: string;
}

