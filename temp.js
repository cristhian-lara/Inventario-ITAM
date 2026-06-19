const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:secret@localhost:5432/inventario-ikusi' });
client.connect().then(() => {
  client.query("SELECT * FROM assets WHERE id='000449'").then(res => {
    console.log(JSON.stringify(res.rows[0], null, 2));
    client.end();
  });
});
