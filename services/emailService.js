const { sendEmail } = require('../utils/mailer');

/**
 * Servicio de envío de correos con sistema de reintentos
 * Reemplaza el sistema anterior y usa la función optimizada sendEmail de mailer.js
 */

/**
 * Envía un correo electrónico con reintentos automáticos
 * @param {string} subject - Asunto del correo
 * @param {string} htmlContent - Contenido HTML del correo
 * @param {number} maxRetries - Número máximo de reintentos (default: 3)
 * @param {number} retryDelay - Tiempo de espera entre reintentos en ms (default: 2000)
 * @returns {Promise<boolean>} - true si se envió correctamente, false si falló después de todos los reintentos
 */
async function sendEmailWithRetry(subject, htmlContent, maxRetries = 3, retryDelay = 2000) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`📧 Intento ${attempt}/${maxRetries} - Enviando: ${subject}`);
            
            const success = await sendEmail(subject, htmlContent);
            
            if (success) {
                console.log(`✅ Correo enviado exitosamente en intento ${attempt}: ${subject}`);
                return true;
            } else {
                throw new Error('sendEmail retornó false');
            }
            
        } catch (error) {
            lastError = error;
            console.error(`❌ Error en intento ${attempt}/${maxRetries}:`, error.message);
            
            // Si no es el último intento, esperar antes del siguiente
            if (attempt < maxRetries) {
                console.log(`⏳ Esperando ${retryDelay}ms antes del siguiente intento...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                
                // Incrementar el tiempo de espera progresivamente (backoff exponencial)
                retryDelay = Math.min(retryDelay * 1.5, 10000); // Máximo 10 segundos
            }
        }
    }
    
    console.error(`💥 FALLO CRÍTICO: No se pudo enviar el correo después de ${maxRetries} intentos.`);
    console.error(`📧 Asunto: ${subject}`);
    console.error(`🔥 Último error:`, lastError?.message || 'Error desconocido');
    
    return false;
}

/**
 * Envía un correo de notificación de monitoreo (caída o recuperación)
 * Función específica para el sistema de monitoreo con parámetros optimizados
 * @param {string} subject - Asunto del correo
 * @param {string} htmlContent - Contenido HTML del correo
 * @returns {Promise<boolean>} - true si se envió correctamente
 */
async function sendMonitoringEmail(subject, htmlContent) {
    // Para correos críticos de monitoreo, usar configuración más agresiva
    return await sendEmailWithRetry(subject, htmlContent, 5, 1500); // 5 intentos, 1.5s inicial
}

/**
 * Envía un correo de prueba para verificar la configuración
 * @param {string} testMessage - Mensaje de prueba opcional
 * @returns {Promise<boolean>} - true si se envió correctamente
 */
async function sendTestEmail(testMessage = 'Correo de prueba del sistema de monitoreo') {
    const subject = '🧪 Prueba de Sistema de Correo - Monitoreo';
    
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
                .header { background: #4CAF50; color: white; padding: 15px; text-align: center; border-radius: 4px; }
                .content { padding: 20px 0; }
                .footer { font-size: 12px; color: #666; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>✅ Prueba de Sistema de Correo</h2>
                </div>
                <div class="content">
                    <p><strong>Mensaje:</strong> ${testMessage}</p>
                    <p><strong>Fecha y hora:</strong> ${new Date().toLocaleString('es-ES')}</p>
                    <p><strong>Sistema:</strong> Monitoreo de Red - Operadora Farmacéutica de BC</p>
                </div>
                <div class="footer">
                    <p>Este es un correo de prueba generado automáticamente.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    return await sendEmailWithRetry(subject, htmlContent, 3, 2000);
}

module.exports = {
    sendEmailWithRetry,
    sendMonitoringEmail,
    sendTestEmail
};
