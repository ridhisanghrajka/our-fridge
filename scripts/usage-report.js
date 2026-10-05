/**
 * Read-only usage report: which features do fridges actually use?
 * Prints aggregate counts only (no names, emails, or note contents).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json node scripts/usage-report.js
 *
 * Internal/test fridges (yours, App Review's) are excluded via EXCLUDED_FRIDGES.
 * Set SINCE=YYYY-MM-DD to limit the invite funnel to fridges created after a release.
 */
const admin = require('../functions/node_modules/firebase-admin');

admin.initializeApp({ projectId: 'our-fridge-5b835' });
const db = admin.firestore();

const EXCLUDED_FRIDGES = new Set(['674555', '445214', '916285', '220146']);

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const recent = (ts) => ts && ts.toMillis && now - ts.toMillis() <= 28 * DAY;
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(0)}%` : '-');

async function main() {
  const [pairsSnap, usersSnap, itemsSnap, notesSnap, recipesSnap, logsSnap] = await Promise.all([
    db.collection('pairs').get(),
    db.collection('users').get(),
    db.collection('groceryItems').get(),
    db.collection('sharedNotes').get(),
    db.collection('recipes').get(),
    db.collection('activityLogs').get(),
  ]);

  const fridges = new Map();
  for (const doc of pairsSnap.docs) {
    if (EXCLUDED_FRIDGES.has(doc.id)) continue;
    const d = doc.data();
    fridges.set(doc.id, {
      createdAt: d.createdAt && d.createdAt.toMillis ? d.createdAt.toMillis() : 0,
      inviteShares: d.inviteShareCount || 0,
      members: (d.memberUids || []).length,
      premium: !!d.isPremiumEnabled,
      items: 0, itemsRecent: 0,
      paths: 0, texts: 0, magnets: 0, noteRecent: false,
      recipes: 0, logsRecent: 0, reminders: false,
    });
  }
  const get = (id) => fridges.get(id);

  for (const doc of itemsSnap.docs) {
    const d = doc.data();
    const f = get(d.pairId);
    if (!f) continue;
    f.items++;
    if (recent(d.createdAt) || recent(d.updatedAt)) f.itemsRecent++;
  }

  for (const doc of notesSnap.docs) {
    const d = doc.data();
    const f = get(d.pairId || doc.id);
    if (!f) continue;
    let elements = [];
    try { elements = JSON.parse(d.content || '[]'); } catch (_) { /* legacy plain-text note */ if (d.content) f.texts++; }
    if (Array.isArray(elements)) {
      for (const el of elements) {
        if (el.type === 'path') f.paths++;
        else if (el.type === 'text') f.texts++;
        else if (el.type === 'magnet') f.magnets++;
      }
    }
    if (recent(d.updatedAt)) f.noteRecent = true;
  }

  for (const doc of recipesSnap.docs) {
    const f = get(doc.data().pairId);
    if (f) f.recipes++;
  }

  for (const doc of logsSnap.docs) {
    const d = doc.data();
    const f = get(d.pairId);
    if (f && recent(d.timestamp)) f.logsRecent++;
  }

  // Location reminders live in pairs/{id}/users/{uid}.reminders
  await Promise.all([...fridges.keys()].map(async (id) => {
    const snap = await db.collection('pairs').doc(id).collection('users').get();
    if (snap.docs.some((u) => {
      const r = u.data().reminders || {};
      return r.departureLocation || r.storeLocation;
    })) get(id).reminders = true;
  }));

  const all = [...fridges.values()];
  const n = all.length;
  const count = (fn) => all.filter(fn).length;
  const active = all.filter((f) => f.itemsRecent > 0 || f.noteRecent || f.logsRecent > 0);

  console.log('\n=== Fridges ===');
  console.log(`Users:                         ${usersSnap.size}`);
  console.log(`Fridges:                       ${n}`);
  console.log(`  with 2+ members (partner):   ${count((f) => f.members >= 2)} (${pct(count((f) => f.members >= 2), n)})`);
  console.log(`  with 3+ members:             ${count((f) => f.members >= 3)}`);
  console.log(`  premium:                     ${count((f) => f.premium)}`);
  console.log(`  active in last 28 days:      ${active.length} (${pct(active.length, n)})`);

  console.log('\n=== Feature adoption (share of all fridges / of active fridges) ===');
  const row = (label, fn) =>
    console.log(`${label.padEnd(30)} ${pct(count(fn), n).padStart(4)} / ${pct(active.filter(fn).length, active.length).padStart(4)}`);
  row('Grocery list (any item)', (f) => f.items > 0);
  row('Grocery list (10+ items)', (f) => f.items >= 10);
  row('Hit 30-item free cap', (f) => f.items >= 30);
  row('Note: drawing', (f) => f.paths > 0);
  row('Note: text', (f) => f.texts > 0);
  row('Note: magnet', (f) => f.magnets > 0);
  row('Note: any', (f) => f.paths + f.texts + f.magnets > 0);
  row('Recipes', (f) => f.recipes > 0);
  row('Location reminders', (f) => f.reminders);

  console.log('\n=== Last 28 days (active fridges) ===');
  console.log(`Updated the list:              ${pct(active.filter((f) => f.itemsRecent > 0).length, active.length)}`);
  console.log(`Updated the note:              ${pct(active.filter((f) => f.noteRecent).length, active.length)}`);
  console.log(`Only the note, not the list:   ${pct(active.filter((f) => f.noteRecent && f.itemsRecent === 0).length, active.length)}`);
  console.log(`Only the list, not the note:   ${pct(active.filter((f) => !f.noteRecent && f.itemsRecent > 0).length, active.length)}`);

  const since = process.env.SINCE ? Date.parse(process.env.SINCE) : 0;
  const cohort = all.filter((f) => f.createdAt >= since);
  const shared = cohort.filter((f) => f.inviteShares > 0);
  const notShared = cohort.filter((f) => f.inviteShares === 0);
  const paired = (group) => group.filter((f) => f.members >= 2).length;
  console.log(`\n=== Invite funnel (fridges created ${process.env.SINCE ? `since ${process.env.SINCE}` : 'all time'}) ===`);
  console.log(`Created:                       ${cohort.length}`);
  console.log(`Invite shared:                 ${shared.length} (${pct(shared.length, cohort.length)})`);
  console.log(`Partner joined:                ${paired(cohort)} (${pct(paired(cohort), cohort.length)})`);
  console.log(`  joined | invite shared:      ${pct(paired(shared), shared.length)}`);
  console.log(`  joined | no invite shared:   ${pct(paired(notShared), notShared.length)}`);

  console.log('\n=== Solo vs paired fridges ===');
  for (const [label, group] of [['Solo', all.filter((f) => f.members < 2)], ['Paired', all.filter((f) => f.members >= 2)]]) {
    const act = group.filter((f) => active.includes(f)).length;
    console.log(`${label.padEnd(8)} fridges: ${String(group.length).padStart(4)} | active 28d: ${pct(act, group.length).padStart(4)} | premium: ${group.filter((f) => f.premium).length}`);
  }
  console.log('');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
