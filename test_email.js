require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function run() {
    console.log('Probando conexión SMTP con:', process.env.SMTP_USER);
    try {
        await transporter.verify();
        console.log('✅ Conexión exitosa. Las credenciales son válidas.');
    } catch (error) {
        console.error('❌ Error de conexión SMTP:', error.message);
    }
}

run();
