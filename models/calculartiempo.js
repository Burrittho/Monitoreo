// Función para calcular la duración del tiempo sin sistema
function calculateDuration(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate - startDate;
    const diffHrs = Math.floor((diffMs % 86400000) / 3600000);
    const diffMins = Math.floor(((diffMs % 86400000) % 3600000) / 60000);
    return `${diffHrs} horas y ${diffMins} minutos`;
}

module.exports = { calculateDuration };