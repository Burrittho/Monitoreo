# 🌐 Sistema de Monitoreo de Red

Sistema completo de monitoreo de conectividad de red con frontend React y backend Node.js para el seguimiento de sucursales, DVRs y servidores.

## 🚀 Características Principales

- **Monitoreo en tiempo real** de ping para múltiples IPs
- **Dashboard interactivo** con métricas y gráficas
- **Sistema de reportes** de incidencias de conectividad
- **Gestión de proveedores** de internet por sucursal
- **Alertas automatizadas** por correo electrónico
- **Interfaz moderna** construida con React y Tailwind CSS

## 📋 Tecnologías

### Backend
- **Node.js** con Express
- **MySQL** para base de datos
- **Nodemailer** para notificaciones por email
- **net-ping** para monitoreo de conectividad

### Frontend
- **React 18** con hooks modernos
- **Vite** para desarrollo y build
- **Tailwind CSS** para estilos
- **Chart.js** para gráficas interactivas

## 🛠️ Instalación

### Prerrequisitos
- Node.js 16+ 
- MySQL 8+
- npm o yarn

### Configuración Backend

1. **Clonar el repositorio:**
```bash
git clone https://github.com/Burrittho/Monitoreo.git
cd Monitoreo
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**
```bash
cp .env.example .env
```
Editar `.env` con tus credenciales de base de datos y email.

4. **Configurar la base de datos:**
- Crear base de datos MySQL
- Importar esquema desde `/database/schema.sql`

### Configuración Frontend

1. **Navegar al directorio frontend:**
```bash
cd frontend
```

2. **Instalar dependencias del frontend:**
```bash
npm install
```

## 🎯 Uso

### Desarrollo

1. **Iniciar el backend:**
```bash
npm start
```
El servidor estará disponible en `http://localhost:3000`

2. **Iniciar el frontend (en otra terminal):**
```bash
cd frontend
npm run dev
```
El frontend estará disponible en `http://localhost:5173`

### Producción

1. **Construir el frontend:**
```bash
cd frontend
npm run build
```

2. **Iniciar en producción:**
```bash
npm run start
```

## 📊 Funcionalidades del Sistema

### Monitor de Red
- Visualización en tiempo real del estado de conectividad
- Métricas de latencia, uptime y packet loss
- Alertas visuales para dispositivos desconectados

### Analytics
- Gráficas históricas de latencia
- Estadísticas de disponibilidad
- Reportes de tiempo de actividad

### Gestión de Reportes
- Crear reportes de incidencias
- Seguimiento de estado de tickets
- Integración con información de proveedores

### Configuración
- Gestión de IPs monitoreadas
- Configuración de proveedores por sucursal
- Ajustes de intervalos de monitoreo

## 🔧 Estructura del Proyecto

```
Monitoreo/
├── frontend/                 # Aplicación React
│   ├── src/
│   │   ├── components/      # Componentes reutilizables
│   │   ├── pages/           # Páginas principales
│   │   ├── hooks/           # Custom hooks
│   │   └── utils/           # Utilidades
├── controllers/             # Controladores del backend
├── models/                  # Modelos de datos
├── routes/                  # Rutas API
├── config/                  # Configuración de DB y email
└── tests/                   # Tests automatizados
```

## 🌐 API Endpoints

### Monitoreo
- `GET /api/ping-results` - Estado actual de IPs
- `GET /api/chart-data` - Datos para gráficas
- `GET /api/dashboard-metrics` - Métricas generales

### Reportes
- `GET /api/reports/reportes` - Lista de reportes
- `POST /api/reports/crear-reporte` - Crear nuevo reporte
- `PUT /api/reports/reporte/:id` - Actualizar reporte

### Configuración
- `GET /api/ips` - Lista de IPs monitoreadas
- `POST /api/addips` - Agregar nueva IP
- `DELETE /api/deleteips/:id` - Eliminar IP

## 🔐 Seguridad

- Variables de entorno para credenciales sensibles
- Gitignore configurado para excluir archivos confidenciales
- Validación de inputs en formularios
- Sanitización de datos en consultas SQL

## 📝 Contribuir

1. Fork del proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📜 Licencia

Este proyecto está licenciado bajo ISC License.

## 👥 Autor

**CarlosG** - Desarrollo inicial

## 🐛 Reporte de Bugs

Si encuentras algún bug, por favor crea un issue en GitHub describiendo:
- Pasos para reproducir el error
- Comportamiento esperado vs actual
- Capturas de pantalla si es aplicable
- Información del entorno (OS, versión Node.js, etc.)

## 🔄 Actualizaciones

Para mantener el proyecto actualizado:

```bash
git pull origin master
npm install
cd frontend && npm install
```

---

**Nota:** Asegúrate de mantener tus credenciales de base de datos y email seguras en el archivo `.env` y nunca las subas al repositorio.
