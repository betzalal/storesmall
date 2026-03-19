const db = require('./db');

try {
    console.log('Dropping quotations table...');
    db.prepare('DROP TABLE IF EXISTS quotations').run();
    console.log('Quotations table dropped.');

    // Re-create with new schema if needed, or let db.js handle it on restart.
    // simpler to let db.js handle it, but I will update db.js first.

    // Also reset sqlite sequence for this table to ensure ID starts at 1
    db.prepare("DELETE FROM sqlite_sequence WHERE name='quotations'").run();
    console.log('Sequence reset.');

} catch (e) {
    console.error('Error resetting quotes:', e);
}
