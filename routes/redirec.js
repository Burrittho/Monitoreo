const express = require('express');
const path = require('path');
const router = express.Router();
const pool = require('../config/db'); // Importar la configuración de la base de datos

// Ruta para la página de inicio
router.get('/inicio', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'views', 'Inicio.html'));
});

// Ruta para la página de reporte
router.get('/reporte', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'views', 'Reporte.html'));
});

// Ruta para la página de reporte
router.get('/process-ip', async (req, res) => {
    const { ip } = req.query;

    if (!ip) {
        return res.status(400).send('IP is required.');
    }

    try {
        const connection = await pool.getConnection();
        const query = 'SELECT * FROM ips WHERE ip = ?';
        const [rows] = await connection.query(query, [ip]);
        connection.release();

        if (rows.length === 0) {
            return res.status(404).send('IP not found.');
        }

        // Redirige a Reporte.html con los datos obtenidos como parámetros de consulta
        res.redirect(`/Reporte.html?data=${encodeURIComponent(JSON.stringify(rows))}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error.');
    }
});

module.exports = router;
