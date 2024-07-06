const express = require('express');
const path = require('path');
const router = express.Router();

// Ruta para la página de inicio
router.get('/inicio', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'inicio.html'));
});

// Ruta para la página de reporte
router.get('/reporte', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reporte.html'));
});

module.exports = router;
