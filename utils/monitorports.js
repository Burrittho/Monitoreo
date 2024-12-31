async function startMonitoring() {
    const ip = document.getElementById('ip').value;
    const community = document.getElementById('community').value;
    const snmpVersion = parseInt(document.getElementById('snmpVersion').value);
  
    try {
      const response = await fetch('http://192.168.13.167:3000/api/monitor-ports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ip, community, snmpVersion })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al monitorear los puertos");
      }
  
      const portStatuses = await response.json();
      if (!Array.isArray(portStatuses)) {
        throw new TypeError("La respuesta no es un arreglo");
      }
  
      portStatuses.forEach(port => {
        console.log(`Puerto ${port.port}: ${port.status}`);
      });
    } catch (error) {
      console.error("Error al monitorear los puertos:", error);
    }
  }
  