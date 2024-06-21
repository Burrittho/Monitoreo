// Agregar el evento 'submit' al formulario para buscar latencia
document.getElementById('searchLatencyForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevenir el comportamiento por defecto del formulario

    // Function to search latency and display chart with Chart.js
    const searchLatency = async () => {
        const { ip, searchDate, hourRange } = getFormData();

        if (!ip || !searchDate || !hourRange) return;

        const [startHour, endHour] = hourRange.split('-');
        const fromDate = new Date(`${searchDate}T${startHour}:00`);
        const toDate = new Date(`${searchDate}T${endHour}:00`);

        try {
            const queryParams = new URLSearchParams({ ip, fromDate: fromDate.toISOString(), toDate: toDate.toISOString() });
            const response = await fetch(`/api/latency-data?${queryParams.toString()}`);

            if (!response.ok) throw new Error(`Error fetching latency data: ${response.status}`);

            const data = await response.json();
            const { timestamps, latencies } = filterData(data, fromDate, toDate);

            drawLatencyChart(timestamps, latencies);

        } catch (error) {
            console.error('Error fetching latency data:', error);
            document.getElementById('searchErrorContainer').innerHTML = '<p class="text-red-500 text-sm">Error fetching latency data.</p>';
        }
    };

    // Use spread operator to avoid creating a new array for each iteration
    const filterData = (data, fromDate, toDate) => {
        const timestamps = data.filter(({ timestamp }) => {
            const timestampDate = new Date(timestamp);
            return timestampDate >= fromDate && timestampDate < toDate;
        }).map(({ timestamp }) => new Date(timestamp));

        const latencies = data.filter(({ timestamp }) => {
            const timestampDate = new Date(timestamp);
            return timestampDate >= fromDate && timestampDate < toDate;
        }).map(({ latency }) => parseFloat(latency));

        return { timestamps, latencies };
    };

    // Extract form data to a separate function
    const getFormData = () => {
        const ipInput = document.getElementById('searchIp');
        const dateInput = document.getElementById('searchDate');
        const rangeInput = document.getElementById('hourRange');

        return {
            ip: ipInput?.value.trim(),
            searchDate: dateInput?.value,
            hourRange: rangeInput?.value
        };
    };

    // Llamar a la función de búsqueda de latencia
    await searchLatency();
});

let latencyChart = null;

/**
 * Function to draw or update latency chart using Chart.js
 * @param {Array} timestamps - Array of timestamps
 * @param {Array} latencies - Array of latencies
 */
const drawLatencyChart = (timestamps, latencies) => {
    // Get the context of the 'latencyChart' canvas element
    const ctx = document.getElementById('latencyChart').getContext('2d');

    // Draw the chart using Chart.js
    latencyChart = new Chart(ctx, {
        // Set the type of chart as 'line'
        type: 'line',
        // Set the data for the chart
        data: {
            labels: timestamps,
            datasets: [{
                // Set the label for the dataset
                label: 'Latency (ms)',
                // Set the data for the dataset
                data: latencies,
                // Set the border color for each data point based on its value
                borderColor(context) {
                    return context.dataset.data[context.dataIndex] === 0 ? 'rgba(255, 99, 132, 1)' : 'rgba(75, 192, 192, 1)';
                },
                // Set the background color for each data point
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                // Set the radius of the data point
                pointRadius: 0
            }]
        },
        // Set the options for the chart
        options: {
            responsive: true, // Make the chart responsive
            animation: { duration: 0 }, // Disable animation
            elements: { line: { tension: 0 } }, // Disable line tension
            plugins: { legend: { display: false }, zoom: { zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' } } }, // Enable zooming
            interaction: { mode: 'index', intersect: false }, // Set interaction mode
            scales: { // Set scales for x and y axes
                x: { type: 'time', time: { unit: 'minute' }, title: { display: true, text: 'Time' } },
                y: { min: -50, max: 100, title: { display: true, text: 'Latency (ms)' } }
            },
            tooltips: { mode: 'index', intersect: false, callbacks: { label: tooltipItem => `Latency: ${tooltipItem.value} ms` } } // Set tooltip format
        }
    });
};
