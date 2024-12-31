const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Dinosaurio2314.',
    database: 'ping_monitor'
});

connection.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos MySQL:', err.message);
    } else {
        console.log('Conectado a la base de datos MySQL');
        
        // Cerrar la conexión después del console.log
        connection.release((err) => {
            if (err) {
                console.error('Error al cerrar la conexión:', err.message);
            } else {
                console.log('Conexión cerrada correctamente');
            }
        });
    }
});
