// Función para cargar las IPs cuando se inicializa el formulario
document.addEventListener('DOMContentLoaded', async () => {
    const pdelete = document.getElementById('IPdelete');  // Elemento select para las IPs
    const deleteButton = document.getElementById('botondelete'); // Botón para eliminar
    const errorContainer = document.getElementById('errorContainer'); // Contenedor para errores
    let listdelete = [];

    // Cargar las IPs
    try {
        // Hacer una solicitud al servidor para obtener las IPs
        const response = await fetch('/ips');  // Asegúrate de que este endpoint esté implementado
        if (!response.ok) {
            throw new Error('Failed to fetch IPs');
        }

        const [ips] = await response.json();  // Obtener las IPs como JSON
        listdelete = ips;

        // Agregar cada IP al selector
        ips.forEach(ip => {
            const option = document.createElement('option');  // Crea un nuevo option
            option.value = ip.id;  // Valor del option es el ID de la IP
            option.text = ip.ip;   // Texto del option es la IP
            pdelete.appendChild(option);  // Añade la opción al selector
        });

    } catch (error) {
        console.error('Error loading IPs:', error);
        errorContainer.innerText = 'No se pudieron cargar las IPs.';  // Mostrar mensaje de error en el contenedor
        deleteButton.classList.add('hidden');  // Ocultar el botón "Eliminar" en caso de error
    }
});

// Event listener para manejar la visibilidad del botón "Eliminar"
document.getElementById('IPdelete').addEventListener('change', (event) => {
    const deleteButton = document.getElementById('botondelete');
    const ipId = event.target.value; // Obtiene el ID de la IP seleccionada

    if (!ipId) {
        // Si no hay una IP seleccionada, oculta el botón "Eliminar"
        deleteButton.classList.add('hidden');
    } else {
        // Si se selecciona una IP, muestra el botón "Eliminar"
        deleteButton.classList.remove('hidden');
    }
});

// Evento para eliminar la IP seleccionada
document.getElementById('botondelete').addEventListener('click', async (event) => {
    event.preventDefault(); // Evitar comportamiento por defecto
    const ipId = document.getElementById('IPdelete').value; // Obtiene el ID de la IP seleccionada

    if (!ipId) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Debes seleccionar una IP para eliminar.',
            confirmButtonText: 'Aceptar'
        });
        return;
    }

    // Confirmar eliminación
    const confirmDelete = await Swal.fire({
        title: '¿Estás seguro?',
        text: 'Se eliminará la IP seleccionada y todos sus registros.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmDelete.isConfirmed) {
        return; // Si el usuario cancela, no hacer nada
    }

    // Mostrar símbolo de carga
    Swal.fire({
        title: 'Eliminando...',
        html: 'Por favor espera.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        // Hacer la solicitud DELETE al servidor
        const response = await fetch(`/delete/${ipId}`, {
            method: 'DELETE', // Método DELETE para eliminar
            headers: {
                'Content-Type': 'application/json' // Indicamos que enviamos datos JSON
            }
        });

        const result = await response.json();
        Swal.close(); // Cerrar símbolo de carga

        if (response.ok) {
            // Resetea el formulario y muestra un mensaje de éxito
            document.getElementById('form-delete').reset();
            document.getElementById('botondelete').classList.add('hidden');

            Swal.fire({
                
                icon: 'success',
                title: 'Éxito',
                text: 'La IP y sus registros han sido eliminados correctamente.',
                confirmButtonText: 'Aceptar'
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: result.error || 'No se pudo eliminar la IP.',
                confirmButtonText: 'Aceptar'
            });
        }
    } catch (error) {
        console.error('Error al eliminar la IP:', error);
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `Error en la solicitud: ${error.message}`,
            confirmButtonText: 'Aceptar'
        });
    }
});
