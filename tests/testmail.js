const { sendTestEmail, sendEmailWithRetry } = require('../services/emailService');

async function sendTestMail() {
    try {
        console.log('🧪 Iniciando prueba de correo...');
        
        // Prueba con la función dedicada de prueba
        const result1 = await sendTestEmail('Prueba de envío desde testmail.js actualizado');
        
        // Prueba con HTML personalizado
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #2c3e50;">✅ Prueba de Sistema Actualizado</h2>
                <p>Este correo fue enviado usando el nuevo sistema optimizado de envío de correos.</p>
                <ul>
                    <li><strong>Configuración:</strong> Obtenida desde base de datos</li>
                    <li><strong>Reintentos:</strong> Sistema automático incluido</li>
                    <li><strong>Pool de conexiones:</strong> Optimizado</li>
                </ul>
                <p><em>Fecha: ${new Date().toLocaleString('es-ES')}</em></p>
            </div>
        `;
        
        const result2 = await sendEmailWithRetry(
            '🔧 Prueba de Sistema Actualizado - testmail.js', 
            htmlContent
        );
        
        if (result1 && result2) {
            console.log('✅ Todas las pruebas de correo pasaron correctamente.');
        } else {
            console.log('⚠️ Algunas pruebas fallaron. Revisar configuración.');
        }
        
    } catch (error) {
        console.error('❌ Error al enviar el correo de prueba:', error);
    }
}

sendTestMail();

