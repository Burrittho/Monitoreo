// Importar la configuración del transporte desde authmail.js
const transporter = require('../config/authmail');

// Función asincrónica para enviar correo electrónico
async function sendMail(subject, text) {
    try {
        // Configurar detalles del correo
        const mailOptions = {
            from: process.env.MAIL_FROM,  // Dirección de correo que se mostrará como "De"
            to: process.env.MAIL_TO,      // Dirección de correo del destinatario
            subject: subject,             // Asunto del correo
            text: text                    // Cuerpo del correo
        };

        // Enviar el correo
        const info = await transporter.sendMail(mailOptions);
        console.log('Correo enviado:', info.messageId);  // Loguear el ID del mensaje enviado
    } catch (error) {
        console.error('Error al enviar el correo:', error);  // Loguear el error si ocurre
    }
}

// Exportar la función para enviar correos para usar en otros módulos
module.exports = {
    sendMail
};
