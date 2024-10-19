//Contenedores para monitor
document.addEventListener('DOMContentLoaded', async () => {
    let contenedor = [];
    // Obtiene el contenedor donde se mostrarán las IPs
    const ipListContainer = document.getElementById('Contenedores');

    // Función para cargar los resultados del ping
    async function cargarResultadosPing() {
        try {
            // Hace una solicitud a la API para obtener los resultados del ping
            const response = await fetch('/api/ping-results');
            const [data] = await response.json();
            contenedor = data;

            // Limpia el contenedor de la lista de IPs
            ipListContainer.innerHTML = '';

             // Ordenar los resultados por nombre
             data.sort((a, b) => a.name.localeCompare(b.name));

            // Crear dos arrays para almacenar los contenedores rojos y verdes
            const redContainers = [];
            const yellowContainers = [];
            const greenContainers = [];
            
                // Iterar sobre los resultados obtenidos
                data.forEach(result => {
                    // Crea un nuevo contenedor para cada resultado
                    const resultContainer = document.createElement('div');
                    resultContainer.className = 'bg-gray-50 dark:bg-gray-800 rounded-lg p-4 shadow-md transition duration-300 ease-in-out transform hover:scale-105';
            
                    // Establece el color de fondo basado en el éxito del ping
                    if (result.success.data[0] === 1) {
                        if (result.latency > 70) {
                            resultContainer.classList.add('bg-yellow-500', 'border-yellow-400', 'hover:bg-yellow-400');
                            yellowContainers.push(resultContainer); // Agregar al array de contenedores amarillos
                        } else {
                        resultContainer.classList.add('bg-green-500', 'border-green-400', 'hover:bg-green-400', 'delay-150');
                        greenContainers.push(resultContainer); // Agregar al array de contenedores verdes
                        }  
                        } else {
                        resultContainer.classList.add('bg-red-500', 'border-red-400', 'animate-bounce'); 
                        redContainers.push(resultContainer); // Agregar al array de contenedores rojos
                    }
            
                    // Añade el contenido HTML para mostrar la información del ping
                    resultContainer.innerHTML = `
                        <a href="${(result.success.data[0] === 1) ? `https://${result.ip}:4434` : `/process-ip?ip=${result.ip}`}" target="_blank">
                            <div class="text-center block max-w-sm p-6 rounded-lg">
                                <h5 class="text-2xl font-bold text-white">${result.name}</h5>
                                <p class="text-sm text-white">${result.ip}</p>
                                <p class="font-bold text-sm text-white">${(result.success.data[0] === 1) ? `${result.latency} ms` : 'Host no alcanzable'}</p>
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
                [...redContainers, ...yellowContainers, ...greenContainers].forEach(container => {
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
