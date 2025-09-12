import { useEffect, useMemo, useState, useCallback } from 'react'
import { apiGet, apiPost } from '../lib/api'
import { REPORT_STATUS } from '../constants/status'
import { PRIORIDADES } from '../constants/priorities'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { useSortable } from '../hooks/useSortable'
import { useProvidersSucursal } from '../hooks/useProvidersSucursal'
import ReportForm from '../components/reportes/ReportForm'
import ReportesTable from '../components/reportes/ReportesTable'
import ReportDetailModal from '../components/reportes/ReportDetailModal'
import InternetTable from '../components/internet/InternetTable'
import ServicesTable from '../components/servicios/ServicesTable'
import { normalizeReporte, normalizeInternetRow } from '../utils/normalize'
import ServicesFilters from '../components/servicios/ServicesFilters'

function SectionTabs({ section, setSection, reportCount = 0 }) {
  const tabs = [
    { id: 'check-internet', label: 'Estado Internet', icon: 'fas fa-network-wired' },
    { id: 'servicios-internet', label: 'Servicios', icon: 'fas fa-server' },
    { id: 'reportes-incidencias', label: `Gestión Reportes (${reportCount})`, icon: 'fas fa-file-alt' },
  ];

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSection(tab.id)}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 ${
              section === tab.id
                ? 'border-gray-600 text-gray-700 dark:text-gray-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <i className={`${tab.icon} mr-2 w-4 h-4`} />
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Pagination({ page, total, perPage, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  if (totalPages <= 1) return null
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, start + 4)
  return (
    <div className="flex items-center justify-between mt-4 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="text-sm text-gray-700 dark:text-gray-300">
        Mostrando <span className="font-medium">{((page-1)*perPage)+1}</span> a <span className="font-medium">{Math.min(page*perPage, total)}</span> de <span className="font-medium">{total}</span>
      </div>
      <div className="flex space-x-1">
        <button 
          onClick={() => onChange(page-1)} 
          disabled={page===1} 
          className="inline-flex items-center justify-center w-8 h-8 text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i className="fas fa-chevron-left w-4 h-4"/>
        </button>
        {Array.from({length: end-start+1}).map((_,i)=>{
          const p = start+i
          return (
            <button 
              key={p} 
              onClick={() => onChange(p)} 
              className={`inline-flex items-center justify-center w-8 h-8 text-sm font-medium border rounded-md transition-colors ${
                p === page
                  ? 'bg-gray-50 dark:bg-gray-700 border-gray-600 dark:border-gray-500 text-gray-700 dark:text-gray-300'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {p}
            </button>
          )
        })}
        <button 
          onClick={() => onChange(page+1)} 
          disabled={page===totalPages} 
          className="inline-flex items-center justify-center w-8 h-8 text-gray-400 dark:text-gray-500 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <i className="fas fa-chevron-right w-4 h-4"/>
        </button>
      </div>
    </div>
  )
}

export default function Reportes() {
  const [section, setSection] = useState('servicios-internet')

  // Estado Conexiones Internet
  const [internetData, setInternetData] = useState([])
  const [internetLoading, setInternetLoading] = useState(false)
  const [internetError, setInternetError] = useState('')
  const [internetPage, setInternetPage] = useState(1)
  const [internetLimit, setInternetLimit] = useState(10) // default 10
  // Filtro simple por sucursal
  const [internetSucursalFilter, setInternetSucursalFilter] = useState('')

  async function loadInternet() {
    try {
      setInternetLoading(true)
      setInternetError('')
      // solicitar suficientes registros para ordenar localmente
      const params = new URLSearchParams({ page: '1', limit: '1000' })
      const data = await apiGet(`/api/reports/internet-data?${params}`)
      const rows = Array.isArray(data?.data)?data.data:[]
      setInternetData(rows.map(normalizeInternetRow))
    } catch (e) { setInternetError(e.message) } finally { setInternetLoading(false) }
  }

  // Servicios
  const [allServicesData, setAllServicesData] = useState([]) // Todos los datos
  const [servicesLoading, setServicesLoading] = useState(false)
  const [servicesError, setServicesError] = useState('')
  const [servicesFilters, setServicesFilters] = useState({ sucursal: '', search: '' })
  const [servicesPage, setServicesPage] = useState(1)
  
  // Modal para detalles de servicios
  const [selectedService, setSelectedService] = useState(null)
  const [showModal, setShowModal] = useState(false)

  // Reportes
  const [reportes, setReportes] = useState([])
  const [reportesLoading, setReportesLoading] = useState(false)
  const [reportesError, setReportesError] = useState('')
  const [sucursales, setSucursales] = useState([])
  const [form, setForm] = useState({ sucursal_id:'', proveedor:'', prioridad:PRIORIDADES.MEDIA, numero_ticket:'', descripcion:'' })
  const [creating, setCreating] = useState(false)
  const [createMsg, setCreateMsg] = useState({ type:'', text:'' })
  const [detalleReporte, setDetalleReporte] = useState(null)
  const [concluding, setConcluding] = useState(false)
  const [reportesFilterEstado, setReportesFilterEstado] = useState('abierto') // abierto | concluido
  const [filterSucursal, setFilterSucursal] = useState('')
  const { providers: providersSucursal, account: selectedProviderAccount, select: selectProvider } = useProvidersSucursal(form.sucursal_id)

  // useEffect principal - después de todas las declaraciones de estado
  useEffect(()=>{ 
    if(section==='check-internet') {
      loadInternet();
      if(sucursales.length===0) loadSucursales();
    }
    if(section==='servicios-internet') {
      loadServices();
      if(sucursales.length===0) loadSucursales();
    }
    if(section==='reportes-incidencias'){ 
      loadReportes(); 
      if(sucursales.length===0) loadSucursales() 
    } 
  }, [section, reportesFilterEstado, filterSucursal])

  // Replace manual sorting with useSortable for internetData
  const sortAccessors = {
    sucursal: r => (r.sucursal_nombre || `Sucursal #${r.sucursal_id||''}`).toString().toLowerCase(),
    proveedorPrim: r => (r.proveedor_primario || 'zzz').toLowerCase(),
    puertoPrim: r => (r.interfaz_primario || 'zzz').toLowerCase(),
    configPrim: r => (r.tipo_primario || 'zzz').toLowerCase(),
    ipPrim: r => (r.ip_primario || 'zzz').toLowerCase(),
    estadoPrim: r => (r.estado_primario || 'zzz').toLowerCase(),
    proveedorSec: r => (r.proveedor_secundario || 'zzz').toLowerCase(),
    puertoSec: r => (r.interfaz_secundario || 'zzz').toLowerCase(),
    configSec: r => (r.tipo_secundario || 'zzz').toLowerCase(),
    ipSec: r => (r.ip_secundario || 'zzz').toLowerCase(),
    estadoSec: r => (r.estado_secundario || 'zzz').toLowerCase(),
    fecha: r => (r.fecha ? new Date(r.fecha).getTime() : 0)
  }
  
  // Filtrar por sucursal si está seleccionada
  const filteredInternetData = useMemo(() => {
    if (!internetSucursalFilter) return internetData;
    return internetData.filter(item => 
      item.sucursal_id === parseInt(internetSucursalFilter)
    );
  }, [internetData, internetSucursalFilter]);
  
  const { data: sortedInternet, sortField, sortDir, toggleSort } = useSortable(filteredInternetData, sortAccessors, { defaultField:'sucursal' })
  const totalInternet = sortedInternet.length
  const paginatedInternet = useMemo(()=>{ const start=(internetPage-1)*internetLimit; return sortedInternet.slice(start, start+internetLimit) }, [sortedInternet, internetPage, internetLimit])

  function header(label, fieldKey) {
    const active = sortField === fieldKey
    const icon = !active ? 'fa-sort' : (sortDir==='asc' ? 'fa-sort-up' : 'fa-sort-down')
    return (
      <button type="button" onClick={()=>toggleSort(fieldKey)} className={`flex items-center gap-1 group select-none ${active?'text-gray-700 dark:text-gray-300':''}`}
      > 
        <span>{label}</span>
        <i className={`fas ${icon} text-[10px] opacity-70 group-hover:opacity-100`}/>
      </button>
    )
  }

  // Filtrar y paginar servicios del lado del cliente
  const filteredServicesData = useMemo(() => {
    let filtered = allServicesData;
    
    // Filtrar por sucursal
    if (servicesFilters.sucursal) {
      filtered = filtered.filter(item => 
        item.sucursal_id === parseInt(servicesFilters.sucursal)
      );
    }
    
    // Filtrar por búsqueda de cuenta (busca en ambas cuentas)
    if (servicesFilters.search) {
      const searchTerm = servicesFilters.search.toLowerCase();
      filtered = filtered.filter(item => {
        const cuentaPrimario = (item.cuenta_primario || '').toLowerCase();
        const cuentaSecundario = (item.cuenta_secundario || '').toLowerCase();
        return cuentaPrimario.includes(searchTerm) || cuentaSecundario.includes(searchTerm);
      });
    }
    
    return filtered;
  }, [allServicesData, servicesFilters]);
  
  const servicesTotal = filteredServicesData.length;
  const servicesData = useMemo(() => {
    const start = (servicesPage - 1) * 20;
    return filteredServicesData.slice(start, start + 20);
  }, [filteredServicesData, servicesPage]);
  
  async function loadServices(){ 
    try { 
      setServicesLoading(true); 
      setServicesError(''); 
      // Cargar todos los datos para filtrar del lado del cliente
      const params = new URLSearchParams({ 
        page: '1', 
        limit: '1000' // Cargar más datos para tener todo disponible
      }); 
      const data = await apiGet(`/api/reports/proveedores-internet?${params}`); 
      if(data?.success){ 
        setAllServicesData(Array.isArray(data.data) ? data.data : []); 
      } else throw new Error(data?.error || 'Error al cargar servicios') 
    } catch(e){ 
      setServicesError(e.message)
    } finally { 
      setServicesLoading(false)
    } 
  }

  function openServiceModal(service) {
    setSelectedService(service)
    setShowModal(true)
  }

  function closeServiceModal() {
    setSelectedService(null)
    setShowModal(false)
  }

  // (Variables de reportes ya declaradas arriba - eliminando duplicados)

  async function loadReportes(){
    try {
      setReportesLoading(true); 
      setReportesError('');
      
      const params = new URLSearchParams();
      if(reportesFilterEstado) params.append('estado', reportesFilterEstado);
      if(filterSucursal) params.append('sucursal_id', filterSucursal);
      
      console.log('Loading reportes with params:', params.toString());
      const d = await apiGet(`/api/reports/reportes?${params.toString()}`);
      console.log('API response:', d);
      
      const arr = Array.isArray(d?.data) ? d.data : [];
      console.log('Processed reportes:', arr);
      setReportes(arr.map(normalizeReporte));
    } catch(e){ 
      console.error('Error loading reportes:', e);
      setReportesError(e.message) 
    } finally { 
      setReportesLoading(false) 
    }
  }

  async function loadSucursales(){ 
    try { 
      console.log('Loading sucursales...');
      const d = await apiGet('/api/reports/sucursales'); 
      console.log('Sucursales response:', d);
      setSucursales(Array.isArray(d) ? d : (d?.data || [])) 
    } catch(e){
      console.error('Error loading sucursales:', e);
    } 
  }

  function toMySQLDateTime(local){ 
    if(!local) return ''; 
    const d = new Date(local); 
    if(isNaN(d)) return ''; 
    const pad = n => String(n).padStart(2,'0'); 
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00` 
  }

  async function crearReporte(e){ 
    e.preventDefault(); 
    setCreateMsg({type:'',text:''}); 
    
    try { 
      if(!form.sucursal_id || !form.proveedor){ 
        setCreateMsg({type:'error',text:'Selecciona sucursal y proveedor'}); 
        return 
      } 
      
      setCreating(true); 
      const payload = { ...form, sucursal_id: Number(form.sucursal_id) }; 
      console.log('Creating reporte with payload:', payload);
      
      const response = await apiPost('/api/reports/crear-reporte', payload); 
      console.log('Create reporte response:', response);
      
      setCreateMsg({type:'success',text:'Reporte creado'}); 
      setForm({sucursal_id:'', proveedor:'', prioridad:PRIORIDADES.MEDIA, numero_ticket:'', descripcion:''}); 
      
      // Reload reports after creating
      loadReportes();
    } catch(e){ 
      console.error('Error creating reporte:', e);
      setCreateMsg({type:'error', text:`Error: ${e.message}`}) 
    } finally { 
      setCreating(false); 
    } 
  }

  // Confirm dialog state
  const [confirmData, setConfirmData] = useState({ open:false, id:null })
  async function concluirReporte(id){ if(!id || concluding) return; setConfirmData({ open:true, id }) }
  async function doConclude(){ try { setConcluding(true); await apiPost(`/api/reports/reporte/${confirmData.id}/concluir`, {}); setDetalleReporte(null); setConfirmData({open:false,id:null}); loadReportes(); } catch(e){ console.error(e) } finally { setConcluding(false) } }

  const activeReportsCount = useMemo(()=> reportes.filter(r=>r.estado !== REPORT_STATUS.CONCLUIDO).length, [reportes])
  
  // Resetear página cuando cambian los filtros de internet
  useEffect(() => {
    setInternetPage(1);
  }, [internetSucursalFilter]);
  function estadoBadgeClass(estado){ const s=(estado||'').toLowerCase(); if(s===REPORT_STATUS.ABIERTO) return 'bg-red-100 text-red-800'; if(s===REPORT_STATUS.CERRADO) return 'bg-green-100 text-green-800'; return 'bg-gray-100 text-gray-800' }
  
  // Resetear página cuando cambian los filtros de servicios
  useEffect(() => {
    setServicesPage(1);
  }, [servicesFilters])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Confirm Dialog */}
      <ConfirmDialog 
        open={confirmData.open} 
        loading={concluding} 
        title="Cerrar reporte" 
        message="¿Confirmas que deseas cerrar este reporte?" 
        confirmText="Cerrar" 
        cancelText="Cancelar" 
        onCancel={() => setConfirmData({open: false, id: null})} 
        onConfirm={doConclude} 
      />

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Gestión de Reportes</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Monitoreo y administración de servicios de conectividad</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <SectionTabs section={section} setSection={setSection} reportCount={activeReportsCount} />
        </div>

      {/* Check Internet Section */}
      {section === 'check-internet' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Estado de Conexiones</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monitoreo en tiempo real del estado de conectividad</p>
              </div>
              <div className="flex items-center space-x-4">
                <select 
                  value={internetSucursalFilter} 
                  onChange={e => setInternetSucursalFilter(e.target.value)}
                  className="block w-auto px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                >
                  <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Todas las sucursales</option>
                  {sucursales.map(s => (
                    <option key={s.id} value={s.id} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      {s.name}
                    </option>
                  ))}
                </select>
                <select 
                  value={internetLimit} 
                  onChange={e => {setInternetLimit(Number(e.target.value)); setInternetPage(1)}} 
                  className="block w-auto px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                >
                  <option value={10} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">10 filas</option>
                  <option value={20} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">20 filas</option>
                  <option value={30} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">30 filas</option>
                  <option value={50} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">50 filas</option>
                </select>
              </div>
            </div>
          </div>
          <div className="p-6">
            <InternetTable 
              data={paginatedInternet} 
              loading={internetLoading} 
              error={internetError} 
              total={totalInternet} 
              limit={internetLimit} 
              page={internetPage} 
              setPage={setInternetPage} 
              header={header} 
            />
            {totalInternet > internetLimit && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Pagination 
                  page={internetPage} 
                  total={totalInternet} 
                  perPage={internetLimit} 
                  onChange={p => setInternetPage(p)} 
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Services Section */}
      {section === 'servicios-internet' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Servicios de Internet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Administración de proveedores y configuraciones</p>
            </div>
          </div>
          <div className="p-6">
            {/* Filtros Compactos */}
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px] max-w-[300px]">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Sucursal
                </label>
                <select
                  value={servicesFilters.sucursal}
                  onChange={(e) => {
                    setServicesFilters(prev => ({ ...prev, sucursal: e.target.value }));
                  }}
                  className="block w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                >
                  <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Todas las sucursales</option>
                  {sucursales.map(s => (
                    <option key={s.id} value={s.id} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px] max-w-[300px]">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Buscar cuenta
                </label>
                <input
                  type="text"
                  value={servicesFilters.search}
                  onChange={(e) => {
                    setServicesFilters(prev => ({ ...prev, search: e.target.value }));
                  }}
                  placeholder="Cuenta primaria o secundaria..."
                  className="block w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                onClick={() => {
                  setServicesFilters({ sucursal: '', search: '' });
                }}
                className="px-3 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                <i className="fas fa-times w-3 h-3" />
              </button>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <ServicesTable 
                data={servicesData} 
                loading={servicesLoading} 
                error={servicesError} 
                total={servicesTotal} 
                limit={20} 
                page={servicesPage} 
                setPage={setServicesPage} 
                onOpen={openServiceModal}
                header={(label, fieldKey) => (
                  <button className="text-left font-medium text-gray-700 dark:text-gray-300">
                    {label}
                  </button>
                )} 
              />
            </div>
            {servicesTotal > 20 && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Pagination 
                  page={servicesPage} 
                  total={servicesTotal} 
                  perPage={20} 
                  onChange={p => setServicesPage(p)} 
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reports Section */}
      {section === 'reportes-incidencias' && (
        <div className="space-y-8">
          {/* Report Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Crear Nuevo Reporte</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Registra una nueva incidencia de conectividad</p>
              </div>
            </div>
            <div className="p-6">
              <ReportForm 
                sucursales={sucursales} 
                form={form} 
                setForm={setForm} 
                providersSucursal={providersSucursal} 
                selectedProviderAccount={selectedProviderAccount} 
                createMsg={createMsg} 
                creating={creating} 
                onSubmit={crearReporte} 
                onProviderSelect={selectProvider}
              />
            </div>
          </div>

          {/* Reports Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Reportes de Incidencias</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{reportes.length} reportes registrados ({activeReportsCount} activos)</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-700">
                    <button
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        reportesFilterEstado === 'abierto'
                          ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700' 
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                      onClick={() => setReportesFilterEstado('abierto')}
                    >
                      Abiertos ({activeReportsCount})
                    </button>
                    <button
                      className={`px-4 py-2 text-sm font-medium border-l border-gray-300 dark:border-gray-600 transition-colors ${
                        reportesFilterEstado === 'concluido'
                          ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }`}
                      onClick={() => setReportesFilterEstado('concluido')}
                    >
                      Concluidos ({reportes.length - activeReportsCount})
                    </button>
                  </div>
                  {sucursales.length > 0 && (
                    <select 
                      value={filterSucursal} 
                      onChange={e => setFilterSucursal(e.target.value)} 
                      className="block w-auto px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 shadow-sm"
                    >
                      <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">Todas las sucursales</option>
                      {sucursales.map(s => (
                        <option key={s.id} value={s.id} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6">
              <ReportesTable 
                reportes={reportes} 
                loading={reportesLoading} 
                error={reportesError} 
                filterEstado={reportesFilterEstado} 
                cerradoValue={REPORT_STATUS.CONCLUIDO} 
                onDetalle={setDetalleReporte} 
                onConcluir={concluirReporte} 
                concluding={concluding} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      <ReportDetailModal 
        reporte={detalleReporte} 
        isOpen={!!detalleReporte} 
        onClose={() => setDetalleReporte(null)} 
        onConcluir={concluirReporte} 
        canConclude={detalleReporte?.estado !== REPORT_STATUS.CONCLUIDO} 
      />

      {/* Service Detail Modal */}
      {showModal && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Información de la Sucursal
                </h3>
                <button
                  onClick={closeServiceModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <i className="fas fa-times w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              
              {/* Información General */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Información General</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Sucursal:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{selectedService.sucursal_nombre || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Proveedor Primario */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Proveedor Primario</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Proveedor:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{selectedService.proveedor_primario || 'No configurado'}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Cuenta:</span>
                    <span className="ml-2 text-gray-900 dark:text-white font-mono">{selectedService.cuenta_primario || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Instalación:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{selectedService.Instalacion_primario || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Correo:</span>
                    <span className="ml-2 text-gray-900 dark:text-white break-all">{selectedService.Correo_primario || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Proveedor Secundario */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Proveedor Secundario</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Proveedor:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{selectedService.proveedor_secundario || 'No configurado'}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Cuenta:</span>
                    <span className="ml-2 text-gray-900 dark:text-white font-mono">{selectedService.cuenta_secundario || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Instalación:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{selectedService.Instalacion_secundario || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Correo:</span>
                    <span className="ml-2 text-gray-900 dark:text-white break-all">{selectedService.Correo_secundario || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Ubicación</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Estado:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{selectedService.Estado || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Ciudad:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{selectedService.Ciudad || 'N/A'}</span>
                  </div>
                </div>
                {selectedService.Direccion && (
                  <div className="mt-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Dirección:</span>
                    <p className="mt-1 text-gray-900 dark:text-white">{selectedService.Direccion}</p>
                  </div>
                )}
                {selectedService.maps && (
                  <div className="mt-3">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Ubicación en Maps:</span>
                    <div className="mt-1 flex items-center gap-2">
                      <a 
                        href={selectedService.maps.startsWith('http') ? selectedService.maps : `https://maps.google.com/maps?q=${encodeURIComponent(selectedService.maps)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                      >
                        <i className="fas fa-external-link-alt mr-2" />
                        Ver en Maps
                      </a>
                      <span className="text-sm text-gray-500 dark:text-gray-400 font-mono break-all">
                        {selectedService.maps}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <div className="flex justify-end">
                <button
                  onClick={closeServiceModal}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
