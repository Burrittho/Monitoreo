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

        resultContainer.innerHTML = `
    <div>
        <p class="text-gray-600 font-semibold">Nombre:</p>
        <p class="text-black font-bold">${data.name}</p>
        <p class="text-gray-600 font-semibold">IP:</p>
        <p class="text-black font-bold">
            <a href="https://${data.ip}:4434" class="text-indigo-600 hover:underline">${data.ip}</a>
        </p>
        <p class="text-gray-600 font-semibold">Telnor 1:</p>
        <p class="text-black font-bold">${data.internet1 || 'Sin registro de número para reportar'}</p>
        <p class="text-gray-600 font-semibold">TotalPlay:</p>
        <p class="text-black font-bold">${data.internet2 || 'Sin registro de número para reportar'}</p>
        <p class="text-gray-600 font-semibold">URL:</p>
        <p class="text-black font-bold">
            <a href="${validUrl}" class="text-indigo-600 hover:underline">${data.url || 'Sin enlace agregado'}</a>
        </p>
    </div>
`;


        // Asignar eventos después de inyectar el HTML dinámico
        document.getElementById('telnor-toggle').addEventListener('click', () => toggleInstructions('telnor', 'telnor-toggle'));
        document.getElementById('totalplay-toggle').addEventListener('click', () => toggleInstructions('totalplay', 'totalplay-toggle'));
    } else {
        console.error('Elemento resultContainer no encontrado en el DOM.');
    }
});

// Función para mostrar/ocultar las instrucciones con animación
function toggleInstructions(id, toggleId) {
    const element = document.getElementById(id);
    const toggleElement = document.getElementById(toggleId);
    if (element) {
        element.classList.toggle('hidden');
        element.classList.toggle('bg-gray-100');
        toggleElement.querySelector('svg').classList.toggle('rotate-180'); // Girar la flecha
    }
}
