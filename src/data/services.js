import l1RouteFeature from "./routes/l1.json";
import l2RouteFeature from "./routes/l2.json";

export const COLORS = {
  regular: "#2463eb",
  regularDark: "#1748b8",
  commercial: "#ea580c",
  commercialDark: "#b33c00"
};

export const regularStops = [
  { id: "l1-cosmografo-ramirez", name: "Cosmógrafo Ramírez, 14", short: "Cosmógrafo Ramírez", lat: 38.99075, lng: -0.51355, lines: ["L1"] },
  { id: "l1-academic-maravall", name: "Acadèmic Maravall / Av. de la Murta", short: "Acadèmic Maravall", lat: 38.99154, lng: -0.51664, lines: ["L1"] },
  { id: "l1-maulets", name: "Maulets / Plaça País Valencià", short: "Maulets", lat: 38.99310, lng: -0.51865, lines: ["L1", "L2"] },
  { id: "l1-pintor-guiteras", name: "Plaça Pintor Guiteras / Pare Claret", short: "Pintor Guiteras", lat: 38.99199, lng: -0.52065, lines: ["L1"] },
  { id: "l1-estacio-renfe", name: "Av. Ausiàs March / Estació RENFE", short: "Estació RENFE", lat: 38.99225, lng: -0.52464, lines: ["L1"] },
  { id: "l1-centre-salut", name: "Av. Ausiàs March / Centre de Salut", short: "Centre de Salut", lat: 38.99155, lng: -0.52715, lines: ["L1"] },
  { id: "l1-sanchis-guarner", name: "Professor Sanchis Guarner", short: "Sanchis Guarner", lat: 38.98755, lng: -0.52955, lines: ["L1"] },
  { id: "l1-hort-mora", name: "Metge Lluís Alcanyís / Plaça Hort de Mora", short: "Hort de Mora", lat: 38.98430, lng: -0.52765, lines: ["L1"] },
  { id: "l1-martinez-bellver", name: "Ventura Pascual / CEIP Martínez Bellver", short: "Martínez Bellver", lat: 38.98663, lng: -0.52575, lines: ["L1"] },
  { id: "l1-espanyoleto", name: "Plaça Espanyoleto / Centre d’Especialitats", short: "Espanyoleto", lat: 38.98779, lng: -0.52389, lines: ["L1"] },
  { id: "l1-albereda-jaume-i-18", name: "Albereda Jaume I, 18 (Joieria Sancho)", short: "Albereda Jaume I, 18", lat: 38.98955, lng: -0.52295, lines: ["L1", "L2"] },
  { id: "l1-font-lleo", name: "Albereda Jaume I, 164 (Font del Lleó)", short: "Font del Lleó", lat: 38.99000, lng: -0.51875, lines: ["L1"] },
  { id: "l1-albereda-selgas", name: "Albereda Selgas (Farmàcia Llanderal)", short: "Albereda Selgas", lat: 38.99055, lng: -0.51640, lines: ["L1"] },
  { id: "l1-avinguda-ribera", name: "Av. de la Ribera", short: "Av. de la Ribera", lat: 38.99440, lng: -0.51140, lines: ["L1"], note: "La tabla municipal de 2025 la identifica como Av. de la Ribera; algunas fichas de terceros muestran Av. de la Murta." },
  { id: "l1-hospital", name: "Hospital Lluís Alcanyís", short: "Hospital", lat: 39.00665, lng: -0.50959, lines: ["L1"] }
];

export const commercialStops = [
  { id: "l2-albereda-jaume-i-18", name: "Albereda Jaume I, 18 (Joieria Sancho)", short: "Albereda Jaume I, 18", lat: 38.98955, lng: -0.52295, lines: ["L1", "L2"] },
  { id: "l2-maulets", name: "Maulets / Plaça País Valencià", short: "Maulets", lat: 38.99310, lng: -0.51865, lines: ["L1", "L2"] },
  { id: "l2-ronda-nord", name: "Ronda Nord / Burger King", short: "Ronda Nord", lat: 38.996761, lng: -0.518964, lines: ["L2"] },
  { id: "l2-ciutat-esport", name: "Ciutat de l’Esport / Decathlon", short: "Ciutat de l’Esport", lat: 38.99532, lng: -0.52953, lines: ["L2"] },
  { id: "l2-mercadona-skatepark", name: "Mercadona (Polígon / Skatepark)", short: "Mercadona / Skatepark", lat: 38.99749, lng: -0.52658, lines: ["L2"] },
  { id: "l2-family-cash", name: "Family Cash", short: "Family Cash", lat: 39.00012, lng: -0.52589, lines: ["L2"] },
  { id: "l2-plaza-mayor", name: "Centre Comercial Plaza Mayor", short: "Plaza Mayor", lat: 39.00350, lng: -0.52935, lines: ["L2"] }
];

function routeFromGeoJSON(feature) {
  return feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
}

export const regularRoute = routeFromGeoJSON(l1RouteFeature);
export const commercialRoute = routeFromGeoJSON(l2RouteFeature);

export const regularDepartures = [
  "07:20", "07:50", "08:24", "09:02", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00",
  "12:30", "13:00", "13:30", "14:00", "14:30"
];

export const regularHospitalArrivals = [
  "07:48", "08:22", "08:59", "09:28", "09:58",
  "10:28", "10:58", "11:28", "11:58", "12:28",
  "12:58", "13:28", "13:58", "14:28", "15:10"
];

export const commercialDepartures = [
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30", "20:00", "20:30", "21:00"
];

export const services = {
  regular: {
    code: "L1",
    name: "Regular · Hospital",
    description: "Lunes a viernes no festivos",
    style: "línea azul continua",
    stops: regularStops,
    route: regularRoute,
    routeFeature: l1RouteFeature,
    routeMetadata: l1RouteFeature.properties,
    stopOccurrences: l1RouteFeature.properties.stopOccurrences,
    labelPoint: [38.9989, -0.5109],
    departures: regularDepartures,
    offsets: [0, 2, 5, 8, 10, 12, 14, 16, 17, 18, 20, 23, 24, 26, 28],
    segments: [2, 3, 3, 2, 2, 2, 2, 1, 1, 2, 3, 1, 2, 2],
    color: COLORS.regular
  },
  commercial: {
    code: "L2",
    name: "Zona Comercial",
    description: "Viernes, sábados y vísperas de festivo",
    style: "línea naranja discontinua",
    stops: commercialStops,
    route: commercialRoute,
    routeFeature: l2RouteFeature,
    routeMetadata: l2RouteFeature.properties,
    stopOccurrences: l2RouteFeature.properties.stopOccurrences,
    labelPoint: [39.0016, -0.5282],
    departures: commercialDepartures,
    offsets: [0, 5, 8, 11, 13, 15, 16],
    segments: [5, 3, 3, 2, 2, 1],
    color: COLORS.commercial
  }
};
