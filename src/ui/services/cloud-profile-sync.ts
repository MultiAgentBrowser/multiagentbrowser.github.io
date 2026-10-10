import { User } from 'firebase/auth';
import {
  doc,
  getFirestore,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { execute } from 'firebase/firestore/pipelines';
import { Profile } from '../../security/ipc-contracts';
import { ProfileRecordSchema } from '../../profiles/profile-model';
import { getFirebaseServices } from './firebase';

export function serializeCloudProfile(profile: Profile) {
  const { proxy } = profile;
  const settings = Object.fromEntries(
    Object.entries(profile).filter(([key, value]) =>
      value !== undefined &&
      !['proxy', 'storagePath', 'status', 'lastUsedAt'].includes(key)
    )
  );
  return {
    ...settings,
    isTemporary: false,
    proxy: {
      enabled: proxy.enabled,
      mode: proxy.mode,
      host: proxy.host,
      port: proxy.port,
    },
  };
}

const demoProfileIds = ['default', 'profile-work', 'profile-testing'];

function parseCloudProfile(id: string, data: Record<string, unknown>): Profile {
  if (data.id !== id) {
    throw new Error(`Cloud profile ID does not match its document: ${id}`);
  }

  const parsed = ProfileRecordSchema.parse({
    ...data,
    id,
    storagePath: '',
    status: 'stopped',
    lastUsedAt: null,
    proxy: data.proxy,
  });
  return parsed;
}

async function saveProfiles(db: ReturnType<typeof getFirestore>, userId: string, profiles: Profile[]): Promise<void> {
  const persistentProfiles = profiles.filter((profile) => !profile.isTemporary);
  for (let offset = 0; offset < persistentProfiles.length; offset += 450) {
    const batch = writeBatch(db);
    for (const profile of persistentProfiles.slice(offset, offset + 450)) {
      batch.set(
        doc(db, 'users', userId, 'profiles', profile.id),
        serializeCloudProfile(profile)
      );
    }
    await batch.commit();
  }
}

export async function syncProfilesFromCloud(user: User): Promise<Profile[]> {
  const { db } = getFirebaseServices();
  const demoBatch = writeBatch(db);
  for (const profileId of demoProfileIds) {
    demoBatch.delete(doc(db, 'users', user.uid, 'profiles', profileId));
  }
  await demoBatch.commit();

  const snapshot = await execute(db.pipeline().collection(`users/${user.uid}/profiles`));
  const rawProfiles = snapshot.results.map((profileDoc) => {
    if (!profileDoc.id) {
      throw new Error('Cloud profile query returned a non-document result.');
    }
    return parseCloudProfile(profileDoc.id, profileDoc.data());
  });

  const remoteProfiles: Profile[] = [];
  const cleanupBatch = writeBatch(db);
  let hasCleanup = false;

  for (const p of rawProfiles) {
    const lowerName = (p.name || '').trim().toLowerCase();
    if (
      demoProfileIds.includes(p.id) ||
      lowerName === 'keep me' ||
      lowerName === 'temporary session' ||
      lowerName === 'running temporary' ||
      lowerName.startsWith('demo')
    ) {
      cleanupBatch.delete(doc(db, 'users', user.uid, 'profiles', p.id));
      hasCleanup = true;
    } else {
      remoteProfiles.push(p);
    }
  }

  if (hasCleanup) {
    await cleanupBatch.commit();
  }

  // Fetch current local profiles from device
  const localProfiles = await window.browserAPI.listProfiles();
  const persistentLocalProfiles = (localProfiles || []).filter((p) => {
    if (p.isTemporary) return false;
    if (demoProfileIds.includes(p.id)) return false;
    const lowerName = (p.name || '').trim().toLowerCase();
    return (
      lowerName !== 'keep me' &&
      lowerName !== 'temporary session' &&
      lowerName !== 'running temporary' &&
      !lowerName.startsWith('demo')
    );
  });

  // If cloud has no profiles, but we have persistent local profiles on this device:
  // Upload local profiles to cloud rather than wiping local profiles!
  if (remoteProfiles.length === 0) {
    if (persistentLocalProfiles.length > 0) {
      await saveProfiles(db, user.uid, persistentLocalProfiles);
      return persistentLocalProfiles;
    }
    // Both cloud and local are empty - clean new account
    const accountProfiles = await window.browserAPI.replaceCloudProfiles([]);
    return accountProfiles;
  }

  // If cloud has profiles: merge remote profiles with any local profiles not yet in cloud
  const remoteIdSet = new Set(remoteProfiles.map((p) => p.id));
  const unSyncedLocalProfiles = persistentLocalProfiles.filter((p) => !remoteIdSet.has(p.id));
  const mergedProfiles = [...remoteProfiles, ...unSyncedLocalProfiles];

  const accountProfiles = await window.browserAPI.replaceCloudProfiles(mergedProfiles);
  await saveProfiles(db, user.uid, accountProfiles);
  return accountProfiles;
}

export async function saveProfileToCloud(user: User, profile: Profile): Promise<void> {
  if (profile.isTemporary) return;
  const { db } = getFirebaseServices();
  await setDoc(
    doc(db, 'users', user.uid, 'profiles', profile.id),
    serializeCloudProfile(profile)
  );
}

export async function deleteProfileFromCloud(user: User, profileId: string): Promise<void> {
  const { db } = getFirebaseServices();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'users', user.uid, 'profiles', profileId));
  await batch.commit();
}
