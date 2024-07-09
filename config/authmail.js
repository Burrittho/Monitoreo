require('dotenv').config({ path: '../.env' });  // Cargar las variables de entorno desde .env
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,  // Host del servidor SMTP
    port: parseInt(process.env.MAIL_PORT),  // Puerto del servidor SMTP
    secure: process.env.MAIL_SECURE === 'true',  // Usar TLS en lugar de SSL para Gmail
    auth: {
        user: process.env.MAIL_USER,  // Dirección de correo de Gmail
        pass: process.env.MAIL_PASS   // Contraseña de Gmail o contraseña de aplicación
    }
});

module.exports = transporter;

