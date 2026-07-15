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
