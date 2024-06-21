document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('reporteForm'); // Obtiene el formulario por su ID

    form.addEventListener('submit', async function(event) {
        event.preventDefault(); // Evita que se realice la acción por defecto del formulario

        const ip = form.elements['ip'].value; // Obtiene el valor del campo IP del formulario
        const periodo = form.elements['periodo'].value; // Obtiene el valor del campo Periodo del formulario

        try {
            const response = await fetch(`/api/reporte?ip=${ip}&periodo=${periodo}`); // Realiza la solicitud GET al endpoint /api/reporte
            if (!response.ok) { // Verifica si la respuesta no fue exitosa
                throw new Error('Error al obtener datos del servidor'); // Lanza un error si la respuesta no fue exitosa
            }
            const data = await response.json(); // Convierte la respuesta a formato JSON

            if (!Array.isArray(data)) { // Verifica si los datos recibidos son un array
                throw new Error('Los datos recibidos no son un array.');
            }

            mostrarReporte(data); // Llama a la función mostrarReporte para mostrar los datos en la página
        } catch (error) {
            console.error('Error:', error); // Maneja y muestra errores en la consola
            mostrarError('Error al obtener datos del servidor'); // Muestra un mensaje de error en la página
        }
    });

    // Función para mostrar el reporte en la tabla HTML
    function mostrarReporte(data) {
        // Limpiar la tabla antes de agregar nuevos datos
        const tablaReporte = document.getElementById('tabla-reporte');
        const errorDiv = document.getElementById('error-message');

        if (!tablaReporte) {
            console.error('Error: No se encontró el elemento con id "tabla-reporte"');
            mostrarError('Error: No se encontró la tabla para mostrar el reporte.');
            return;
        }
        
        if (!errorDiv) {
            console.error('Error: No se encontró el elemento con id "error-message"');
            return;
        }

        // Limpiar mensajes de error anteriores
        errorDiv.textContent = '';

        // Construir la tabla con los datos recibidos
        tablaReporte.innerHTML = `
            <tr>
                <th>Nombre</th>
                <th>IP</th>
                <th>Media Latencia</th>
                <th>Veces sin respuesta de ping</th>
                <th>Tiempo sin respuesta (Minutos)</th>
            </tr>
        `;

        // Iterar sobre los datos y agregar cada fila a la tabla
        data.forEach(item => {
            const row = `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.ip}</td>
                    <td>${item.mediaLatencia}</td>
                    <td>${item.vecesSinRespuesta}</td>
                    <td>${item.tiempoSinRespuesta}</td>
                </tr>
            `;
            tablaReporte.innerHTML += row;
        });
    }

    // Función para manejar errores y mostrar mensajes al usuario
    function mostrarError(message) {
        const errorDiv = document.getElementById('error-message');
        if (!errorDiv) {
            console.error('Error: No se encontró el elemento con id "error-message"');
            return;
        }
        errorDiv.textContent = message;
    }
});
