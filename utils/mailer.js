// Importar la configuración del transporte desde authmail.js
const transporter = require('../config/authmail');

// Función asincrónica para enviar correo electrónico
async function sendMail(subject, content, isHtml = false, mailConfig = null) {
    try {
        // Usar configuración pasada desde mailcontroller o fallback a variables de entorno
        const from = mailConfig && mailConfig.from ? mailConfig.from : process.env.MAIL_FROM;
        const to = mailConfig && mailConfig.to && mailConfig.to.length > 0 ? mailConfig.to : process.env.MAIL_TO;
        
        // Configurar detalles del correo
        const mailOptions = {
            from: from,                   // Dirección de correo que se mostrará como "De"
            to: Array.isArray(to) ? to.join(',') : to,  // Direcciones de correo de los destinatarios
            subject: subject              // Asunto del correo
        };

        // Agregar el contenido como HTML o texto plano según el parámetro
        if (isHtml) {
            mailOptions.html = content;
        } else {
            mailOptions.text = content;
        }

        // Enviar el correo
        const info = await transporter.sendMail(mailOptions);
        console.log('Correo enviado:', info.messageId);  // Loguear el ID del mensaje enviado
        console.log('Enviado desde:', from);  // Loguear el remitente
        console.log('Enviado a:', Array.isArray(to) ? to.join(', ') : to);  // Loguear los destinatarios
    } catch (error) {
        console.error('Error al enviar el correo:', error);  // Loguear el error si ocurre
        throw error; // Re-lanzar el error para que mailretry pueda manejarlo
    }
}

// Exportar la función para enviar correos para usar en otros módulos
module.exports = {
    sendMail
};
