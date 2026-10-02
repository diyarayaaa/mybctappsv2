const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const dbPath = path.join(process.cwd(), 'data', 'bct.sqlite');
const db = new DatabaseSync(dbPath);

try { db.exec('ALTER TABLE users ADD COLUMN email TEXT;'); } catch (e) { console.log('email column exists'); }
try { db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';"); } catch (e) { console.log('status column exists'); }
try { db.exec("ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'credentials';"); } catch (e) { console.log('provider column exists'); }
try { db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT;'); } catch (e) { console.log('avatar_url column exists'); }
try { db.exec('ALTER TABLE users ADD COLUMN last_login TEXT;'); } catch (e) { console.log('last_login column exists'); }

db.exec("UPDATE users SET status = 'active' WHERE status IS NULL;");
db.exec("UPDATE users SET provider = 'credentials' WHERE provider IS NULL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS auth_otps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
  CREATE INDEX IF NOT EXISTS idx_otps_email ON auth_otps (email);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`);

console.log('Migration completed successfully.');
console.log('Table columns users:', db.prepare('PRAGMA table_info(users)').all());
console.log('Table columns auth_otps:', db.prepare('PRAGMA table_info(auth_otps)').all());
console.log('Table columns app_settings:', db.prepare('PRAGMA table_info(app_settings)').all());
