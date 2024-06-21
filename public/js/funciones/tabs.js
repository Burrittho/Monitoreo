// Lógica de tabs inicio.html
document.addEventListener('DOMContentLoaded', function() {
    const tabLinks = document.querySelectorAll('.tab-link');

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