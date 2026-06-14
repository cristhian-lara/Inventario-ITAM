require('dotenv').config();
const { Client } = require('pg');
const jwt = require('jsonwebtoken');

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

client.connect().then(() => {
  return client.query("SELECT id FROM assignments WHERE status = 'PENDING_ACCEPTANCE' ORDER BY start_date DESC LIMIT 1");
}).then(res => {
  if(res.rows.length > 0) {
    const id = res.rows[0].id;
    const token = jwt.sign({ assignmentId: id }, process.env.JWT_SECRET || 'super-secret-key-12345', { expiresIn: '24h' });
    console.log('http://localhost:3000/api/assignments/' + id + '/accept?token=' + token);
  } else {
    console.log('No pending assignments found');
  }
  client.end();
});
