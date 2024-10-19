// Función asincrónica para obtener datos de latencia para un IP específico y un rango de fechas
  async function getLatency(ipId, startDate, endDate) {
    try {
        const response = await fetch(`/latency?ipId=${ipId}&startDate=${startDate}&endDate=${endDate}`);
        if (!response.ok) throw new Error('Error fetching latency data');
        return await response.json();
    } catch (error) {
        console.error('Error fetching latency:', error);
        throw error;
    }
  }
  
  // Función asincrónica para obtener datos de pérdida de paquetes para un IP específico y un rango de fechas
  async function getPacketLoss(ipId, startDate, endDate) {
    try {
        const response = await fetch(`/packetloss?ipId=${ipId}&startDate=${startDate}&endDate=${endDate}`);
        if (!response.ok) throw new Error('Error fetching packet loss data');
        return await response.json();
    } catch (error) {
        console.error('Error fetching packet loss:', error);
        throw error;
    }
  }
  
  // Función asincrónica para obtener datos de períodos de inactividad (downtime) para un IP específico y un rango de fechas
  async function getDowntime(ipId, startDate, endDate) {
    try {
        const response = await fetch(`/downtime?ipId=${ipId}&startDate=${startDate}&endDate=${endDate}`);
        if (!response.ok) throw new Error('Error fetching downtime data');
        return await response.json();
    } catch (error) {
        console.error('Error fetching downtime:', error);
        throw error;
    }
  }
  
  // Función para formatear una fecha en formato corto con hora en formato 24 horas
  function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' };
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', options);
  }
  
  // Event listener para inicializar la página después de que el DOM esté completamente cargado
  document.addEventListener('DOMContentLoaded', async () => {
    const NameSelect = document.getElementById('NameSelect');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const resultLatency = document.getElementById('resultLatency');
    const resultPacketLoss = document.getElementById('resultPacketLoss');
    const resultDowntime = document.getElementById('resultDowntime');
    const downtimeCount = document.getElementById('downtimeCount');
  

    try{
    // Cargar IPs en el selector
         // Hacer una solicitud al servidor para obtener las IPs
         const response = await fetch('/ips');  // Asegúrate de que este endpoint esté implementado
         if (!response.ok) {
             throw new Error('Failed to fetch IPs');
         }
 
         const [ips] = await response.json();  // Obtener las IPs como JSON
         listdelete = ips;
        ips.forEach(ip => {
        const option = document.createElement('option');
        option.value = ip.id;
        option.text = ip.name || ip.ip;
        NameSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading IPs:', error);
        alert('Failed to load IPs.');
    }

    document.getElementById('getMetrics').addEventListener('click', async () => {
      const ipId = NameSelect.value;
      const startDate = startDateInput.value;
      const endDate = endDateInput.value;
        
        // Verificar que las fechas sean válidas
        if (!ipId || !startDate || !endDate) {
            alert('Please select an IP and specify both start and end dates.');
            return;
        }
       
        // Verificar que startDate sea antes de endDate
        if (startDate >= endDate) {
            alert('The start date must be earlier than the end date.');
            return;
        }

        
  
        try {
            // Mostrar el símbolo de carga usando SweetAlert2
            Swal.fire({
                title: 'Cargando...',
                html: 'Por favor espera.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

        const [latencyData, packetLossData, downtimeData] = await Promise.all([
          getLatency(ipId, startDate, endDate),
          getPacketLoss(ipId, startDate, endDate),
          getDowntime(ipId, startDate, endDate)
        ]);
  
        Swal.close(); // Cerrar el símbolo de carga

        resultLatency.textContent = latencyData ? `Latencia media: ${latencyData.average_latency} ms` : 'Error fetching latency data';
        resultPacketLoss.textContent = packetLossData ? `Paquetes perdidos: ${packetLossData.packet_loss}` : 'Error fetching packet loss data';
  
        if (downtimeData) {
          resultDowntime.innerHTML = `
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inicio Caida</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fin Caida</th>
                  <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duracion sin Respuesta</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${downtimeData.map(d => `
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(d.downtime_start)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(d.downtime_end)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${d.downtime_duration}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
          downtimeCount.textContent = `Cantidad sin sistema: ${downtimeData.length}`;
        } else {
          resultDowntime.textContent = 'Error al obtener tiempo de caída';
        }
        
      } catch (error) {
        console.error('Error al actualizar metricas:', error);
        Swal.close(); // Cerrar el símbolo de carga en caso de error
        resultLatency.textContent = 'Error al cargar latencia';
        resultPacketLoss.textContent = 'Error al cargar paquetes perdidos';
        resultDowntime.textContent = 'Error al cargar tiempo de caída';
      }
    });
  });
  
  
  