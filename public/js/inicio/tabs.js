// Lógica de tabs inicio.html
document.addEventListener('DOMContentLoaded', function() {
    const tabLinks = document.querySelectorAll('.tab-link');
    const subTabLinks = document.querySelectorAll('.sub-tab-link');

    // Obtener el elemento de la pestaña seleccionada
    function getSelectedTab(tabId) {
        return document.getElementById(tabId);
    }

    // Mostrar el contenido de la pestaña seleccionada
    function showTab(tabId) {
        const selectedTab = getSelectedTab(tabId);
        const tabs = document.querySelectorAll('.tab-content');
        tabs.forEach(tab => {
            tab.classList.toggle('hidden', tab !== selectedTab);
        });

        // Actualizar la clase activa en el enlace de la pestaña
        tabLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${tabId}`);
        });
    }

    // Manejar el clic en los enlaces de pestaña
    tabLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const tabId = this.getAttribute('href').substring(1);
            showTab(tabId);
        });
    });

    // Mostrar la pestaña por defecto al cargar la página
    const defaultTabId = 'tab-monitor'; // Pestaña por defecto
    showTab(defaultTabId);

});

// Lógica de botones inicio.html GRUB
document.addEventListener('DOMContentLoaded', () => {
    // Obtener botones y formularios
    const btnAdd = document.getElementById('tab-agregar');
    const btnEdit = document.getElementById('btn-edit');
    const btnDelete = document.getElementById('btn-delete');

    const formAdd = document.getElementById('form-add');
    const formEdit = document.getElementById('form-edit');
    const formDelete = document.getElementById('form-delete');

    // Función para mostrar el formulario seleccionado y ocultar los demás
    function showForm(selectedForm) {
        formAdd.classList.add('hidden');
        formEdit.classList.add('hidden');
        formDelete.classList.add('hidden');

        selectedForm.classList.remove('hidden');
    }

    // Asignar eventos a los botones
    btnAdd.addEventListener('click', () => showForm(formAdd));
    btnEdit.addEventListener('click', () => showForm(formEdit));
    btnDelete.addEventListener('click', () => showForm(formDelete));
});
