// Función para obtener los parámetros de la URL
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    let data;
    try {
        data = JSON.parse(decodeURIComponent(params.get('data')));
        if (Array.isArray(data)) {
            data = data[0]; // Acceder al primer elemento del array
        }
    } catch (error) {
        console.error('Error al obtener o decodificar los datos:', error);
        return { data: null };  // Si hay un error, devolver `null`
    }
    return { data };
}

document.addEventListener('DOMContentLoaded', () => {
    const { data } = getQueryParams();
    const resultContainer = document.getElementById('resultContainer');

    if (resultContainer && data) {
        // Asegura que la URL tenga http o https
        const validUrl = data.url ? (data.url.startsWith('http://') || data.url.startsWith('https://') ? data.url : `http://${data.url}`) : null;

        // Crear el contenido HTML mejorado con estética de Tailwind
        resultContainer.innerHTML = `
            <div class="bg-white p-4 shadow-lg rounded-lg">
                <div class="space-y-4">
                    <!-- Sección de Nombre -->
                    <div>
                        <p class="text-gray-600 font-semibold">Nombre:</p>
                        <p class="text-black font-bold">${data.name}</p>
                    </div>
                    
                    <!-- Sección de IP -->
                    <div>
                        <p class="text-gray-600 font-semibold">IP:</p>
                        <p class="text-black font-bold">
                            <a href="https://${data.ip}:4434" class="text-indigo-600 hover:underline">${data.ip}</a>
                        </p>
                    </div>
                    
                    <!-- Sección de Telnor 1 -->
                    <div>
                        <p class="text-gray-600 font-semibold">Telnor 1:</p>
                        <p class="text-black font-bold">${data.internet1 || 'Sin registro de número para reportar'}</p>
                    </div>
                    
                    <!-- Sección de TotalPlay -->
                    <div>
                        <p class="text-gray-600 font-semibold">TotalPlay:</p>
                        <p class="text-black font-bold">${data.internet2 || 'Sin registro de número para reportar'}</p>
                    </div>
                    
                    <!-- Sección de URL -->
                    <div>
                        <p class="text-gray-600 font-semibold">URL:</p>
                        <p class="text-black font-bold">
                            <a href="${validUrl}" class="text-indigo-600 hover:underline">${data.url || 'Sin enlace agregado'}</a>
                        </p>
                    </div>
                </div>
            </div>
        `;
    } else {
        console.error('Elemento resultContainer no encontrado en el DOM.');
    }
});
