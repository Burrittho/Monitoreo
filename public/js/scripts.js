document.addEventListener('DOMContentLoaded', async () => {
    // Obtiene el contenedor donde se mostrarán las IPs
    const ipListContainer = document.getElementById('ipList');

    // Función para cargar los resultados del ping
    async function cargarResultadosPing() {
        try {
            // Hace una solicitud a la API para obtener los resultados del ping
            const response = await fetch('/api/ping-results');
            const data = await response.json();

            // Limpia el contenedor de la lista de IPs
            ipListContainer.innerHTML = '';

            // Crear dos arrays para almacenar los contenedores rojos y verdes
            const redContainers = [];
            const greenContainers = [];
            
                // Iterar sobre los resultados obtenidos
                data.forEach(result => {
                    // Crea un nuevo contenedor para cada resultado
                    const resultContainer = document.createElement('div');
                    resultContainer.className = 'bg-gray-50 dark:bg-gray-800 rounded-lg p-4 shadow-md transition duration-300 ease-in-out transform hover:scale-105';
            
                    // Establece el color de fondo basado en el éxito del ping
                    if (result.success === true) {
                        resultContainer.classList.add('bg-green-500', 'border-green-400', 'hover:bg-green-400', 'delay-150');
                        greenContainers.push(resultContainer); // Agregar al array de contenedores verdes
                    } else {
                        resultContainer.classList.add('bg-red-500', 'border-red-400', 'animate-bounce'); 
                        redContainers.push(resultContainer); // Agregar al array de contenedores rojos
                    }
            
                    // Añade el contenido HTML para mostrar la información del ping
                    resultContainer.innerHTML = `
                        <a href="https://${result.success === true ? `${result.ip}:4434` : result.url}" target="_blank">
                            <div class="text-center block max-w-sm p-6 rounded-lg">
                                <h5 class="text-2xl font-bold text-white">${result.name}</h5>
                                <p class="text-sm text-white">${result.ip}</p>
                                <p class="font-bold text-sm text-white">${result.success === true ? `${result.latency} ms` : 'Host no alcanzable'}</p>
                            </div>
                        </a>
                    `;
            
                    // Añadir la clase de hover delay       
                    resultContainer.classList.add('hover:delay-300');
            
                    // Añade el contenedor del resultado al contenedor principal
                    // No se añade directamente aquí, se hará después de ordenar los contenedores
                });
            
                // Vaciar el contenedor principal antes de agregar los resultados ordenados
                ipListContainer.innerHTML = '';
            
                // Agregar primero los contenedores rojos y luego los verdes
                [...redContainers, ...greenContainers].forEach(container => {
                    ipListContainer.appendChild(container);
                });
            
        } catch (error) {
            // Muestra un error en la consola si algo falla
            console.error('Error al cargar los resultados de ping:', error.message);
        }

        // Recarga los resultados cada segundo
        setTimeout(cargarResultadosPing, 1000);
    }

    if (ipListContainer) {
    // Inicia la carga de los resultados del ping
        cargarResultadosPing();
    }
});


document.addEventListener('DOMContentLoaded', async () => {
// Lógica para el formulario de configuración
    if (window.location.pathname === '/configuracion.html') {
    document.getElementById('addIpForm').addEventListener('submit', async (event) => {
         event.preventDefault();

            // Obtiene los valores de los campos del formulario
            const ip = document.getElementById('ip').value;
            const name = document.getElementById('name').value;
            const url = document.getElementById('url').value;
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
                headers: {'Content-Type': 'application/json'},
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
