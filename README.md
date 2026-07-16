# Autobús urbano de Xàtiva

Aplicación estática con Astro para consultar las líneas L1 y L2, sus paradas, horarios y recorridos sobre Leaflet.

## Desarrollo

```sh
npm install
npm run dev
```

Comprobación y compilación de producción:

```sh
npm run build
```

## Arquitectura

- `src/pages/`: rutas públicas de Astro.
- `src/layouts/`: documento base, metadatos y estilos compartidos.
- `src/components/`: bloques de interfaz del panel de información y del mapa.
- `src/data/`: datos de líneas, paradas, trazados y horarios.
- `src/scripts/`: controlador cliente de la experiencia interactiva.
- `src/styles/`: estilos globales y adaptaciones responsive.

La salida es completamente estática y se genera en `dist/`.

## Datos geográficos

Los recorridos precalculados están versionados en `src/data/routes/`. Se generan mediante ajuste a la red viaria de OpenStreetMap y se consumen como una única fuente desde Leaflet, el plano SVG, la animación y la descarga GeoJSON.

```sh
npm run validate:routes
npm test
```

`npm run generate:routes` regenera los trazados mediante servicios públicos de routing. Es una operación manual: sus resultados deben revisarse sobre el mapa antes de publicarlos. El build normal no realiza peticiones externas.
