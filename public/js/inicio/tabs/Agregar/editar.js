// Event listener para el botón "Editar"
document.getElementById('botoneditar').addEventListener('click', async (event) => {
    event.preventDefault(); // Previene el comportamiento por defecto del botón
    const form = document.getElementById('form-edit'); // Asegúrate de que el ID del formulario es correcto

    // Obtener los valores del formulario
    const ipId = document.getElementById('IPSelect').value; // IP seleccionada
    const nombre = document.getElementById('nombreedit').value; // Nombre
    const internet1 = document.getElementById('internet1edit').value; // Servicio Telnor
    const internet2 = document.getElementById('internet2edit').value; // Servicio TotalPlay
    const url = document.getElementById('urledit').value; // URL

    // Validar que una IP haya sido seleccionada
    if (!ipId) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Debes seleccionar una IP para editar.',
            confirmButtonText: 'Aceptar'
        });
        return;
    }

    // Validar que los campos no estén vacíos
    if (!nombre || !internet1 || !internet2 || !url) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Todos los campos deben estar llenos.',
            confirmButtonText: 'Aceptar'
        });
        return;
    }

    // Validar que la URL tenga un formato correcto (opcional)
    const urlPattern = /^(https?:\/\/)?([\w.-]+)+(:\d+)?(\/[\w.-]*)*\/?$/;
    if (!urlPattern.test(url)) {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'La URL no tiene un formato válido.',
            confirmButtonText: 'Aceptar'
        });
        return;
    }

    // Confirmar antes de editar (opcional)
    const confirmEdit = await Swal.fire({
        title: '¿Estás seguro?',
        text: "Estás a punto de editar los datos de esta IP.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, editar',
        cancelButtonText: 'Cancelar'
    });

    if (!confirmEdit.isConfirmed) {
        return; // Si el usuario cancela, no hacer nada
    }

    // Mostrar símbolo de carga
    Swal.fire({
        title: 'Editando...',
        html: 'Por favor espera.',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    try {
        // Hacer la solicitud PUT al servidor
        const response = await fetch(`/editar/${ipId}`, {
            method: 'PUT', // Método PUT para actualizar los datos
            headers: {
                'Content-Type': 'application/json' // Indicamos que enviamos datos JSON
            },
            body: JSON.stringify({
                nombre: nombre,
                internet1: internet1,
                internet2: internet2,
                url: url
            })
        });

        // Manejar la respuesta del servidor
        const result = await response.json();
        Swal.close(); // Cerrar el símbolo de carga

        if (response.ok) {
            // Resetea el formulario y muestra un mensaje de éxito
            form.reset();
            // Mostrar el botón "Editar" después de la búsqueda exitosa
            document.getElementById('botoneditar').classList.add('hidden');
            // Si la respuesta es exitosa, muestra un mensaje de éxito
            Swal.fire({
                icon: 'success',
                title: 'Éxito',
                text: 'Los datos de la IP han sido editados correctamente.',
                confirmButtonText: 'Aceptar'
            });
        } else {
            // Si hubo un error en el servidor, muestra el mensaje de error
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: result.error || 'No se pudo editar los datos.',
                confirmButtonText: 'Aceptar'
            });
        }
    } catch (error) {
        // Captura errores en la solicitud
        console.error('Error al editar la IP:', error);
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `Error en la solicitud: ${error.message}`,
            confirmButtonText: 'Aceptar'

        });
    }
});

// Event listener para inicializar la búsqueda de datos
document.addEventListener('DOMContentLoaded', async () => {
    const IPSelect = document.getElementById('IPSelect');  // Elemento select para las IPs
    const errorContainer = document.getElementById('errorContainer'); // Contenedor para errores
    let listaip = [];

    try {
        // Hacer una solicitud al servidor para obtener las IPs
        const response = await fetch('/ips');  // Asegúrate de que este endpoint esté implementado
        if (!response.ok) {
            throw new Error('Failed to fetch IPs');
        }

        const [ips] = await response.json();  // Obtener las IPs como JSON
        listaips = ips;

        // Agregar cada IP al selector
        ips.forEach(ip => {
            const option = document.createElement('option');  // Crea un nuevo option
            option.value = ip.id;  // Valor del option es el ID de la IP
            option.text = ip.ip;   // Texto del option es la IP
            IPSelect.appendChild(option);  // Añade la opción al selector
        });
    } catch (error) {
        console.error('Error loading IPs:', error);
        errorContainer.innerText = 'Failed to load IPs.';  // Mostrar mensaje de error en el contenedor
    }
});


// Event listener para el combobox "IPSelect"
document.getElementById('IPSelect').addEventListener('change', async (event) => {
    const ipId = event.target.value; // Obtiene el ID de la IP seleccionada
    const form = document.getElementById('form-edit');
    const editButton = document.getElementById('botoneditar');
    let dataip = [];

    if (!ipId) {
        // Si no hay una IP seleccionada, oculta el botón "Editar" y limpia el formulario
        editButton.classList.add('hidden');
        form.reset();
        return;
    }

    // Muestra el botón "Editar" cuando se selecciona una IP
    editButton.classList.remove('hidden');

    try {
        // Obtiene los datos de la IP seleccionada
        const response = await fetch(`/consulta/${ipId}`);
        if (!response.ok) throw new Error('No se pudo obtener los datos de la IP.');

        const [ipData] = await response.json();
        dataip = ipData;
        
        // Rellena el formulario con los datos de la IP
        document.getElementById('nombreedit').value = ipData.name || '';
        document.getElementById('internet1edit').value = ipData.internet1 || '';
        document.getElementById('internet2edit').value = ipData.internet2 || '';
        document.getElementById('urledit').value = ipData.url || '';
    } catch (error) {
        console.error('Error al obtener los datos de la IP:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo cargar los datos de la IP.',
            confirmButtonText: 'Aceptar'
        });
        // Resetea el formulario y oculta el botón "Editar" en caso de error
        form.reset();
        editButton.classList.add('hidden');
    }
});
