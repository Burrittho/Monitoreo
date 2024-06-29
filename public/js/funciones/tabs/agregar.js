// Agregar IPs
document.addEventListener('DOMContentLoaded', async () => {
    if (window.location.pathname === '/inicio.html') {
        document.getElementById('addIpForm').addEventListener('submit', async (event) => {
            event.preventDefault();

            // Obtiene los valores de los campos del formulario
            const ip = document.getElementById('ip').value;
            const name = document.getElementById('name').value;
            let url = document.getElementById('url').value;
            let internet1 = document.getElementById('internet1').value;
            let internet2 = document.getElementById('internet2').value;
            const errorContainer = document.getElementById('errorContainer');
            const successContainer = document.getElementById('successContainer');

            // Limpia el contenedor de errores y éxitos
            errorContainer.innerHTML = '';
            successContainer.innerHTML = '';

            // Verificar casillas de verificación y establecer valores vacíos si están marcadas
            if (document.getElementById('urlEmpty').checked) {
                url = '';
            }
            if (document.getElementById('internet1Empty').checked) {
                internet1 = '';
            }
            if (document.getElementById('internet2Empty').checked) {
                internet2 = '';
            }

            // Valida que los campos IP y Nombre no estén vacíos
            if (!ip || !name) {
                errorContainer.innerHTML = '<div class="bg-red-500 text-white p-4 rounded-lg">IP y Nombre son requeridos</div>';
                return;
            }

            try {
                // Envía una solicitud POST para agregar una nueva IP
                console.log('Enviando datos:', { ip, name, url, internet1, internet2 });
                const response = await fetch('/ips', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ip, name, url, internet1, internet2 })
                });

                const result = await response.json();
                console.log('Respuesta:', result);
                if (response.ok) {
                    // Resetea el formulario y muestra un mensaje de éxito
                    document.getElementById('addIpForm').reset();
                    successContainer.innerHTML = '<div class="bg-green-500 text-white p-4 rounded-lg">IP agregada correctamente</div>';

                    // Oculta el mensaje de éxito después de 3 segundos
                    setTimeout(() => {
                        successContainer.innerHTML = '';
                    }, 5000);
                } else {
                    // Muestra un mensaje de error con la respuesta del servidor
                    errorContainer.innerHTML = `<div class="bg-red-500 text-white p-4 rounded-lg">${result.error}</div>`;
                }
            } catch (error) {
                // Muestra un mensaje de error en caso de fallo de la solicitud
                errorContainer.innerHTML = `<div class="bg-red-500 text-white p-4 rounded-lg">Error: ${error.message}</div>`;
            }
        });
    }
});
