const { sendTestEmail, sendEmailWithRetry } = require('../services/emailService');

async function runEmailTests() {
    console.log('🚀 Iniciando pruebas del sistema de correo...\n');
    
    try {
        // Prueba 1: Correo de prueba simple
        console.log('📝 PRUEBA 1: Enviando correo de prueba estándar...');
        const test1 = await sendTestEmail();
        console.log(`Resultado: ${test1 ? '✅ ÉXITO' : '❌ FALLO'}\n`);
        
        // Prueba 2: Correo de prueba con mensaje personalizado
        console.log('📝 PRUEBA 2: Enviando correo con mensaje personalizado...');
        const test2 = await sendTestEmail('Prueba personalizada - Sistema funcionando correctamente');
        console.log(`Resultado: ${test2 ? '✅ ÉXITO' : '❌ FALLO'}\n`);
        
        // Prueba 3: Correo HTML personalizado
        console.log('📝 PRUEBA 3: Enviando correo HTML personalizado...');
        const customHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2c3e50;">Prueba de Sistema Personalizado</h1>
                <p>Este es un correo de prueba con HTML personalizado.</p>
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr style="background: #f8f9fa;">
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Servidor:</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">Sistema de Monitoreo</td>
                    </tr>
                    <tr>
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Estado:</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd; color: green;">✅ Operativo</td>
                    </tr>
                    <tr style="background: #f8f9fa;">
                        <td style="padding: 10px; border: 1px solid #ddd;"><strong>Timestamp:</strong></td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toISOString()}</td>
                    </tr>
                </table>
                <p style="color: #666; font-size: 12px;">Correo generado por el sistema de pruebas</p>
            </div>
        `;
        
        const test3 = await sendEmailWithRetry(
            '🔧 Prueba HTML Personalizada - Sistema de Monitoreo', 
            customHtml,
            3, // 3 reintentos
            1000 // 1 segundo entre reintentos
        );
        console.log(`Resultado: ${test3 ? '✅ ÉXITO' : '❌ FALLO'}\n`);
        
        // Resumen final
        const successCount = [test1, test2, test3].filter(Boolean).length;
        console.log('📊 RESUMEN DE PRUEBAS:');
        console.log(`✅ Éxitos: ${successCount}/3`);
        console.log(`❌ Fallos: ${3 - successCount}/3`);
        
        if (successCount === 3) {
            console.log('🎉 ¡Todas las pruebas pasaron! El sistema de correo está funcionando correctamente.');
        } else {
            console.log('⚠️  Algunas pruebas fallaron. Revisa la configuración del sistema.');
        }
        
    } catch (error) {
        console.error('💥 Error crítico en las pruebas:', error);
    }
}

// Función para probar solo el correo básico (más rápida)
async function quickTest() {
    console.log('⚡ Prueba rápida del sistema de correo...');
    const result = await sendTestEmail('Prueba rápida del sistema');
    console.log(`Resultado: ${result ? '✅ Sistema OK' : '❌ Sistema con problemas'}`);
    return result;
}

// Ejecutar las pruebas si el archivo se ejecuta directamente
if (require.main === module) {
    console.log('🔥 Ejecutando archivo de pruebas de correo...');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('='*60);
    
    runEmailTests().then(() => {
        console.log('\n🏁 Pruebas completadas.');
        process.exit(0);
    }).catch(error => {
        console.error('\n💥 Error fatal:', error);
        process.exit(1);
    });
}

module.exports = {
    runEmailTests,
    quickTest
};
