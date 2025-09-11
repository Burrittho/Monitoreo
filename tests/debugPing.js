const { iniciarPingsContinuos } = require('../models/ping');

console.log('🔧 INICIANDO PRUEBA DE DEBUG - PING SERVICE');
console.log('==========================================');
console.log('Este script ejecutará el servicio de ping con logging detallado');
console.log('Presiona Ctrl+C para detener la prueba');
console.log('==========================================\n');

// Función para verificar estado del pool de conexiones
async function verificarPool() {
    try {
        const pool = require('../config/db');
        console.log('🔌 Verificando pool de conexiones...');
        
        const conn = await pool.getConnection();
        console.log('✅ Pool de conexiones funcionando');
        
        // Verificar tablas necesarias
        console.log('📋 Verificando tablas necesarias...');
        
        const [ipsRows] = await conn.query('SELECT COUNT(*) as count FROM ips');
        console.log(`📊 Tabla 'ips': ${ipsRows[0].count} registros`);
        
        const [logsRows] = await conn.query('SELECT COUNT(*) as count FROM ping_logs');
        console.log(`📊 Tabla 'ping_logs': ${logsRows[0].count} registros`);
        
        // Mostrar algunas IPs de ejemplo
        const [sampleIps] = await conn.query('SELECT ip, name FROM ips LIMIT 5');
        console.log('📋 Muestra de IPs en la base de datos:');
        sampleIps.forEach((row, index) => {
            console.log(`   ${index + 1}. ${row.ip} - ${row.name || 'Sin nombre'}`);
        });
        
        conn.release();
        console.log('✅ Verificación de base de datos completada\n');
        
    } catch (error) {
        console.error('💥 Error verificando pool/tablas:', error.message);
        process.exit(1);
    }
}

// Función para verificar WSL y fping
async function verificarWSL() {
    const { exec } = require('child_process');
    
    return new Promise((resolve, reject) => {
        console.log('🐧 Verificando WSL y fping...');
        
        exec('wsl which fping', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ WSL o fping no disponible:', error.message);
                console.error('💡 Asegúrate de que WSL esté instalado y fping esté disponible');
                console.error('💡 Instalar fping: wsl sudo apt-get install fping');
                reject(error);
            } else {
                console.log('✅ fping disponible en:', stdout.trim());
                
                // Probar un ping simple
                exec('wsl fping -c1 -t1500 8.8.8.8', (error2, stdout2, stderr2) => {
                    console.log('🏓 Prueba de ping a 8.8.8.8:');
                    console.log('STDOUT:', stdout2);
                    console.log('STDERR:', stderr2);
                    resolve();
                });
            }
        });
    });
}

async function main() {
    try {
        await verificarPool();
        await verificarWSL();
        
        console.log('\n🚀 INICIANDO SERVICIO DE PING CON DEBUG...');
        console.log('=' .repeat(50));
        
        iniciarPingsContinuos();
        
    } catch (error) {
        console.error('💥 Error en verificaciones previas:', error.message);
        process.exit(1);
    }
}

// Manejar Ctrl+C para salida limpia
process.on('SIGINT', () => {
    console.log('\n\n🛑 Deteniendo servicio de ping...');
    console.log('👋 ¡Hasta luego!');
    process.exit(0);
});

main();
