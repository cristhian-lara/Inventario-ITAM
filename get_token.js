const { Client } = require('pg');
const c = new Client({ user: 'postgres', host: 'localhost', database: 'inventario-ikusi', password: 'secret', port: 5432 });
c.connect();
c.query('SELECT id, "signature_token" as token FROM maintenances WHERE "signature_token" IS NOT NULL ORDER BY "created_at" DESC LIMIT 1').then(r => {
    console.log(r.rows);
    c.end();
}).catch(e => {
    console.error(e);
    c.end();
});
