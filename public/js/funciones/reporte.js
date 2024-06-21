document.addEventListener('DOMContentLoaded', function() {
    const reportForm = document.getElementById('reportForm');
    const ipReportTable = document.getElementById('ipReportTable').getElementsByTagName('tbody')[0];

    reportForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const reportPeriod = document.getElementById('reportPeriod').value;

        // Lógica para obtener datos del servidor y actualizar la tabla
        fetch(`/api/reporte?periodo=${reportPeriod}`)
            .then(response => response.json())
            .then(data => {
                // Limpiar tabla
                ipReportTable.innerHTML = '';

                // Insertar filas con datos
                data.forEach(ipData => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td class="px-4 py-2">${ipData.ip}</td>
                        <td class="px-4 py-2">${ipData.name}</td>
                        <td class="px-4 py-2">${ipData.mediaLatencia}</td>
                        <td class="px-4 py-2">${ipData.vecesCaida}</td>
                        <td class="px-4 py-2">${ipData.tiempoCaido}</td>
                    `;
                    ipReportTable.appendChild(row);
                });
            })
            .catch(error => {
                console.error('Error al obtener datos del servidor:', error);
            });
    });
});
