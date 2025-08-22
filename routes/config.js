// En tu archivo de rutas (ej: routes/api.js)
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

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

module.exports = router;