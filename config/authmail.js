require('dotenv').config({ path: '../.env' });
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT || 587,
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    },
    tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1'
    },
    connectionTimeout: 30000,    // Aumentado a 30 segundos
    greetingTimeout: 15000,     // Aumentado a 15 segundos
    socketTimeout: 30000,       // Aumentado a 30 segundos
    //debug: true,               // Habilitar depuración
    //logger: true,              // Habilitar registro
    pool: true,                 // Habilitar pool de conexiones
    maxConnections: 3,          // Máximo de conexiones simultáneas
    maxMessages: Infinity,
    rateDelta: 1000,           // Intervalo entre intentos en milisegundos
    rateLimit: 3               // Número máximo de mensajes por intervalo
});

// Función para verificar la conexión
/*
async function verifyConnection() {
    try {
        const connection = await transporter.verify();
        console.log('✅ Servidor SMTP listo para enviar mensajes');
        return true;
    } catch (error) {
        console.error('❌ Error en la configuración del servidor SMTP:');
        console.error(`   Código: ${error.code}`);
        console.error(`   Comando: ${error.command}`);
        console.error(`   Mensaje: ${error.message}`);
        
        if (error.code === 'ETIMEDOUT') {
            console.log('\nPosibles soluciones:');
            console.log('1. Verificar que la dirección del servidor SMTP sea correcta');
            console.log('2. Comprobar que el puerto SMTP esté abierto');
            console.log('3. Revisar si hay reglas de firewall bloqueando la conexión');
            console.log(`4. Ejecutar: ping ${process.env.MAIL_HOST}`);
            console.log(`5. Ejecutar: telnet ${process.env.MAIL_HOST} ${process.env.MAIL_PORT}`);
        }
        return false;
    }
}

// Ejecutar verificación
verifyConnection();
*/
module.exports = transporter;