# Firebase profile sync setup

Profile sync stores persistent Privacy Browser profile settings in Firestore. It does not upload browsing history, cookies, saved passwords, Chrome profile folders, or proxy usernames/passwords.

## Configure Firebase

1. In Firebase Console, create or select a project and add a Web app.
2. Under **Authentication → Sign-in method**, enable **Email/Password**.
3. The Enterprise Native Mode database `privacy-browser` in `asia-southeast1` (Singapore) is provisioned and selected in `firebase.json`.
4. Deploy the current `firestore.rules` to the configured database with `npx firebase-tools deploy --only firestore:rules --project multi-agent-browser`. The rules must include the `group` field before profile writes will succeed.
5. Email/Password must be enabled under **Authentication → Sign-in method**.
6. The Web app's public configuration is stored in the ignored `.env.local` file. For another checkout, copy `.env.example` to `.env.local` and fill in the Firebase Web app values.
7. Rebuild and launch the desktop app so Vite embeds the public Firebase Web configuration.

The Firebase Web configuration is public client configuration, not a service-account credential. Never put a service-account private key in the app.

## Sync behavior

- Email/password accounts are provided by Firebase Authentication.
- Signing in is required before profiles can be created, edited, deleted, imported, or launched. The app no longer seeds the Personal, Work, or Testing demo profiles.
- Signing in downloads cloud profiles, merges profiles by ID using the newest `updatedAt`, then uploads the merged persistent profiles.
- Profile additions and edits are uploaded while signed in. Use **Sync now** to merge again after using another device.
- Temporary profiles are excluded.
- Profiles may have an optional custom User-Agent string (up to 512 characters); when blank, the selected browser, version, and OS determine it. Deploy the current Firestore rules before syncing profiles with a custom User-Agent.
- Proxy credentials remain on the device; a profile synced to another device needs its proxy username/password entered again.
- Deleting a profile while signed in deletes its cloud document. If another device was offline during deletion, its stale local copy can be uploaded again when it next syncs.
- The app does not open a default web page or start Chrome on launch. Create/select a profile and press **Start** to launch its separate Chrome process.

The deployed prototype rules restrict reads and writes to the signed-in owner's profile subcollection, validate the profile schema and field bounds, reject unknown fields, and deny all other paths. They compiled and deployed successfully. Review them before broadly sharing the app.
