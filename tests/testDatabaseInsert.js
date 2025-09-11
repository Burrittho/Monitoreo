const pool = require('../config/db');

// Función de prueba para insertar logs simulados
async function probarInsercionLogs() {
    console.log('🧪 PRUEBA DE INSERCIÓN DE LOGS SIMULADOS');
    console.log('==========================================\n');

    // Datos de prueba simulados (como si vinieran del ping)
    const resultadosSimulados = [
        { ip: '172.16.105.1', alive: true, latency: 25.5 },
        { ip: '172.16.106.1', alive: false, latency: 0 },
        { ip: '172.16.107.1', alive: true, latency: 45.2 },
        { ip: '192.168.1.1', alive: true, latency: 12.8 }
    ];

    console.log('📋 Datos de prueba a insertar:');
    resultadosSimulados.forEach((r, i) => {
        console.log(`   ${i + 1}. ${r.ip} -> ${r.alive ? 'UP' : 'DOWN'} (${r.latency}ms)`);
    });

    try {
        // Función copiada directamente del ping.js con debug
        await guardarPingsEnLoteTest(resultadosSimulados);
        
        // Verificar que se insertaron
        console.log('\n🔍 Verificando inserción en base de datos...');
        const conn = await pool.getConnection();
        
        const [recentLogs] = await conn.query(`
            SELECT pl.*, i.ip, i.name 
            FROM ping_logs pl 
            JOIN ips i ON pl.ip_id = i.id 
            WHERE pl.timestamp >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
            ORDER BY pl.timestamp DESC 
            LIMIT 10
        `);
        
        console.log(`📊 Logs recientes (últimos ${recentLogs.length}):`);
        recentLogs.forEach((log, index) => {
            console.log(`   ${index + 1}. ${log.ip} -> ${log.success ? 'SUCCESS' : 'FAILED'} (${log.latency}ms) - ${log.timestamp}`);
        });
        
        conn.release();
        
        if (recentLogs.length > 0) {
            console.log('✅ LA INSERCIÓN FUNCIONA CORRECTAMENTE');
        } else {
            console.log('❌ NO SE ENCONTRARON LOGS RECIENTES');
        }
        
    } catch (error) {
        console.error('💥 Error en prueba de inserción:', error.message);
        console.error(error.stack);
    }
}

// Función de prueba copiada y modificada para debug
async function guardarPingsEnLoteTest(resultados) {
    console.log(`\n💾 DEBUG TEST: guardarPingsEnLoteTest llamada con ${resultados.length} resultados`);
    
    if (!resultados.length) {
        console.log('⚠️  DEBUG TEST: No hay resultados para guardar, retornando');
        return;
    }
    
    let conn;
    try {
        console.log('🔌 DEBUG TEST: Obteniendo conexión del pool...');
        conn = await pool.getConnection();
        console.log('✅ DEBUG TEST: Conexión obtenida, iniciando transacción...');
        await conn.beginTransaction();
        
        // Preparar mapeo de IPs a IDs para evitar múltiples SELECT
        const ips = [...new Set(resultados.map(r => r.ip))]; // IPs únicas
        console.log(`🔍 DEBUG TEST: IPs únicas para buscar: ${ips.length} - [${ips.join(', ')}]`);
        const ipIds = {};
        
        if (ips.length > 0) {
            const placeholders = ips.map(() => '?').join(',');
            const query = `SELECT id, ip FROM ips WHERE ip IN (${placeholders})`;
            console.log(`📋 DEBUG TEST: Ejecutando query de mapeo: ${query}`);
            console.log(`📋 DEBUG TEST: Con parámetros: [${ips.join(', ')}]`);
            
            const [ipRows] = await conn.query(query, ips);
            console.log(`📊 DEBUG TEST: Filas encontradas en tabla ips: ${ipRows.length}`);
            
            ipRows.forEach(row => {
                ipIds[row.ip] = row.id;
                console.log(`   🆔 TEST: ${row.ip} -> ID: ${row.id}`);
            });
        }
        
        // Preparar batch insert
        const valores = [];
        const parametros = [];
        let procesados = 0;
        let omitidos = 0;
        
        console.log('🔄 DEBUG TEST: Procesando resultados para batch insert...');
        resultados.forEach((resultado, index) => {
            const ipId = ipIds[resultado.ip];
            if (ipId) {
                valores.push('(?, ?, ?)');
                parametros.push(ipId, resultado.latency, resultado.alive ? 1 : 0);
                procesados++;
                console.log(`   ✅ TEST [${index + 1}] ${resultado.ip} (ID: ${ipId}) -> latencia: ${resultado.latency}ms, éxito: ${resultado.alive}`);
            } else {
                omitidos++;
                console.warn(`   ❌ TEST [${index + 1}] IP ${resultado.ip} no encontrada en base de datos`);
            }
        });
        
        console.log(`📈 DEBUG TEST: Procesamiento completo - Procesados: ${procesados}, Omitidos: ${omitidos}`);
        
        if (valores.length > 0) {
            const query = `INSERT INTO ping_logs (ip_id, latency, success) VALUES ${valores.join(', ')}`;
            console.log(`💽 DEBUG TEST: Ejecutando INSERT batch con ${valores.length} registros...`);
            console.log(`💽 DEBUG TEST: Query: ${query}`);
            console.log(`💽 DEBUG TEST: Parámetros: [${parametros.join(', ')}]`);
            
            const resultado = await conn.query(query, parametros);
            console.log(`✅ DEBUG TEST: INSERT ejecutado exitosamente. Filas afectadas: ${resultado[0].affectedRows}`);
        } else {
            console.log('⚠️  DEBUG TEST: No hay valores para insertar (todas las IPs fueron omitidas)');
        }
        
        console.log('🔒 DEBUG TEST: Haciendo commit de la transacción...');
        await conn.commit();
        console.log('✅ DEBUG TEST: Transacción completada exitosamente');
        
    } catch (err) {
        console.error(`💥 DEBUG TEST: Error en guardarPingsEnLoteTest: ${err.message}`);
        console.error(`📜 DEBUG TEST: Stack trace:`, err.stack);
        
        if (conn) {
            try {
                console.log('🔄 DEBUG TEST: Haciendo rollback de la transacción...');
                await conn.rollback();
                console.log('✅ DEBUG TEST: Rollback completado');
            } catch (rollbackErr) {
                console.error("💥 DEBUG TEST: Error en rollback:", rollbackErr.message);
            }
        }
        throw err;
    } finally {
        if (conn) {
            try {
                console.log('🔌 DEBUG TEST: Liberando conexión...');
                conn.release();
                console.log('✅ DEBUG TEST: Conexión liberada exitosamente');
            } catch (releaseErr) {
                console.error("💥 DEBUG TEST: Error al liberar conexión:", releaseErr.message);
            }
        }
    }
}

// Ejecutar la prueba
probarInsercionLogs().then(() => {
    console.log('\n🏁 Prueba completada. Cerrando...');
    process.exit(0);
}).catch(error => {
    console.error('\n💥 Error fatal en prueba:', error);
    process.exit(1);
});
