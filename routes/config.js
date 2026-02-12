// En tu archivo de rutas (ej: routes/api.js)
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { validate, configUpdateValidators } = require('../middleware/validation');

// Obtener intervalo de refresco del monitor
router.get('/refresh-interval', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [rows] = await conn.query(
            "SELECT valor FROM config WHERE clave = 'time_refresh_monitor'"
        );
        conn.release();

        const intervalo = rows[0]?.valor || 1; // Valor por defecto: 1 segundo
        res.json({ intervalo: parseInt(intervalo) * 1000 }); // Convertir a milisegundos
    } catch (error) {
        console.error('Error al obtener intervalo:', error);
        res.status(500).json({ intervalo: 1000 }); // Fallback a 1 segundo
    }
});

// Obtener todas las configuraciones del sistema de monitoreo
router.get('/monitor-settings', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [rows] = await conn.query(
            "SELECT clave, valor, description FROM config WHERE clave IN (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                'umbral_caida_minutos',
                'umbral_recuperacion_minutos', 
                'intervalo_verificacion_segundos',
                'fallos_consecutivos_requeridos',
                'exitos_consecutivos_requeridos',
                'ventana_secuencia_minutos',
                'minutos_entre_notificaciones',
                'intervalo_cambio_estado_segundos',
                'latencia_umbral_advertencia',
                'latencia_umbral_critico',
                'reintento_correo_max',
                'timeout_ping_segundos'
            ]
        );
        conn.release();

        // Convertir array a objeto para fácil acceso
        const settings = {};
        rows.forEach(row => {
            let value = parseInt(row.valor);
            // Convertir algunos valores a milisegundos donde sea necesario
            if (row.clave.includes('minutos')) {
                value = value * 60 * 1000; // minutos a ms
            } else if (row.clave.includes('segundos')) {
                value = value * 1000; // segundos a ms
            }
            settings[row.clave] = value;
        });

        // Valores por defecto si no existen
        const defaults = {
            umbral_caida_minutos: 1 * 60 * 1000,
            umbral_recuperacion_minutos: 2 * 60 * 1000,
            intervalo_verificacion_segundos: 60 * 1000,
            fallos_consecutivos_requeridos: 5,
            exitos_consecutivos_requeridos: 5,
            ventana_secuencia_minutos: 2 * 60 * 1000,
            minutos_entre_notificaciones: 5 * 60 * 1000,
            intervalo_cambio_estado_segundos: 10 * 1000,
            latencia_umbral_advertencia: 200,
            latencia_umbral_critico: 500,
            reintento_correo_max: 3,
            timeout_ping_segundos: 5 * 1000
        };

        res.json({ ...defaults, ...settings });
    } catch (error) {
        console.error('Error al obtener configuraciones de monitoreo:', error);
        res.status(500).json({ error: 'Error al obtener configuraciones' });
    }
});

// Obtener una configuración específica
router.get('/setting/:key', validate(configUpdateValidators.slice(0,1)), async (req, res, next) => {
    try {
        const { key } = req.params;
        const conn = await pool.getConnection();
        const [rows] = await conn.query(
            "SELECT valor FROM config WHERE clave = ?",
            [key]
        );
        conn.release();

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Configuración no encontrada' });
        }

        let value = parseInt(rows[0].valor);
        res.json({ [key]: value });
    } catch (error) {
        return next(error);
    }
});

// Actualizar una configuración específica
router.put('/setting/:key', validate(configUpdateValidators), async (req, res, next) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        if (value === undefined) {
            return res.status(400).json({ error: 'Valor requerido' });
        }

        const conn = await pool.getConnection();
        const [result] = await conn.query(
            "UPDATE config SET valor = ? WHERE clave = ?",
            [String(value), key]
        );
        conn.release();

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Configuración no encontrada' });
        }

        res.json({ success: true, message: 'Configuración actualizada' });
    } catch (error) {
        return next(error);
    }
});

// Nueva API para obtener configuraciones del sistema N+1
router.get('/monitoring-n1', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        const [rows] = await conn.query(
            `SELECT clave, valor, description 
             FROM config 
             WHERE clave IN (
                'tiempo_ventana_minutos',
                'minutos_consecutivos_requeridos', 
                'intervalo_revision_minutos',
                'tiempo_minimo_entre_correos',
                'latencia_maxima_aceptable',
                'habilitar_estado_unstable',
                'enviar_correos_unstable',
                'debug_logging'
             )`
        );
        conn.release();

        // Convertir a objeto con valores procesados
        const config = {};
        rows.forEach(row => {
            let valor = row.valor;
            
            // Convertir valores específicos
            switch(row.clave) {
                case 'tiempo_ventana_minutos':
                case 'minutos_consecutivos_requeridos':
                case 'intervalo_revision_minutos':
                case 'tiempo_minimo_entre_correos':
                case 'latencia_maxima_aceptable':
                    valor = parseInt(valor);
                    break;
                case 'habilitar_estado_unstable':
                case 'enviar_correos_unstable':
                case 'debug_logging':
                    valor = valor.toLowerCase() === 'true';
                    break;
            }
            
            config[row.clave] = {
                valor: valor,
                description: row.description
            };
        });

        // Valores por defecto si no existen en BD
        const defaults = {
            tiempo_ventana_minutos: { valor: 5, description: 'Tiempo de la ventana de evaluación en minutos (N+1)' },
            minutos_consecutivos_requeridos: { valor: 4, description: 'Minutos consecutivos requeridos para cambio de estado (N)' },
            intervalo_revision_minutos: { valor: 1, description: 'Intervalo entre revisiones en minutos' },
            tiempo_minimo_entre_correos: { valor: 5, description: 'Tiempo mínimo entre correos del mismo tipo en minutos' },
            latencia_maxima_aceptable: { valor: 200, description: 'Latencia máxima aceptable en milisegundos' },
            habilitar_estado_unstable: { valor: true, description: 'Habilitar estado UNSTABLE para pruebas' },
            enviar_correos_unstable: { valor: false, description: 'Enviar correos para estado UNSTABLE' },
            debug_logging: { valor: true, description: 'Habilitar logging detallado para debugging' }
        };

        res.json({ ...defaults, ...config });
    } catch (error) {
        console.error('Error al obtener configuración N+1:', error);
        res.status(500).json({ 
            error: 'Error al obtener configuración',
            fallback: {
                tiempo_ventana_minutos: { valor: 5, description: 'Valor por defecto' },
                minutos_consecutivos_requeridos: { valor: 4, description: 'Valor por defecto' },
                intervalo_revision_minutos: { valor: 1, description: 'Valor por defecto' },
                tiempo_minimo_entre_correos: { valor: 5, description: 'Valor por defecto' },
                latencia_maxima_aceptable: { valor: 200, description: 'Valor por defecto' },
                habilitar_estado_unstable: { valor: true, description: 'Valor por defecto' },
                enviar_correos_unstable: { valor: false, description: 'Valor por defecto' },
                debug_logging: { valor: true, description: 'Valor por defecto' }
            }
        });
    }
});

module.exports = router;