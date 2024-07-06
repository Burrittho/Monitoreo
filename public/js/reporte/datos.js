// Función para obtener los parámetros de la URL
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const data = JSON.parse(decodeURIComponent(params.get('data')));
    return { data };
}

document.addEventListener('DOMContentLoaded', () => {
    const { data } = getQueryParams();
    const resultContainer = document.getElementById('resultContainer');

    if (resultContainer) {
        resultContainer.innerHTML = `
        <div class="max-w-4xl mx-auto py-8">
            <div class="bg-white shadow-md rounded-lg overflow-hidden">
                <div class="p-6">
                    <h1 class="text-2xl font-bold mb-4">Informacion de sucursal</h1>
                    <div class="mb-4">
                        <p class="text-gray-600"><span class="font-semibold">NOMBRE:</span> ${data.name}</p>
                        <p class="text-gray-600"><span class="font-semibold">IP:</span> <a href="https://${data.ip}:4434" class="text-indigo-600 hover:underline">${data.ip}</a></p>
                        <p class="text-gray-600"><span class="font-semibold">URL:</span> <a href="${data.url || '#'}" class="text-indigo-600 hover:underline">${data.url || 'Sin enlace agregado'}</a></p>
                        <p class="text-gray-600"><span class="font-semibold">TELNOR:</span> ${data.internet1 || 'Sin registro de numero para reportar'}</p>
                        <p class="text-gray-600"><span class="font-semibold">TOTALPLAY\:</span> ${data.internet2 || 'Sin registro de cuenta para reportar'}</p>
                    </div>
                    <div class="text-sm text-gray-500">
                        <p class="mb-2">Instrucciones para reportar:</p>
                        <ul>
                            <li>Telnor: Marcado Rapido - 44011 / Telefono: 6646336999 > OPCION 1 > OPCION2</li>
                            <li>Total Play: Marcado Rapido - 44025 / Telefono: 8008108010 > OPCION 2 > Ingresa la cuenta para hablar con el ejecutivo</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;
    } else {
        console.error('Elemento resultContainer no encontrado en el DOM.');
    }
});
