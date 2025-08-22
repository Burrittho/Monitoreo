import { useState, useEffect } from 'react'
import { apiGet } from '../lib/api'

export function useProvidersSucursal(sucursalId){
  const [providers, setProviders] = useState([])
  const [account, setAccount] = useState('')
  
  useEffect(()=>{
    async function load(){
      if(!sucursalId){ 
        setProviders([]); 
        setAccount(''); 
        return 
      }
      
      try{
        console.log('Loading providers for sucursal:', sucursalId);
        // Get all providers and filter by sucursal_id
        const d = await apiGet(`/api/reports/proveedores-internet?sucursal=${sucursalId}`)
        console.log('Providers API response:', d);
        
        if(d?.success && Array.isArray(d?.data)) {
          const sucursalData = d.data.find(item => item.sucursal_id == sucursalId);
          console.log('Found sucursal data:', sucursalData);
          
          if(sucursalData) {
            const providersList = [];
            
            // Add primary provider if exists
            if(sucursalData.proveedor_primario && sucursalData.proveedor_primario !== 'No se detectó' && sucursalData.proveedor_primario !== 'Sin conexion' && sucursalData.proveedor_primario !== 'Sin trazado') {
              providersList.push({
                proveedor: sucursalData.proveedor_primario,
                cuenta: sucursalData.cuenta_primario,
                tipo: 'primario'
              });
            }
            
            // Add secondary provider if exists
            if(sucursalData.proveedor_secundario && sucursalData.proveedor_secundario !== 'No se detectó') {
              providersList.push({
                proveedor: sucursalData.proveedor_secundario,
                cuenta: sucursalData.cuenta_secundario,
                tipo: 'secundario'
              });
            }
            
            console.log('Processed providers list:', providersList);
            setProviders(providersList);
            
            // Auto-select first provider if available
            if(providersList.length > 0) {
              setAccount(providersList[0].cuenta || '');
            }
          } else {
            setProviders([]);
            setAccount('');
          }
        } else {
          setProviders([]);
        }
      }catch(e){ 
        console.error('Error loading providers:', e);
        setProviders([]);
        setAccount('');
      }
    }
    load()
  }, [sucursalId])

  function select(proveedor){
    console.log('Selecting provider:', proveedor);
    const p = providers.find(pr=>pr.proveedor===proveedor)
    console.log('Found provider data:', p);
    setAccount(p?.cuenta||'')
  }

  return { providers, account, select }
}
