// Agregar IPs
document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname === '/inicio.html') {
        document.getElementById('addIpForm').addEventListener('submit', async (event) => {
            event.preventDefault();

            // Obtiene los valores de los campos del formulario
            const ip = document.getElementById('ip').value;
            const name = document.getElementById('name').value;
            const url = document.getElementById('url').value;
            const internet1 = document.getElementById('internet1').value;
            const internet2 = document.getElementById('internet2').value;
            const errorContainer = document.getElementById('errorContainer');

            // Limpia el contenedor de errores
            errorContainer.innerHTML = '';

            // Valida que los campos no estén vacíos
            if (!ip || !name || !url) {
                errorContainer.innerHTML = '<div class="bg-red-500 text-white p-4 rounded-lg">IP, Nombre y URL son requeridos</div>';
                return;
            }

            try {
                // Envía una solicitud POST para agregar una nueva IP
                const response = await fetch('/ips', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ip, name, url })
                });

                const result = await response.json();
                if (response.ok) {
                    // Muestra un mensaje de éxito y resetea el formulario
                    document.getElementById('addIpForm').reset();
                    alert('IP added successfully');
                } else {
                    // Muestra un mensaje de error
                    errorContainer.innerHTML = `<div class="bg-red-500 text-white p-4 rounded-lg">${result.error}</div>`;
                }

            } catch (error) {
                // Muestra un mensaje de error en caso de fallo
                errorContainer.innerHTML = `<div class="bg-red-500 text-white p-4 rounded-lg">Error: ${error.message}</div>`;
            }
        });
    }
});



// Tabla IPs para inicio
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Hacer solicitud GET a la API para obtener las IPs
        const response = await fetch('/api/tablaips');
        const data = await response.json();

        // Obtener la tabla y el cuerpo de la tabla
        const table = document.getElementById('ipTable').getElementsByTagName('tbody')[0];

        // Limpiar cualquier contenido previo en la tabla
        table.innerHTML = '';

        // Iterar sobre los datos y agregar filas a la tabla
        data.forEach(ip => {
            const row = table.insertRow();
            row.innerHTML = `
                <td class="px-4 py-2">${ip.name}</td>
                <td class="px-4 py-2">${ip.ip}</td>
                <td class="px-4 py-2">${ip.url}</td>
            `;
        });
    } catch (error) {
        console.error('Error al obtener datos de IPs:', error);
        // Manejo de errores, por ejemplo, mostrar un mensaje de error
        const errorContainer = document.getElementById('errorContainer');
        errorContainer.innerHTML = `<div class="bg-red-500 text-white p-4 rounded-lg">Error al cargar datos de IPs</div>`;
    }
});




