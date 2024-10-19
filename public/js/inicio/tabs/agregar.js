document.addEventListener('DOMContentLoaded', async () => {

    const form = document.getElementById('form-add');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Mostrar el símbolo de carga usando SweetAlert2
        Swal.fire({
            title: 'Cargando...',
            html: 'Por favor espera.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Obtiene los valores de los campos del formulario
        const ip = document.getElementById('ip').value;
        const name = document.getElementById('name').value;
        const url = document.getElementById('url').value;
        const internet1 = document.getElementById('internet1').value;
        const internet2 = document.getElementById('internet2').value;
        const errorContainer = document.getElementById('errorContainer');

        // Limpia el contenedor de errores
        errorContainer.innerHTML = '';

        // Valida que los campos IP y Nombre no estén vacíos
        if (!ip || !name) {
            errorContainer.innerHTML = '<div class="bg-red-500 text-white p-4 rounded-lg">IP y Nombre son requeridos</div>';
            Swal.close(); // Cerrar el símbolo de carga
            return;
        }

        try {
            console.log('Enviando datos:', { ip, name, url, internet1, internet2 });
            // Envía una solicitud POST para agregar una nueva IP
            const response = await fetch('/addips', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip, name, url, internet1, internet2 })
            });

            const result = await response.json();
            Swal.close(); // Cerrar el símbolo de carga

            if (response.ok) {
                form.reset();
                Swal.fire({
                    icon: 'success',
                    title: 'IP agregada correctamente',
                    confirmButtonText: 'Aceptar'
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: result.error,
                    confirmButtonText: 'Aceptar'
                });
            }
        } catch (error) {
            console.error('Error en la solicitud:', error);
            Swal.close();
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `Error: ${error.message}`,
                confirmButtonText: 'Aceptar'
            });
        }
    });
});
