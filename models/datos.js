// Función asincrónica para obtener la lista de IPs desde el servidor
async function GetIP() {
    let listaip = [];
    try {
        const response = await fetch('/ips'); // Realiza una solicitud GET para obtener las IPs
        const [data] = await response.json();  // Convierte la respuesta en JSON
        listaip = data;
        return data;  // Devuelve los datos
    } catch (error) {
        console.error('Error fetching IPs:', error);
    }
}

module.exports = { GetIP };

