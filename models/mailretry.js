const nodemailer = require('nodemailer');
const { sendMail } = require('../utils/mailer');

// Función para enviar correos con reintentos
async function sendMailWithRetry(subject, text, retries = 3, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            await sendMail(subject, text);
            console.log('Correo enviado:', subject);
            return;
        } catch (error) {
            console.error('Error al enviar el correo:', error);
            if (i < retries - 1) {
                console.log(`Reintentando enviar correo en ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    console.error('No se pudo enviar el correo después de varios intentos');
}

module.exports = { sendMailWithRetry };