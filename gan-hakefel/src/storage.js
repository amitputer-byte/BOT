/* ============================================================================
 * src/storage.js — gan-hakefel profile-aware storage layer (ESM module)
 *
 * THE single chokepoint for all persistence. No other module may touch
 * localStorage directly. This is what makes a future move to IndexedDB and any
 * schema change a one-place edit.
 *
 * Responsibilities:
 *   - profile registry (list of profiles + active pointer + legacy flag)
 *   - per-profile state blobs, namespaced by id
 *   - schemaVersion stamping + a simple version -> migrationFn framework
 *   - the critical, idempotent legacy migration (old single blob -> "תמרי"),
 *     never destructive: a raw backup is written before anything else.
 *
 * All localStorage access is lazy + guarded so the app stays offline-robust and
 * the module is testable in Node with a small localStorage polyfill.
 * ==========================================================================*/

'use strict';

/* ---------- keys (namespaced) ---------- */
export const NS = 'gankefel';
export const LEGACY_KEY = 'gan-hakefel-v1';          // the original single blob
export const REGISTRY_KEY = NS + ':registry';        // profile registry
export const LEGACY_BACKUP_KEY = NS + ':legacy-backup'; // raw, untouched copy
export function profileKey(id) { return NS + ':profile:' + id; }

/* Current storage schema version (profile era). Bumps here drive migrations. */
export const SCHEMA_VERSION = 3;

/* ---------- low-level, guarded localStorage access ---------- */
function ls() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) return globalThis.localStorage;
  } catch (e) {}
  return null;
}
function readRaw(key) {
  var s = ls(); if (!s) return null;
  try { return s.getItem(key); } catch (e) { return null; }
}
function writeRaw(key, str) {
  var s = ls(); if (!s) return false;
  try { s.setItem(key, str); return true; } catch (e) { return false; }
}
function removeRaw(key) {
  var s = ls(); if (!s) return; try { s.removeItem(key); } catch (e) {}
}
function readJSON(key) {
  var raw = readRaw(key); if (raw == null) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}
function writeJSON(key, val) {
  try { return writeRaw(key, JSON.stringify(val)); } catch (e) { return false; }
}

/* ---------- ids ---------- */
export function genId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return 'p_' + crypto.randomUUID().slice(0, 8);
  } catch (e) {}
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------- registry ---------- */
function freshRegistry() {
  return { schemaVersion: SCHEMA_VERSION, activeProfileId: null, legacyMigrated: false, profiles: [] };
}
export function getRegistry() {
  var reg = readJSON(REGISTRY_KEY);
  if (!reg || !Array.isArray(reg.profiles)) return freshRegistry();
  if (typeof reg.schemaVersion !== 'number') reg.schemaVersion = SCHEMA_VERSION;
  if (typeof reg.legacyMigrated !== 'boolean') reg.legacyMigrated = false;
  if (!('activeProfileId' in reg)) reg.activeProfileId = null;
  return reg;
}
export function saveRegistry(reg) {
  reg.schemaVersion = SCHEMA_VERSION;
  return writeJSON(REGISTRY_KEY, reg);
}

/* ---------- profiles ---------- */
export function listProfiles() { return getRegistry().profiles.slice(); }
export function getProfile(id) {
  var ps = getRegistry().profiles;
  for (var i = 0; i < ps.length; i++) if (ps[i].id === id) return ps[i];
  return null;
}
export function getActiveProfileId() { return getRegistry().activeProfileId; }
export function setActiveProfileId(id) {
  var reg = getRegistry();
  reg.activeProfileId = id;
  saveRegistry(reg);
}

/* Create a profile and persist its initial state. Sets it active by default.
 * Returns the created Profile = { id, name, avatar, createdAt }. */
export function createProfile(info, state) {
  info = info || {};
  var reg = getRegistry();
  var profile = {
    id: genId(),
    name: info.name || 'אלופ/ה',
    avatar: info.avatar || '👑',
    createdAt: info.createdAt || Date.now()
  };
  reg.profiles.push(profile);
  if (info.makeActive !== false) reg.activeProfileId = profile.id;
  saveRegistry(reg);
  if (state) saveProfileState(profile.id, state);
  return profile;
}

/* Patch a profile's display fields (name / avatar). */
export function updateProfile(id, patch) {
  var reg = getRegistry();
  for (var i = 0; i < reg.profiles.length; i++) {
    if (reg.profiles[i].id === id) {
      if (patch && patch.name != null) reg.profiles[i].name = patch.name;
      if (patch && patch.avatar != null) reg.profiles[i].avatar = patch.avatar;
      saveRegistry(reg);
      return reg.profiles[i];
    }
  }
  return null;
}

export function deleteProfile(id) {
  var reg = getRegistry();
  reg.profiles = reg.profiles.filter(function (p) { return p.id !== id; });
  if (reg.activeProfileId === id) {
    reg.activeProfileId = reg.profiles.length ? reg.profiles[0].id : null;
  }
  saveRegistry(reg);
  removeRaw(profileKey(id));
  return reg.activeProfileId;
}

/* ---------- per-profile state ---------- */
export function loadProfileState(id) {
  if (!id) return null;
  return readJSON(profileKey(id));
}
export function saveProfileState(id, state) {
  if (!id || !state) return false;
  try { state.schemaVersion = SCHEMA_VERSION; } catch (e) {}
  return writeJSON(profileKey(id), state);
}

/* ---------- schema migration framework ----------
 * migrations maps an integer fromVersion -> function(blob) that returns the blob
 * upgraded by one step. Applied repeatedly until the blob reaches SCHEMA_VERSION.
 * `baseFn` (optional) is a structural backfill run once after the chain, so old
 * blobs that predate schemaVersion get every newer field filled in. */
export function applyMigrations(blob, migrations, baseFn) {
  if (!blob || typeof blob !== 'object') return blob;
  migrations = migrations || {};
  var v = typeof blob.schemaVersion === 'number' ? blob.schemaVersion : 0;
  var guard = 0;
  while (v < SCHEMA_VERSION && guard < 100) {
    var fn = migrations[v];
    if (typeof fn === 'function') { blob = fn(blob) || blob; }
    v++;
    blob.schemaVersion = v;
    guard++;
  }
  if (typeof baseFn === 'function') blob = baseFn(blob) || blob;
  blob.schemaVersion = SCHEMA_VERSION;
  return blob;
}

/* ---------- legacy detection + backup ---------- */
export function hasLegacy() { return readRaw(LEGACY_KEY) != null; }
export function getLegacyBackup() { return readRaw(LEGACY_BACKUP_KEY); }

/* ---------- THE critical migration: legacy single blob -> "תמרי" profile ----
 * Idempotent: a second call is a no-op (guarded by registry.legacyMigrated and
 * by the presence of profiles). Never destructive:
 *   1. A raw, byte-for-byte backup of the old blob is written FIRST, and only
 *      if no backup already exists. Nothing is removed — the original legacy key
 *      is left in place as an extra safety net.
 *   2. The blob is upgraded via `migrate` (the app's backfill) and stored under
 *      a new profile named "תמרי", which becomes active.
 *
 * opts = { migrate, migrations, name, avatar }
 * Returns { migrated:boolean, reason?, profile? }. */
export function migrateLegacy(opts) {
  opts = opts || {};
  var reg = getRegistry();

  // Idempotency: already migrated, or profiles already exist.
  if (reg.legacyMigrated || reg.profiles.length > 0) {
    return { migrated: false, reason: 'already' };
  }

  var legacyRaw = readRaw(LEGACY_KEY);
  if (legacyRaw == null) {
    // Fresh install (no legacy data). Leave registry untouched so onboarding
    // can create the first profile normally.
    return { migrated: false, reason: 'none' };
  }

  // 1) RAW BACKUP FIRST — before any registry/profile write. Never overwrite.
  if (readRaw(LEGACY_BACKUP_KEY) == null) {
    writeRaw(LEGACY_BACKUP_KEY, legacyRaw);
  }

  // 2) Parse + upgrade the blob.
  var blob;
  try { blob = JSON.parse(legacyRaw); } catch (e) { return { migrated: false, reason: 'corrupt' }; }
  if (typeof blob.schemaVersion !== 'number') blob.schemaVersion = 0;
  blob = applyMigrations(blob, opts.migrations, opts.migrate);

  // 3) Create the "תמרי" profile from the legacy data and make it active.
  var name = (blob.child && blob.child.nickname) ? blob.child.nickname : (opts.name || 'תמרי');
  var avatar = (blob.child && blob.child.avatar) ? blob.child.avatar : (opts.avatar || '👑');
  var profile = {
    id: genId(),
    name: name,
    avatar: avatar,
    createdAt: Date.now()
  };
  saveProfileState(profile.id, blob);
  reg.profiles.push(profile);
  reg.activeProfileId = profile.id;
  reg.legacyMigrated = true;
  saveRegistry(reg);

  return { migrated: true, profile: profile };
}

/* Test/util helper: wipe everything this layer owns (does NOT touch the legacy
 * key or its backup, by design). */
export function _clearAll() {
  var reg = getRegistry();
  reg.profiles.forEach(function (p) { removeRaw(profileKey(p.id)); });
  removeRaw(REGISTRY_KEY);
}

export default {
  NS, LEGACY_KEY, REGISTRY_KEY, LEGACY_BACKUP_KEY, SCHEMA_VERSION,
  profileKey, genId,
  getRegistry, saveRegistry,
  listProfiles, getProfile, getActiveProfileId, setActiveProfileId,
  createProfile, updateProfile, deleteProfile,
  loadProfileState, saveProfileState,
  applyMigrations, hasLegacy, getLegacyBackup, migrateLegacy, _clearAll
};
