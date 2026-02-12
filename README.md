# Monitoreo

## Tests unitarios (Jest)

Este repositorio usa **Jest** para pruebas unitarias de lógica pura y validación de query params.

### Qué se está probando

- Lógica de consecutivos/downtime (sin acceso a BD).
- Validadores de query params (`ipId`, rango de fechas, `limit/offset`).
- Validaciones de rutas con **mocks/stubs** de capa de datos (`models/grafica`) para evitar dependencia de BD real.

## Ejecución local

1. Instalar dependencias (incluye devDependencies):

```bash
npm ci
```

2. Ejecutar tests:

```bash
npm test
```

## Ejecución en CI

En CI se recomienda usar instalación limpia y modo CI de Jest:

```bash
npm ci
npm run test:ci
```

### Ejemplo (GitHub Actions)

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: npm

- run: npm ci
- run: npm run test:ci
```
