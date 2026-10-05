/**
 * Firestore security rules tests. Run against the local emulator:
 *   cd scripts/rules-test && npm install && npx firebase emulators:exec --only firestore --project demo-our-fridge "node --test"
 */
import { test, before, after, beforeEach } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, query, where, getDocs,
  arrayUnion, arrayRemove,
} from 'firebase/firestore';

let env;
const db = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-our-fridge',
    firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') },
  });
});
after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const admin = ctx.firestore();
    await setDoc(doc(admin, 'users/alice'), { email: 'a@x.com', isPremium: false, fridgeId: '111111' });
    await setDoc(doc(admin, 'users/bob'), { email: 'b@x.com', isPremium: false, fridgeId: '111111' });
    await setDoc(doc(admin, 'users/carol'), { email: 'c@x.com', isPremium: false, fridgeId: null });
    await setDoc(doc(admin, 'pairs/111111'), {
      memberUids: ['alice', 'bob'], memberNames: { alice: 'Alice', bob: 'Bob' }, memberPhotos: {},
      fridgeName: 'Ours', isPremiumEnabled: false,
    });
    await setDoc(doc(admin, 'pairs/222222'), {
      memberUids: ['dave'], memberNames: { dave: 'Dave' }, memberPhotos: {}, fridgeName: 'Dave', isPremiumEnabled: false,
    });
    await setDoc(doc(admin, 'pairs/111111/users/alice'), { pushToken: 'x' });
    await setDoc(doc(admin, 'groceryItems/milk'), { pairId: '111111', name: 'Milk', isDone: false });
    await setDoc(doc(admin, 'groceryItems/eggs'), { pairId: '222222', name: 'Eggs', isDone: false });
    await setDoc(doc(admin, 'sharedNotes/111111'), { pairId: '111111', content: '[]' });
  });
});

// ---- Signed-out access ----
test('signed-out users cannot read anything', async () => {
  await assertFails(getDoc(doc(db(), 'users/alice')));
  await assertFails(getDoc(doc(db(), 'pairs/111111')));
  await assertFails(getDocs(query(collection(db(), 'groceryItems'), where('pairId', '==', '111111'))));
});

// ---- Users ----
test('users can read their own profile only', async () => {
  await assertSucceeds(getDoc(doc(db('alice'), 'users/alice')));
  await assertFails(getDoc(doc(db('alice'), 'users/bob')));
});

test('users cannot grant themselves premium', async () => {
  await assertFails(updateDoc(doc(db('alice'), 'users/alice'), { isPremium: true }));
  await assertFails(setDoc(doc(db('erin'), 'users/erin'), { email: 'e@x.com', isPremium: true }));
  await assertSucceeds(setDoc(doc(db('erin'), 'users/erin'), { email: 'e@x.com', isPremium: false, fridgeId: null }));
  await assertSucceeds(updateDoc(doc(db('alice'), 'users/alice'), { name: 'Al', fridgeId: null }));
});

// ---- Fridges ----
test('creating a fridge: only yourself, never premium', async () => {
  await assertSucceeds(setDoc(doc(db('carol'), 'pairs/333333'), { memberUids: ['carol'], memberNames: { carol: 'C' }, isPremiumEnabled: false }));
  await assertFails(setDoc(doc(db('carol'), 'pairs/444444'), { memberUids: ['carol'], isPremiumEnabled: true }));
  await assertFails(setDoc(doc(db('carol'), 'pairs/555555'), { memberUids: ['carol', 'alice'], isPremiumEnabled: false }));
});

test('fridges can be looked up by code but not listed', async () => {
  await assertSucceeds(getDoc(doc(db('carol'), 'pairs/111111')));
  await assertFails(getDocs(collection(db('carol'), 'pairs')));
});

test('joining adds only yourself, as the app does', async () => {
  await assertSucceeds(updateDoc(doc(db('carol'), 'pairs/222222'), {
    memberUids: arrayUnion('carol'), 'memberNames.carol': 'Carol', 'memberPhotos.carol': null,
  }));
  await assertFails(updateDoc(doc(db('carol'), 'pairs/111111'), { memberUids: arrayUnion('carol'), fridgeName: 'Mine now' }));
  await assertFails(updateDoc(doc(db('carol'), 'pairs/111111'), { memberUids: arrayUnion('carol', 'zed') }));
  await assertFails(updateDoc(doc(db('carol'), 'pairs/111111'), { memberUids: arrayUnion('carol'), isPremiumEnabled: true }));
});

test('a full fridge (4 members) cannot be joined', async () => {
  await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'pairs/111111'), { memberUids: ['alice', 'bob', 'x', 'y'] }));
  await assertFails(updateDoc(doc(db('carol'), 'pairs/111111'), { memberUids: arrayUnion('carol') }));
});

test('members edit the fridge but cannot set premium', async () => {
  await assertSucceeds(updateDoc(doc(db('alice'), 'pairs/111111'), { fridgeName: 'Home' }));
  await assertSucceeds(updateDoc(doc(db('alice'), 'pairs/111111'), { 'memberPhotos.alice': 'https://x/y.png' }));
  await assertFails(updateDoc(doc(db('alice'), 'pairs/111111'), { isPremiumEnabled: true }));
  await assertFails(updateDoc(doc(db('carol'), 'pairs/111111'), { fridgeName: 'Hijacked' }));
});

test('members can leave but not remove others', async () => {
  await assertFails(updateDoc(doc(db('alice'), 'pairs/111111'), { memberUids: arrayRemove('bob') }));
  await assertSucceeds(updateDoc(doc(db('alice'), 'pairs/111111'), { memberUids: arrayRemove('alice'), memberNames: { bob: 'Bob' } }));
});

test('only the last member can delete a fridge', async () => {
  await assertFails(deleteDoc(doc(db('alice'), 'pairs/111111')));
  await assertSucceeds(deleteDoc(doc(db('dave'), 'pairs/222222')));
});

// ---- Per-member settings ----
test('member settings: own doc while a member; delete own after leaving', async () => {
  await assertSucceeds(setDoc(doc(db('bob'), 'pairs/111111/users/bob'), { pushToken: 'y' }, { merge: true }));
  await assertFails(getDoc(doc(db('bob'), 'pairs/111111/users/alice')));
  await assertFails(setDoc(doc(db('carol'), 'pairs/111111/users/carol'), { pushToken: 'spy' }));
  await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'pairs/111111'), { memberUids: ['bob'] }));
  await assertSucceeds(deleteDoc(doc(db('alice'), 'pairs/111111/users/alice')));
});

test('item memory is shared within the fridge', async () => {
  await assertSucceeds(setDoc(doc(db('alice'), 'pairs/111111/item_memory/milk'), { name: 'milk' }));
  await assertSucceeds(getDocs(collection(db('bob'), 'pairs/111111/item_memory')));
  await assertFails(getDocs(collection(db('carol'), 'pairs/111111/item_memory')));
});

// ---- Fridge content ----
test('grocery items: members only, scoped to their fridge', async () => {
  await assertSucceeds(getDocs(query(collection(db('alice'), 'groceryItems'), where('pairId', '==', '111111'))));
  await assertSucceeds(getDocs(query(collection(db('alice'), 'groceryItems'), where('pairId', '==', '111111'), where('isDone', '==', false))));
  await assertFails(getDocs(query(collection(db('alice'), 'groceryItems'), where('pairId', '==', '222222'))));
  await assertFails(getDocs(collection(db('alice'), 'groceryItems')));
  await assertSucceeds(addDoc(collection(db('alice'), 'groceryItems'), { pairId: '111111', name: 'Bread', isDone: false }));
  await assertFails(addDoc(collection(db('alice'), 'groceryItems'), { pairId: '222222', name: 'Spam', isDone: false }));
  await assertSucceeds(updateDoc(doc(db('bob'), 'groceryItems/milk'), { isDone: true }));
  await assertFails(updateDoc(doc(db('bob'), 'groceryItems/milk'), { pairId: '222222' }));
  await assertFails(deleteDoc(doc(db('alice'), 'groceryItems/eggs')));
  await assertSucceeds(deleteDoc(doc(db('alice'), 'groceryItems/milk')));
});

test('shared note: members only', async () => {
  await assertSucceeds(getDoc(doc(db('bob'), 'sharedNotes/111111')));
  await assertSucceeds(setDoc(doc(db('bob'), 'sharedNotes/111111'), { pairId: '111111', content: '[1]' }));
  await assertFails(getDoc(doc(db('carol'), 'sharedNotes/111111')));
});

test('recipes and activity: members only', async () => {
  await assertSucceeds(addDoc(collection(db('alice'), 'recipes'), { pairId: '111111', name: 'Tiramisu' }));
  await assertSucceeds(getDocs(query(collection(db('bob'), 'recipes'), where('pairId', '==', '111111'))));
  await assertFails(getDocs(query(collection(db('carol'), 'recipes'), where('pairId', '==', '111111'))));
  await assertSucceeds(addDoc(collection(db('alice'), 'activityLogs'), { pairId: '111111', actionType: 'ADD', timestamp: new Date() }));
  await assertSucceeds(getDocs(query(collection(db('bob'), 'activityLogs'), where('pairId', '==', '111111'), where('timestamp', '>=', new Date(0)))));
  await assertFails(addDoc(collection(db('carol'), 'activityLogs'), { pairId: '111111', actionType: 'ADD', timestamp: new Date() }));
});
