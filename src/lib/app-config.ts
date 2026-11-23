import { NextRequest } from 'next/server';
import { DatabaseSync } from 'node:sqlite';
import { db } from '@/lib/db';
import {
  AppConfig,
  BrandingConfig,
  ColorSchemeKey,
  CustomFieldConfig,
  CustomFieldType,
  FeatureToggleItem,
  FormPresetsConfig,
  KpiConfigItem,
  User
} from '@/types';
import {
  DEFAULT_BRANDING,
  DEFAULT_FEATURES,
  DEFAULT_FIELDS,
  DEFAULT_KPIS,
  DEFAULT_PRESETS
} from '@/lib/white-label-defaults';

const BRANDING_SETTING_KEY = 'whitelabel_branding';
const PRESETS_SETTING_KEY = 'whitelabel_presets';

export function ensureWhiteLabelTablesAndSeed(database: DatabaseSync = db) {
  // 1. Add custom_data column to tickets if missing
  try {
    database.exec("ALTER TABLE tickets ADD COLUMN custom_data TEXT DEFAULT '{}';");
  } catch {
    // Column already exists
  }

  // 2. Table feature_toggles
  database.exec(`
    CREATE TABLE IF NOT EXISTS feature_toggles (
      feature_key TEXT PRIMARY KEY,
      default_label TEXT NOT NULL,
      custom_label TEXT NOT NULL,
      href TEXT NOT NULL,
      group_name TEXT NOT NULL,
      icon TEXT NOT NULL,
      is_enabled INTEGER DEFAULT 1,
      admin_only INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );
  `);

  // 3. Table kpi_configs
  database.exec(`
    CREATE TABLE IF NOT EXISTS kpi_configs (
      id TEXT PRIMARY KEY,
      kpi_key TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      icon TEXT NOT NULL,
      color_scheme TEXT NOT NULL DEFAULT 'blue',
      is_visible INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0
    );
  `);

  // 4. Table custom_fields
  database.exec(`
    CREATE TABLE IF NOT EXISTS custom_fields (
      id TEXT PRIMARY KEY,
      field_key TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL,
      field_type TEXT NOT NULL DEFAULT 'text',
      options_json TEXT DEFAULT '[]',
      placeholder TEXT DEFAULT '',
      section TEXT DEFAULT 'custom',
      is_builtin INTEGER DEFAULT 0,
      is_visible_in_form INTEGER DEFAULT 1,
      is_required INTEGER DEFAULT 0,
      show_in_table INTEGER DEFAULT 1,
      show_in_compact INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );
  `);

  // Seed default branding if absent
  const brandingRow = database
    .prepare('SELECT value FROM app_settings WHERE key = ?')
    .get(BRANDING_SETTING_KEY) as { value: string } | undefined;
  if (!brandingRow) {
    database
      .prepare(
        "INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now', 'localtime'))"
      )
      .run(BRANDING_SETTING_KEY, JSON.stringify(DEFAULT_BRANDING));
  }

  // Seed default presets if absent
  const presetsRow = database
    .prepare('SELECT value FROM app_settings WHERE key = ?')
    .get(PRESETS_SETTING_KEY) as { value: string } | undefined;
  if (!presetsRow) {
    database
      .prepare(
        "INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now', 'localtime'))"
      )
      .run(PRESETS_SETTING_KEY, JSON.stringify(DEFAULT_PRESETS));
  }

  // Seed feature_toggles
  const featureCount = (
    database.prepare('SELECT COUNT(*) as count FROM feature_toggles').get() as { count: number }
  ).count;
  if (featureCount === 0) {
    const insertFeature = database.prepare(`
      INSERT OR IGNORE INTO feature_toggles (
        feature_key, default_label, custom_label, href, group_name, icon, is_enabled, admin_only, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const f of DEFAULT_FEATURES) {
      insertFeature.run(
        f.feature_key,
        f.default_label,
        f.custom_label,
        f.href,
        f.group_name,
        f.icon,
        f.is_enabled ? 1 : 0,
        f.admin_only ? 1 : 0,
        f.sort_order
      );
    }
  }

  // Seed kpi_configs
  const kpiCount = (
    database.prepare('SELECT COUNT(*) as count FROM kpi_configs').get() as { count: number }
  ).count;
  if (kpiCount === 0) {
    const insertKpi = database.prepare(`
      INSERT OR IGNORE INTO kpi_configs (
        id, kpi_key, label, icon, color_scheme, is_visible, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const k of DEFAULT_KPIS) {
      insertKpi.run(
        k.id,
        k.kpi_key,
        k.label,
        k.icon,
        k.color_scheme,
        k.is_visible ? 1 : 0,
        k.sort_order
      );
    }
  }

  // Seed custom_fields
  const fieldCount = (
    database.prepare('SELECT COUNT(*) as count FROM custom_fields').get() as { count: number }
  ).count;
  if (fieldCount === 0) {
    const insertField = database.prepare(`
      INSERT OR IGNORE INTO custom_fields (
        id, field_key, label, field_type, options_json, placeholder, section,
        is_builtin, is_visible_in_form, is_required, show_in_table, show_in_compact, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const fld of DEFAULT_FIELDS) {
      insertField.run(
        fld.id,
        fld.field_key,
        fld.label,
        fld.field_type,
        JSON.stringify(fld.options || []),
        fld.placeholder || '',
        fld.section || 'custom',
        fld.is_builtin ? 1 : 0,
        fld.is_visible_in_form ? 1 : 0,
        fld.is_required ? 1 : 0,
        fld.show_in_table ? 1 : 0,
        fld.show_in_compact ? 1 : 0,
        fld.sort_order
      );
    }
  }
}

export function getFullAppConfig(): AppConfig {
  ensureWhiteLabelTablesAndSeed(db);

  // 1. Branding
  let branding: BrandingConfig = { ...DEFAULT_BRANDING };
  try {
    const row = db
      .prepare('SELECT value FROM app_settings WHERE key = ?')
      .get(BRANDING_SETTING_KEY) as { value: string } | undefined;
    if (row?.value) {
      branding = { ...DEFAULT_BRANDING, ...JSON.parse(row.value) };
    }
  } catch (e) {
    console.error('[app-config] Failed to parse branding:', e);
  }

  // 2. Presets
  let presets: FormPresetsConfig = { ...DEFAULT_PRESETS };
  try {
    const row = db
      .prepare('SELECT value FROM app_settings WHERE key = ?')
      .get(PRESETS_SETTING_KEY) as { value: string } | undefined;
    if (row?.value) {
      presets = { ...DEFAULT_PRESETS, ...JSON.parse(row.value) };
    }
  } catch (e) {
    console.error('[app-config] Failed to parse presets:', e);
  }

  // 3. Features
  const rawFeatures = db
    .prepare('SELECT * FROM feature_toggles ORDER BY sort_order ASC')
    .all() as Record<string, unknown>[];
  const features: FeatureToggleItem[] =
    rawFeatures.length > 0
      ? rawFeatures.map((r) => ({
          feature_key: String(r.feature_key),
          default_label: String(r.default_label),
          custom_label: String(r.custom_label || r.default_label),
          href: String(r.href),
          group_name: String(r.group_name),
          icon: String(r.icon),
          is_enabled: Boolean(r.is_enabled),
          admin_only: Boolean(r.admin_only),
          sort_order: Number(r.sort_order || 0)
        }))
      : [...DEFAULT_FEATURES];

  // 4. KPIs
  const rawKpis = db
    .prepare('SELECT * FROM kpi_configs ORDER BY sort_order ASC')
    .all() as Record<string, unknown>[];
  const kpis: KpiConfigItem[] =
    rawKpis.length > 0
      ? rawKpis.map((r) => ({
          id: String(r.id),
          kpi_key: String(r.kpi_key),
          label: String(r.label),
          icon: String(r.icon),
          color_scheme: (String(r.color_scheme) as ColorSchemeKey) || 'blue',
          is_visible: Boolean(r.is_visible),
          sort_order: Number(r.sort_order || 0)
        }))
      : [...DEFAULT_KPIS];

  // 5. Fields
  const rawFields = db
    .prepare('SELECT * FROM custom_fields ORDER BY sort_order ASC')
    .all() as Record<string, unknown>[];
  const fields: CustomFieldConfig[] =
    rawFields.length > 0
      ? rawFields.map((r) => {
          let options: string[] = [];
          try {
            const parsed = JSON.parse(String(r.options_json || '[]'));
            if (Array.isArray(parsed)) options = parsed.map(String);
          } catch {}
          return {
            id: String(r.id),
            field_key: String(r.field_key),
            label: String(r.label),
            field_type: (String(r.field_type) as CustomFieldType) || 'text',
            options,
            placeholder: String(r.placeholder || ''),
            section: (String(r.section || 'custom') as CustomFieldConfig['section']),
            is_builtin: Boolean(r.is_builtin),
            is_visible_in_form: Boolean(r.is_visible_in_form),
            is_required: Boolean(r.is_required),
            show_in_table: Boolean(r.show_in_table),
            show_in_compact: Boolean(r.show_in_compact),
            sort_order: Number(r.sort_order || 0)
          };
        })
      : [...DEFAULT_FIELDS];

  return { branding, features, kpis, fields, presets };
}

export function saveFullAppConfig(partial: Partial<AppConfig>): AppConfig {
  ensureWhiteLabelTablesAndSeed(db);

  // 1. Save Branding
  if (partial.branding) {
    const merged: BrandingConfig = {
      ...DEFAULT_BRANDING,
      ...partial.branding,
      receiptFooterNotes: Array.isArray(partial.branding.receiptFooterNotes)
        ? partial.branding.receiptFooterNotes.filter((n) => typeof n === 'string' && n.trim().length > 0)
        : DEFAULT_BRANDING.receiptFooterNotes
    };
    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now', 'localtime'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = datetime('now', 'localtime')
    `).run(BRANDING_SETTING_KEY, JSON.stringify(merged));
  }

  // 2. Save Presets
  if (partial.presets) {
    const merged: FormPresetsConfig = {
      ...DEFAULT_PRESETS,
      ...partial.presets
    };
    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now', 'localtime'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = datetime('now', 'localtime')
    `).run(PRESETS_SETTING_KEY, JSON.stringify(merged));
  }

  // 3. Save Features
  if (Array.isArray(partial.features)) {
    const upsertFeature = db.prepare(`
      INSERT INTO feature_toggles (
        feature_key, default_label, custom_label, href, group_name, icon, is_enabled, admin_only, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(feature_key) DO UPDATE SET
        custom_label = excluded.custom_label,
        is_enabled = excluded.is_enabled,
        sort_order = excluded.sort_order
    `);
    partial.features.forEach((f, idx) => {
      // Dashboard must always remain enabled so users cannot lock themselves out of home
      const isEnabled = f.feature_key === 'dashboard' ? 1 : f.is_enabled ? 1 : 0;
      upsertFeature.run(
        f.feature_key,
        f.default_label,
        f.custom_label?.trim() || f.default_label,
        f.href,
        f.group_name,
        f.icon,
        isEnabled,
        f.admin_only ? 1 : 0,
        f.sort_order ?? idx + 1
      );
    });
  }

  // 4. Save KPIs
  if (Array.isArray(partial.kpis)) {
    const upsertKpi = db.prepare(`
      INSERT INTO kpi_configs (
        id, kpi_key, label, icon, color_scheme, is_visible, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(kpi_key) DO UPDATE SET
        label = excluded.label,
        icon = excluded.icon,
        color_scheme = excluded.color_scheme,
        is_visible = excluded.is_visible,
        sort_order = excluded.sort_order
    `);
    partial.kpis.forEach((k, idx) => {
      upsertKpi.run(
        k.id || `kpi-${idx + 1}`,
        k.kpi_key,
        k.label?.trim() || k.kpi_key,
        k.icon || 'Activity',
        k.color_scheme || 'blue',
        k.is_visible ? 1 : 0,
        k.sort_order ?? idx + 1
      );
    });
  }

  // 5. Save Custom & Builtin Fields (replace non-builtin removed fields, upsert all provided)
  if (Array.isArray(partial.fields)) {
    const incomingKeys = new Set(partial.fields.map((f) => f.field_key));
    const existingCustom = db
      .prepare('SELECT field_key FROM custom_fields WHERE is_builtin = 0')
      .all() as { field_key: string }[];
    const deleteStmt = db.prepare('DELETE FROM custom_fields WHERE field_key = ? AND is_builtin = 0');
    for (const row of existingCustom) {
      if (!incomingKeys.has(row.field_key)) {
        deleteStmt.run(row.field_key);
      }
    }

    const upsertField = db.prepare(`
      INSERT INTO custom_fields (
        id, field_key, label, field_type, options_json, placeholder, section,
        is_builtin, is_visible_in_form, is_required, show_in_table, show_in_compact, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(field_key) DO UPDATE SET
        label = excluded.label,
        field_type = excluded.field_type,
        options_json = excluded.options_json,
        placeholder = excluded.placeholder,
        section = excluded.section,
        is_visible_in_form = excluded.is_visible_in_form,
        is_required = excluded.is_required,
        show_in_table = excluded.show_in_table,
        show_in_compact = excluded.show_in_compact,
        sort_order = excluded.sort_order
    `);

    partial.fields.forEach((fld, idx) => {
      const cleanKey = fld.field_key
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_');
      if (!cleanKey) return;
      upsertField.run(
        fld.id || `fld-${cleanKey}`,
        cleanKey,
        fld.label?.trim() || cleanKey,
        fld.field_type || 'text',
        JSON.stringify(Array.isArray(fld.options) ? fld.options : []),
        fld.placeholder || '',
        fld.section || (fld.is_builtin ? 'device' : 'custom'),
        fld.is_builtin ? 1 : 0,
        fld.is_visible_in_form ? 1 : 0,
        fld.is_required ? 1 : 0,
        fld.show_in_table ? 1 : 0,
        fld.show_in_compact ? 1 : 0,
        fld.sort_order ?? idx + 1
      );
    });
  }

  return getFullAppConfig();
}

export function resetAppConfigToDefaults(): AppConfig {
  ensureWhiteLabelTablesAndSeed(db);
  db.exec('DELETE FROM feature_toggles; DELETE FROM kpi_configs; DELETE FROM custom_fields;');
  db.prepare('DELETE FROM app_settings WHERE key IN (?, ?)').run(
    BRANDING_SETTING_KEY,
    PRESETS_SETTING_KEY
  );
  ensureWhiteLabelTablesAndSeed(db);
  return getFullAppConfig();
}

export function parseCustomData(raw: unknown): Record<string, string | number | null> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, string | number | null>;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {}
  }
  return {};
}

export function getAuthenticatedAdmin(request: NextRequest): User | null {
  const userCookie = request.cookies.get('bct_auth_user');
  if (!userCookie?.value) return null;
  try {
    let cookieVal = userCookie.value;
    try {
      cookieVal = decodeURIComponent(cookieVal);
    } catch {}
    let userId: string | null = null;
    try {
      const parsed = JSON.parse(cookieVal);
      userId =
        typeof parsed === 'object' && parsed !== null
          ? parsed.id || parsed.username
          : String(parsed);
    } catch {
      userId = cookieVal;
    }
    if (!userId) return null;

    const stmt = db.prepare(
      'SELECT id, username, email, nama_lengkap, role, status FROM users WHERE id = ? OR username = ?'
    );
    const user = stmt.get(userId, userId) as User | undefined;
    if (user && user.role === 'ADMIN' && (!user.status || user.status === 'active')) {
      return user;
    }
  } catch (err) {
    console.error('[auth] Admin verification error:', err);
  }
  return null;
}

