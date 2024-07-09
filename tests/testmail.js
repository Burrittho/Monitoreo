const { sendMail } = require('../utils/mailer');

async function sendTestMail() {
    try {
        const subject = 'Prueba de Envío de Correo';
        const text = 'Este es un correo de prueba enviado desde Node.js con Nodemailer.';

        await sendMail(subject, text);
        console.log('Correo de prueba enviado correctamente.');
    } catch (error) {
        console.error('Error al enviar el correo de prueba:', error);
    }
}

sendTestMail();

