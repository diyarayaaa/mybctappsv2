const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'bct.sqlite');
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');

console.log('🧹 Menghapus seluruh data dummy (id LIKE "dummy-%")...');
const dummyCountBefore = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE id LIKE 'dummy-%'").get().c;

db.exec("DELETE FROM tickets WHERE id LIKE 'dummy-%';");

const totalAfter = db.prepare('SELECT COUNT(*) as c FROM tickets').get().c;
console.log(`✅ Berhasil menghapus ${dummyCountBefore} tiket dummy!`);
console.log(`📊 Sisa tiket aktif di database (tiket asli): ${totalAfter} unit.`);
