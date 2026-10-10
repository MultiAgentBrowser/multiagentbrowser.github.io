import { User } from 'firebase/auth';
import {
  doc,
  getDoc,
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

  // When profiles are synced, also restore cookies for each profile
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
  let accountProfiles: Profile[] = [];
  if (remoteProfiles.length === 0) {
    if (persistentLocalProfiles.length > 0) {
      for (const p of persistentLocalProfiles) {
        await saveProfileToCloud(user, p);
      }
      accountProfiles = persistentLocalProfiles;
    } else {
      accountProfiles = await window.browserAPI.replaceCloudProfiles([]);
    }
  } else {
    // Merge remote profiles with any local profiles not yet in cloud
    const remoteIdSet = new Set(remoteProfiles.map((p) => p.id));
    const unSyncedLocalProfiles = persistentLocalProfiles.filter((p) => !remoteIdSet.has(p.id));
    const mergedProfiles = [...remoteProfiles, ...unSyncedLocalProfiles];
    accountProfiles = await window.browserAPI.replaceCloudProfiles(mergedProfiles);
  }

  // Restore cloud cookies for all synced profiles
  for (const p of accountProfiles) {
    try {
      await restoreProfileCookiesFromCloud(user, p.id);
    } catch {
      // Non-blocking
    }
  }

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
  batch.delete(doc(db, 'users', user.uid, 'profile_cookies', profileId));
  await batch.commit();
}

export async function saveProfileCookiesToCloud(
  user: User,
  profileId: string,
  cookies: any[],
  openUrls: string[] = []
): Promise<void> {
  const { db } = getFirebaseServices();
  const cleanCookies = Array.isArray(cookies) ? cookies : [];
  const cleanUrls = (Array.isArray(openUrls) ? openUrls : [])
    .slice(0, 50)
    .map((u) => String(u).slice(0, 2048));

  // Serialize cookies to JSON string, keeping within 1MB bounds
  let cookiesJson = JSON.stringify(cleanCookies);
  if (cookiesJson.length > 1048576) {
    // If over 1MB, reduce cookie list
    const trimmed = cleanCookies.slice(0, Math.floor(cleanCookies.length * 0.8));
    cookiesJson = JSON.stringify(trimmed);
  }
  const safeCookiesJson = cookiesJson.slice(0, 1048576);

  await setDoc(doc(db, 'users', user.uid, 'profile_cookies', profileId), {
    profileId,
    updatedAt: Date.now(),
    count: cleanCookies.length,
    cookiesJson: safeCookiesJson,
    openUrls: cleanUrls,
  });
}

export async function fetchProfileCookiesFromCloud(
  user: User,
  profileId: string
): Promise<{ cookies: any[]; openUrls: string[] } | null> {
  const { db } = getFirebaseServices();
  const docRef = doc(db, 'users', user.uid, 'profile_cookies', profileId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) {
    return null;
  }
  const data = snapshot.data();
  try {
    const cookies = JSON.parse(data.cookiesJson || '[]');
    const openUrls = Array.isArray(data.openUrls) ? data.openUrls : [];
    return { cookies, openUrls };
  } catch {
    return null;
  }
}

export async function restoreProfileCookiesFromCloud(
  user: User,
  profileId: string
): Promise<boolean> {
  const cloudData = await fetchProfileCookiesFromCloud(user, profileId);
  if (cloudData && window.browserAPI) {
    await window.browserAPI.saveSavedSession(profileId, cloudData);
    if (cloudData.cookies.length > 0) {
      await window.browserAPI.importCookies(profileId, JSON.stringify(cloudData.cookies));
    }
    return true;
  }
  return false;
}
