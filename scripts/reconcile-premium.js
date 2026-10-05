/**
 * Brings Firestore premium flags in line with RevenueCat (the source of truth).
 * Dry run by default; set APPLY=1 to write.
 *
 * Usage:
 *   RC_KEY=sk_... GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json node scripts/reconcile-premium.js
 *
 * Fridges in KEEP_PREMIUM_FRIDGES (internal testing, App Review) keep premium.
 */
const admin = require('../functions/node_modules/firebase-admin');

const RC_PROJECT = '7f0cdcdc';
const KEEP_PREMIUM_FRIDGES = new Set(['674555', '445214', '916285', '220146']);
const APPLY = process.env.APPLY === '1';

admin.initializeApp({ projectId: 'our-fridge-5b835' });
const db = admin.firestore();

async function hasActiveEntitlement(uid) {
  const res = await fetch(`https://api.revenuecat.com/v2/projects/${RC_PROJECT}/customers/${uid}/active_entitlements`, {
    headers: { Authorization: `Bearer ${process.env.RC_KEY}` },
  });
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`RevenueCat ${res.status} for ${uid}`);
  return ((await res.json()).items || []).length > 0;
}

async function main() {
  if (!process.env.RC_KEY) throw new Error('RC_KEY is required');

  const [usersSnap, pairsSnap] = await Promise.all([db.collection('users').get(), db.collection('pairs').get()]);
  const keepUids = new Set(
    pairsSnap.docs.filter((p) => KEEP_PREMIUM_FRIDGES.has(p.id)).flatMap((p) => p.data().memberUids || [])
  );

  const userPremium = new Map();
  const userChanges = [];
  for (const doc of usersSnap.docs) {
    const current = doc.data().isPremium === true;
    const target = keepUids.has(doc.id) ? current : await hasActiveEntitlement(doc.id);
    userPremium.set(doc.id, target);
    if (current !== target) userChanges.push({ ref: doc.ref, id: doc.id, target });
  }

  const pairChanges = [];
  for (const doc of pairsSnap.docs) {
    const current = doc.data().isPremiumEnabled === true;
    const target = KEEP_PREMIUM_FRIDGES.has(doc.id)
      ? current
      : (doc.data().memberUids || []).some((uid) => userPremium.get(uid));
    if (current !== target) pairChanges.push({ ref: doc.ref, id: doc.id, target });
  }

  console.log(`${APPLY ? 'Applying' : 'Dry run'}: ${userChanges.length} user and ${pairChanges.length} fridge changes`);
  for (const c of userChanges) console.log(`  user   ${c.id}: isPremium -> ${c.target}`);
  for (const c of pairChanges) console.log(`  fridge ${c.id}: isPremiumEnabled -> ${c.target}`);

  if (!APPLY) return;
  const batch = db.batch();
  userChanges.forEach((c) => batch.update(c.ref, { isPremium: c.target }));
  pairChanges.forEach((c) => batch.update(c.ref, { isPremiumEnabled: c.target }));
  await batch.commit();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
