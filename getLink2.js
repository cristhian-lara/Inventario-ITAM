require('dotenv').config();
const jwt = require('jsonwebtoken');
const token = jwt.sign({ assignmentId: 'assig-27' }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });
console.log('http://localhost:3000/api/assignments/assig-27/accept?token=' + token);
