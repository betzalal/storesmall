const db = require('./db');

try {
    const columns = [
        'ALTER TABLE stores ADD COLUMN address TEXT',
        'ALTER TABLE stores ADD COLUMN phone TEXT',
        'ALTER TABLE stores ADD COLUMN rent_status TEXT', // 'rent', 'own'
        'ALTER TABLE stores ADD COLUMN size_m2 TEXT',
        'ALTER TABLE stores ADD COLUMN pros_cons TEXT',
        'ALTER TABLE stores ADD COLUMN map_url TEXT',
        'ALTER TABLE stores ADD COLUMN other_details TEXT'
    ];

    columns.forEach(query => {
        try {
            db.prepare(query).run();
        } catch (e) {
            // Column likely exists
        }
    });

    console.log("Database schema updated");
} catch (e) {
    console.error("Migration failed", e);
}
