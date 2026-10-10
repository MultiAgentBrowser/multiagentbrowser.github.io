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
  browserType: z.enum(['chrome', 'edge', 'brave']).default('chrome'),
  browserVersion: z.string().min(1).max(64).default('131.0.6778.86'),
  storagePath: z.string().default(''),
  status: z.enum(['stopped', 'running', 'crashed']).default('stopped'),
  lastUsedAt: z.number().nullable().default(null),
  notes: z.string().max(10000).default(''),
  group: z.string().default('Default'),
  tags: z.array(z.string().max(64)).max(20).default([]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#3b82f6'),
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
  browserType?: 'chrome' | 'edge' | 'brave';
  browserVersion?: string;
  notes?: string;
  group?: string;
  tags?: string[];
  color?: string;
}

export interface UpdateProfileDTO {
  name?: string;
  privacyLevel?: PrivacyLevel;
  webrtcPolicy?: WebRTCPolicy;
  proxy?: ProxyConfig;
  os?: 'mac' | 'windows';
  browserType?: 'chrome' | 'edge' | 'brave';
  browserVersion?: string;
  notes?: string;
  group?: string;
  tags?: string[];
  color?: string;
}
