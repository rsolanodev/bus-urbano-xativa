export const COLORS = {
  regular: "#2463eb",
  regularDark: "#1748b8",
  commercial: "#ea580c",
  commercialDark: "#b33c00"
};

export const regularStops = [
  { name: "Cosmógrafo Ramírez, 14", short: "Cosmógrafo Ramírez", lat: 38.99075, lng: -0.51355, lines: ["L1"] },
  { name: "Acadèmic Maravall / Av. de la Murta", short: "Acadèmic Maravall", lat: 38.99154, lng: -0.51664, lines: ["L1"] },
  { name: "Maulets / Plaça País Valencià", short: "Maulets", lat: 38.99310, lng: -0.51865, lines: ["L1", "L2"] },
  { name: "Plaça Pintor Guiteras / Pare Claret", short: "Pintor Guiteras", lat: 38.99199, lng: -0.52065, lines: ["L1"] },
  { name: "Av. Ausiàs March / Estació RENFE", short: "Estació RENFE", lat: 38.99225, lng: -0.52464, lines: ["L1"] },
  { name: "Av. Ausiàs March / Centre de Salut", short: "Centre de Salut", lat: 38.99155, lng: -0.52715, lines: ["L1"] },
  { name: "Professor Sanchis Guarner", short: "Sanchis Guarner", lat: 38.98755, lng: -0.52955, lines: ["L1"] },
  { name: "Metge Lluís Alcanyís / Plaça Hort de Mora", short: "Hort de Mora", lat: 38.98430, lng: -0.52765, lines: ["L1"] },
  { name: "Ventura Pascual / CEIP Martínez Bellver", short: "Martínez Bellver", lat: 38.98663, lng: -0.52575, lines: ["L1"] },
  { name: "Plaça Espanyoleto / Centre d’Especialitats", short: "Espanyoleto", lat: 38.98779, lng: -0.52389, lines: ["L1"] },
  { name: "Albereda Jaume I, 18 (Joieria Sancho)", short: "Albereda Jaume I, 18", lat: 38.98955, lng: -0.52295, lines: ["L1", "L2"] },
  { name: "Albereda Jaume I, 164 (Font del Lleó)", short: "Font del Lleó", lat: 38.99000, lng: -0.51875, lines: ["L1"] },
  { name: "Albereda Selgas (Farmàcia Llanderal)", short: "Albereda Selgas", lat: 38.99055, lng: -0.51640, lines: ["L1"] },
  { name: "Av. de la Ribera", short: "Av. de la Ribera", lat: 38.99440, lng: -0.51140, lines: ["L1"], note: "La tabla municipal de 2025 la identifica como Av. de la Ribera; algunas fichas de terceros muestran Av. de la Murta." },
  { name: "Hospital Lluís Alcanyís", short: "Hospital", lat: 39.00665, lng: -0.50959, lines: ["L1"] }
];

export const commercialStops = [
  { name: "Albereda Jaume I, 18 (Joieria Sancho)", short: "Albereda Jaume I, 18", lat: 38.98955, lng: -0.52295, lines: ["L1", "L2"] },
  { name: "Maulets / Plaça País Valencià", short: "Maulets", lat: 38.99310, lng: -0.51865, lines: ["L1", "L2"] },
  { name: "Ronda Nord / Burger King", short: "Ronda Nord", lat: 38.996761, lng: -0.518964, lines: ["L2"] },
  { name: "Ciutat de l’Esport / Decathlon", short: "Ciutat de l’Esport", lat: 38.99532, lng: -0.52953, lines: ["L2"] },
  { name: "Mercadona (Polígon / Skatepark)", short: "Mercadona / Skatepark", lat: 38.99749, lng: -0.52658, lines: ["L2"] },
  { name: "Family Cash", short: "Family Cash", lat: 39.00012, lng: -0.52589, lines: ["L2"] },
  { name: "Centre Comercial Plaza Mayor", short: "Plaza Mayor", lat: 39.00350, lng: -0.52935, lines: ["L2"] }
];

export const regularRoute = [
  [38.99075, -0.51355],
  [38.99092, -0.51455],
  [38.99154, -0.51664],
  [38.99245, -0.51765],
  [38.99310, -0.51865],
  [38.99270, -0.51948],
  [38.99199, -0.52065],
  [38.99212, -0.52250],
  [38.99225, -0.52464],
  [38.99155, -0.52715],
  [38.98990, -0.52855],
  [38.98755, -0.52955],
  [38.98555, -0.52910],
  [38.98430, -0.52765],
  [38.98515, -0.52680],
  [38.98663, -0.52575],
  [38.98779, -0.52389],
  [38.98905, -0.52320],
  [38.98955, -0.52295],
  [38.98988, -0.52100],
  [38.99000, -0.51875],
  [38.99055, -0.51640],
  [38.99155, -0.51480],
  [38.99320, -0.51245],
  [38.99440, -0.51140],
  [38.99660, -0.51095],
  [38.99940, -0.51055],
  [39.00240, -0.51015],
  [39.00500, -0.50975],
  [39.00665, -0.50959],
  [39.00710, -0.51045],
  [39.00625, -0.51135],
  [39.00340, -0.51245],
  [39.00020, -0.51315],
  [38.99720, -0.51335],
  [38.99470, -0.51315],
  [38.99270, -0.51305],
  [38.99075, -0.51355]
];

export const commercialRoute = [
  [38.98955, -0.52295],
  [38.99045, -0.52070],
  [38.99310, -0.51865],
  [38.99500, -0.51855],
  [38.996761, -0.518964],
  [38.99780, -0.52060],
  [38.99725, -0.52345],
  [38.99625, -0.52615],
  [38.99532, -0.52953],
  [38.99705, -0.52985],
  [38.99749, -0.52658],
  [39.00012, -0.52589],
  [39.00120, -0.52840],
  [39.00350, -0.52935],
  [39.00435, -0.52755],
  [39.00350, -0.52410],
  [39.00135, -0.52225],
  [38.99875, -0.52120],
  [38.99630, -0.52180],
  [38.99460, -0.52470],
  [38.99315, -0.52815],
  [38.99110, -0.52870],
  [38.98955, -0.52295]
];

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
    departures: commercialDepartures,
    offsets: [0, 5, 8, 11, 13, 15, 16],
    segments: [5, 3, 3, 2, 2, 1],
    color: COLORS.commercial
  }
};
