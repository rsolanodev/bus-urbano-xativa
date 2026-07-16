import L from "leaflet";

import {
  COLORS,
  commercialDepartures,
  commercialRoute,
  commercialStops,
  regularDepartures,
  regularHospitalArrivals,
  regularRoute,
  regularStops,
  services
} from "../data/services.js";
import {
  buildRouteMetrics,
  getOccurrenceIndexAtDistance,
  sampleRouteAtDistance
} from "./route-geometry.js";

const TOUR_SPEED_MPS = 300;
Object.values(services).forEach(service => {
  service.routeMetrics = buildRouteMetrics(service.route);
});

const state = {
      activeService: "regular",
      selectedTrip: { regular: 0, commercial: 0 },
      selectedStop: { regular: 0, commercial: 0 },
      visible: { regular: true, commercial: false },
      activeTab: "stops",
      search: "",
      animationTimer: null,
      animationFrame: null,
      animationRunning: false,
      toastTimer: null
    };

    let map = null;
    let leafletReady = false;
    let layers = {};
    let markerRefs = { regular: [], commercial: [] };
    let vehicleMarker = null;
    let fallbackVehicleMarker = null;
    let fallbackProjection = null;
    let userMarker = null;
    let userAccuracy = null;

    const dom = {
      routeSummary: document.getElementById("routeSummary"),
      tripSelect: document.getElementById("tripSelect"),
      tripChips: document.getElementById("tripChips"),
      tripInsight: document.getElementById("tripInsight"),
      tripNote: document.getElementById("tripNote"),
      stopSearch: document.getElementById("stopSearch"),
      clearSearch: document.getElementById("clearSearch"),
      stopList: document.getElementById("stopList"),
      scheduleTitle: document.getElementById("scheduleTitle"),
      scheduleLead: document.getElementById("scheduleLead"),
      frequencyCard: document.getElementById("frequencyCard"),
      scheduleTable: document.getElementById("scheduleTable"),
      playTour: document.getElementById("playTour"),
      mapHeadline: document.getElementById("mapHeadline"),
      mapSubline: document.getElementById("mapSubline"),
      toast: document.getElementById("toast"),
      fallbackMap: document.getElementById("fallbackMap"),
      fallbackCanvas: document.getElementById("fallbackCanvas"),
      fallbackPopup: document.getElementById("fallbackPopup")
    };

    function toMinutes(time) {
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m;
    }

    function formatMinutes(total) {
      const safe = ((total % 1440) + 1440) % 1440;
      const h = Math.floor(safe / 60);
      const m = safe % 60;
      return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
    }

    function addMinutes(time, amount) {
      return formatMinutes(toMinutes(time) + amount);
    }

    function durationMinutes(start, end) {
      let result = toMinutes(end) - toMinutes(start);
      if (result < 0) result += 1440;
      return result;
    }

    function normalize(text) {
      return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function getService() {
      return services[state.activeService];
    }

    function getTripIndex(serviceKey = state.activeService) {
      return state.selectedTrip[serviceKey];
    }

    function getDeparture(serviceKey, tripIndex = getTripIndex(serviceKey)) {
      return services[serviceKey].departures[tripIndex];
    }

    function getPassTime(serviceKey, stopIndex, tripIndex = getTripIndex(serviceKey)) {
      const service = services[serviceKey];
      if (serviceKey === "regular" && stopIndex === service.stops.length - 1) {
        return { time: regularHospitalArrivals[tripIndex], kind: "publicado" };
      }
      return {
        time: addMinutes(service.departures[tripIndex], service.offsets[stopIndex]),
        kind: "estimado"
      };
    }

    function getGap(serviceKey, tripIndex, direction = "previous") {
      const departures = services[serviceKey].departures;
      const other = direction === "previous" ? tripIndex - 1 : tripIndex + 1;
      if (other < 0 || other >= departures.length) return null;
      const start = direction === "previous" ? departures[other] : departures[tripIndex];
      const end = direction === "previous" ? departures[tripIndex] : departures[other];
      return durationMinutes(start, end);
    }

    function getPublishedDuration(tripIndex) {
      return durationMinutes(regularDepartures[tripIndex], regularHospitalArrivals[tripIndex]);
    }

    function linesHtml(lines) {
      return lines.map(line =>
        `<span class="line-mini ${line.toLowerCase()}">${escapeHtml(line)}</span>`
      ).join("");
    }

    function renderAll() {
      renderServiceTabs();
      renderSummary();
      renderTripControls();
      renderStopList();
      renderSchedule();
      renderMapHeading();
      syncLayerButtons();
      updateMapLayers();
      updateMarkerStylesAndPopups();
    }

    function renderServiceTabs() {
      document.querySelectorAll(".service-tab").forEach(button => {
        const active = button.dataset.service === state.activeService;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
      });
    }

    function renderSummary() {
      const key = state.activeService;
      if (key === "regular") {
        dom.routeSummary.className = "route-summary regular";
        dom.routeSummary.innerHTML = `
          <div class="summary-heading">
            <div>
              <h2>L1 · Cosmógrafo Ramírez → Hospital</h2>
          <p>El Ayuntamiento publica 8,89 km; el trazado reconstruido es orientativo.</p>
            </div>
            <span class="schedule-kind">laborable</span>
          </div>
          <div class="summary-grid">
            <div class="metric"><strong>15</strong><span>paradas</span></div>
            <div class="metric"><strong>15</strong><span>vueltas</span></div>
            <div class="metric"><strong>07:20</strong><span>primera</span></div>
            <div class="metric"><strong>14:30</strong><span>última salida</span></div>
          </div>
        `;
      } else {
        dom.routeSummary.className = "route-summary commercial";
        dom.routeSummary.innerHTML = `
          <div class="summary-heading">
            <div>
              <h2>L2 · Albereda → Plaza Mayor</h2>
              <p>7 paradas únicas; la ficha cuenta 8 al repetir Albereda al cerrar la vuelta.</p>
            </div>
            <span class="schedule-kind">comercial</span>
          </div>
          <div class="summary-grid">
            <div class="metric"><strong>7</strong><span>paradas únicas</span></div>
            <div class="metric"><strong>11</strong><span>vueltas</span></div>
            <div class="metric"><strong>16:00</strong><span>primera</span></div>
            <div class="metric"><strong>21:00</strong><span>última salida</span></div>
          </div>
        `;
      }
    }

    function renderTripControls() {
      const key = state.activeService;
      const service = services[key];
      const selected = state.selectedTrip[key];

      dom.tripSelect.innerHTML = service.departures.map((time, index) => {
        const suffix = key === "regular"
          ? ` · Hospital ${regularHospitalArrivals[index]}`
          : ` · regreso ≈${addMinutes(time, 30)}`;
        return `<option value="${index}" ${index === selected ? "selected" : ""}>Vuelta ${index + 1} · ${time}${suffix}</option>`;
      }).join("");

      dom.tripChips.innerHTML = service.departures.map((time, index) => `
        <button class="trip-chip ${key} ${index === selected ? "active" : ""}" type="button" data-trip="${index}" aria-pressed="${index === selected}">
          V${index + 1} · ${time}
        </button>
      `).join("");

      if (key === "regular") {
        const departure = regularDepartures[selected];
        const hospital = regularHospitalArrivals[selected];
        const duration = getPublishedDuration(selected);
        const previousGap = getGap(key, selected, "previous");
        const nextGap = getGap(key, selected, "next");
        const frequencyLabel = previousGap !== null
          ? `${previousGap} min`
          : (nextGap !== null ? `${nextGap} min` : "—");

        dom.tripInsight.innerHTML = `
          <div class="insight-card"><strong>${departure}</strong><span>salida oficial</span></div>
          <div class="insight-card"><strong>${hospital}</strong><span>Hospital publicado</span></div>
          <div class="insight-card"><strong>${frequencyLabel}</strong><span>intervalo cercano</span></div>
        `;

        const delta = duration - 28;
        const variationText = delta === 0
          ? "Esta vuelta sigue el patrón estándar de unos 28 minutos hasta el Hospital."
          : delta > 0
            ? `Esta vuelta incorpora una adaptación publicada: ${duration} min hasta el Hospital, ${delta} min más que el patrón estándar.`
            : `Esta vuelta figura con ${duration} min hasta el Hospital, ${Math.abs(delta)} min menos que el patrón estándar.`;
        dom.tripNote.innerHTML = `<strong>Vuelta ${selected + 1}:</strong> ${variationText} Los pasos intermedios que muestra el mapa son estimados.`;
      } else {
        const departure = commercialDepartures[selected];
        dom.tripInsight.innerHTML = `
          <div class="insight-card"><strong>${departure}</strong><span>salida Albereda</span></div>
          <div class="insight-card"><strong>≈${addMinutes(departure, 16)}</strong><span>Plaza Mayor</span></div>
          <div class="insight-card"><strong>≈${addMinutes(departure, 30)}</strong><span>vuelta completa</span></div>
        `;
        dom.tripNote.innerHTML = `<strong>Frecuencia:</strong> una salida cada 30 minutos. Servicio publicado para viernes, sábados y vísperas de festivo; sin servicio ordinario los domingos.`;
      }
    }

    function renderStopList() {
      const key = state.activeService;
      const service = services[key];
      const selectedTrip = state.selectedTrip[key];
      const query = normalize(state.search.trim());

      const filtered = service.stops
        .map((stop, index) => ({ stop, index }))
        .filter(({ stop }) => !query || normalize(`${stop.name} ${stop.short}`).includes(query));

      if (!filtered.length) {
        dom.stopList.innerHTML = `<div class="empty-state">No hay paradas que coincidan con “${escapeHtml(state.search)}”.</div>`;
        return;
      }

      dom.stopList.innerHTML = filtered.map(({ stop, index }) => {
        const pass = getPassTime(key, index, selectedTrip);
        let segmentText;
        if (index < service.stops.length - 1) {
          segmentText = `→ ${service.stops[index + 1].short} · ≈${service.segments[index]} min`;
        } else if (key === "commercial") {
          segmentText = "↻ regreso a Albereda · ≈14 min";
        } else {
          segmentText = "Fin del recorrido publicado";
        }

        return `
          <button
            class="stop-item ${key} ${state.selectedStop[key] === index ? "active" : ""}"
            type="button"
            data-stop="${index}"
            aria-label="Parada ${index + 1}, ${escapeHtml(stop.name)}, paso ${pass.time}"
          >
            <span class="stop-index ${key}">${index + 1}</span>
            <span class="stop-copy">
              <span class="stop-name">${escapeHtml(stop.name)}</span>
              <span class="stop-meta">${linesHtml(stop.lines)} <span>${escapeHtml(segmentText)}</span></span>
            </span>
            <span class="stop-time"><strong>${pass.time}</strong><span>${pass.kind}</span></span>
          </button>
        `;
      }).join("");
    }

    function renderSchedule() {
      const key = state.activeService;
      const service = services[key];
      const selected = state.selectedTrip[key];

      if (key === "regular") {
        dom.scheduleTitle.textContent = "15 vueltas laborables";
        dom.scheduleLead.textContent = "Salidas oficiales desde Cosmógrafo Ramírez. El intervalo habitual es de 30 minutos; los huecos publicados oscilan entre 28 y 38 minutos.";
      } else {
        dom.scheduleTitle.textContent = "11 vueltas de Zona Comercial";
        dom.scheduleLead.textContent = "Salidas estimadas cada 30 minutos desde Albereda Jaume I, 18, entre las 16:00 y las 21:00.";
      }

      const gaps = service.departures.slice(1).map((time, i) => durationMinutes(service.departures[i], time));
      const average = gaps.reduce((sum, gap) => sum + gap, 0) / Math.max(1, gaps.length);
      const min = Math.min(...gaps);
      const max = Math.max(...gaps);
      const badge = key === "regular"
        ? `media ${average.toFixed(1).replace(".", ",")} min`
        : "cada 30 min";

      dom.frequencyCard.innerHTML = `
        <div class="frequency-top">
          <div>
            <strong>Secuencia de salidas</strong>
            <span>${key === "regular" ? `Intervalos: ${min}–${max} min` : "Intervalo uniforme de 30 min"}</span>
          </div>
          <span class="frequency-badge">${badge}</span>
        </div>
        <div class="frequency-strip">
          ${service.departures.map((time, index) => {
            const gap = index === 0 ? null : durationMinutes(service.departures[index - 1], time);
            const width = gap ? Math.max(64, gap * 2.15) : 64;
            return `
              <div class="freq-step" style="width:${width}px">
                <span class="freq-dot ${key}">${index + 1}</span>
                <span class="freq-time">${time}</span>
                <span class="freq-gap">${gap ? `+${gap} min` : "inicio"}</span>
              </div>
            `;
          }).join("")}
        </div>
      `;

      if (key === "regular") {
        dom.scheduleTable.innerHTML = `
          <table>
            <thead>
              <tr><th>Vuelta</th><th>Cosmógrafo</th><th>Intervalo</th><th>Hospital publicado</th><th>Duración</th></tr>
            </thead>
            <tbody>
              ${regularDepartures.map((departure, index) => {
                const gap = index === 0 ? null : durationMinutes(regularDepartures[index - 1], departure);
                const duration = getPublishedDuration(index);
                return `
                  <tr class="${index === selected ? "selected" : ""}" data-table-trip="${index}">
                    <td><strong>V${index + 1}</strong></td>
                    <td class="time-cell">${departure}</td>
                    <td>${gap === null ? "—" : `<span class="gap-pill">${gap} min</span>`}</td>
                    <td class="time-cell">${regularHospitalArrivals[index]}</td>
                    <td>${duration} min</td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        `;
      } else {
        dom.scheduleTable.innerHTML = `
          <table>
            <thead>
              <tr><th>Vuelta</th><th>Salida Albereda</th><th>Plaza Mayor ≈</th><th>Regreso ≈</th><th>Frecuencia</th></tr>
            </thead>
            <tbody>
              ${commercialDepartures.map((departure, index) => `
                <tr class="${index === selected ? "selected" : ""}" data-table-trip="${index}">
                  <td><strong>V${index + 1}</strong></td>
                  <td class="time-cell">${departure}</td>
                  <td class="time-cell">${addMinutes(departure, 16)}</td>
                  <td class="time-cell">${addMinutes(departure, 30)}</td>
                  <td><span class="gap-pill">30 min</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        `;
      }
    }

    function renderMapHeading() {
      const service = getService();
      dom.mapHeadline.textContent = `${service.code} · ${service.name}`;
      dom.mapSubline.textContent = `${service.description} · ${service.departures.length} vueltas · ${service.style}`;
    }

    function setActiveService(serviceKey, options = {}) {
      if (!services[serviceKey]) return;
      stopAnimation();
      state.activeService = serviceKey;
      state.search = "";
      dom.stopSearch.value = "";

      if (!options.preserveVisibility) {
        state.visible.regular = serviceKey === "regular";
        state.visible.commercial = serviceKey === "commercial";
      } else {
        state.visible[serviceKey] = true;
      }

      renderAll();
      if (options.fit !== false) fitVisibleLayers();
    }

    function selectTrip(index) {
      const service = getService();
      if (!Number.isInteger(index) || index < 0 || index >= service.departures.length) return;
      state.selectedTrip[state.activeService] = index;
      renderTripControls();
      renderStopList();
      renderSchedule();
      updateMarkerStylesAndPopups();
    }

    function selectStop(serviceKey, index, focusMap = true) {
      if (!services[serviceKey] || !services[serviceKey].stops[index]) return;
      if (serviceKey !== state.activeService) {
        stopAnimation();
        state.activeService = serviceKey;
        state.visible[serviceKey] = true;
        renderServiceTabs();
        renderSummary();
        renderTripControls();
        renderSchedule();
        renderMapHeading();
      }
      state.selectedStop[serviceKey] = index;
      renderStopList();
      updateMarkerStylesAndPopups();

      if (focusMap && leafletReady) {
        const marker = markerRefs[serviceKey][index];
        if (marker) {
          map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 15), { duration: .65 });
          setTimeout(() => marker.openPopup(), 450);
        }
      } else if (!leafletReady) {
        showFallbackPopup(serviceKey, index);
      }
    }

    function switchTab(tab) {
      if (!["stops", "schedule", "info"].includes(tab)) return;
      state.activeTab = tab;
      document.querySelectorAll(".tab-btn").forEach(button => {
        const active = button.dataset.tab === tab;
        button.classList.toggle("active", active);
        button.setAttribute("aria-selected", String(active));
      });
      document.getElementById("panel-stops").hidden = tab !== "stops";
      document.getElementById("panel-schedule").hidden = tab !== "schedule";
      document.getElementById("panel-info").hidden = tab !== "info";
    }

    function createStopIcon(serviceKey, index, selected) {
      const stop = services[serviceKey].stops[index];
      const shared = stop.lines.length > 1;
      return L.divIcon({
        className: "stop-div-icon",
        html: `<div class="map-stop-marker ${serviceKey} ${selected ? "selected" : ""} ${shared ? "shared" : ""}">${index + 1}</div>`,
        iconSize: [31, 31],
        iconAnchor: [15.5, 15.5],
        popupAnchor: [0, -17]
      });
    }

    function popupHtml(serviceKey, stopIndex) {
      const service = services[serviceKey];
      const stop = service.stops[stopIndex];
      const tripIndex = state.selectedTrip[serviceKey];
      const pass = getPassTime(serviceKey, stopIndex, tripIndex);
      const departure = service.departures[tripIndex];
      let nextText;

      if (stopIndex < service.stops.length - 1) {
        nextText = `Siguiente: ${service.stops[stopIndex + 1].short} · ≈${service.segments[stopIndex]} min`;
      } else if (serviceKey === "commercial") {
        nextText = "Regreso estimado a Albereda en unos 14 min.";
      } else {
        nextText = "Llegada publicada al Hospital para esta vuelta.";
      }

      const extra = stop.note ? `<p class="popup-note">${escapeHtml(stop.note)}</p>` : "";

      return `
        <span class="popup-route ${serviceKey}">${service.code} · Vuelta ${tripIndex + 1}</span>
        <h3 class="popup-title">${stopIndex + 1}. ${escapeHtml(stop.name)}</h3>
        <div class="popup-time">
          <div class="popup-metric"><strong>${pass.time}</strong><span>paso ${pass.kind}</span></div>
          <div class="popup-metric"><strong>${departure}</strong><span>salida de vuelta</span></div>
        </div>
        <p class="popup-note">${escapeHtml(nextText)}<br>Capas disponibles: ${stop.lines.join(" · ")}.</p>
        ${extra}
      `;
    }

    function addRouteToLayer(serviceKey) {
      const service = services[serviceKey];
      const layer = layers[serviceKey];
      const dashed = serviceKey === "commercial";

      L.polyline(service.route, {
        color: "#ffffff",
        weight: dashed ? 10 : 11,
        opacity: .92,
        lineCap: "round",
        lineJoin: "round",
        interactive: false
      }).addTo(layer);

      L.polyline(service.route, {
        color: service.color,
        weight: dashed ? 5 : 6,
        opacity: .95,
        dashArray: dashed ? "11 9" : null,
        lineCap: "round",
        lineJoin: "round",
        interactive: true
      })
        .bindTooltip(
          `${service.code} · ${service.name}`,
          { sticky: true, direction: "top", opacity: .95 }
        )
        .addTo(layer);

      L.marker(service.labelPoint, {
        interactive: false,
        icon: L.divIcon({
          className: "route-label-icon",
          html: `<span class="route-map-label ${serviceKey}">${service.code}</span>`,
          iconSize: [42, 26],
          iconAnchor: [21, 13]
        })
      }).addTo(layer);

      markerRefs[serviceKey] = service.stops.map((stop, index) => {
        const marker = L.marker([stop.lat, stop.lng], {
          icon: createStopIcon(serviceKey, index, state.selectedStop[serviceKey] === index),
          keyboard: true,
          title: `${index + 1}. ${stop.name}`,
          riseOnHover: true
        });

        marker.bindTooltip(`${index + 1} · ${stop.short}`, {
          direction: "top",
          offset: [0, -13],
          opacity: .93
        });
        marker.bindPopup(popupHtml(serviceKey, index), { maxWidth: 270 });
        marker.on("click", () => {
          state.visible[serviceKey] = true;
          selectStop(serviceKey, index, false);
        });
        marker.addTo(layer);
        return marker;
      });
    }

    function initMap() {
      if (typeof L === "undefined") {
        initFallbackMap();
        return;
      }

      leafletReady = true;
      map = L.map("map", {
        zoomControl: false,
        minZoom: 12,
        maxZoom: 19,
        preferCanvas: true
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.control.scale({ imperial: false, position: "bottomright" }).addTo(map);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'
      }).addTo(map);

      layers.regular = L.featureGroup();
      layers.commercial = L.featureGroup();

      addRouteToLayer("regular");
      addRouteToLayer("commercial");

      updateMapLayers();
      fitVisibleLayers();

      map.on("popupopen", event => {
        const marker = event.popup._source;
        for (const key of ["regular", "commercial"]) {
          const index = markerRefs[key].indexOf(marker);
          if (index >= 0) {
            if (key !== state.activeService) stopAnimation();
            state.activeService = key;
            state.selectedStop[key] = index;
            renderServiceTabs();
            renderSummary();
            renderTripControls();
            renderStopList();
            renderSchedule();
            renderMapHeading();
            syncLayerButtons();
            return;
          }
        }
      });

      setTimeout(() => map.invalidateSize(), 100);
    }

    function updateMapLayers() {
      if (leafletReady) {
        for (const key of ["regular", "commercial"]) {
          const layer = layers[key];
          if (!layer) continue;
          const visible = state.visible[key];
          if (visible && !map.hasLayer(layer)) map.addLayer(layer);
          if (!visible && map.hasLayer(layer)) map.removeLayer(layer);
        }
      } else {
        document.querySelectorAll("[data-fallback-group]").forEach(group => {
          group.style.display = state.visible[group.dataset.fallbackGroup] ? "" : "none";
        });
      }
    }

    function updateMarkerStylesAndPopups() {
      if (!leafletReady) {
        document.querySelectorAll("[data-fallback-stop]").forEach(node => {
          const [serviceKey, indexText] = node.dataset.fallbackStop.split(":");
          node.classList.toggle("fallback-selected", state.selectedStop[serviceKey] === Number(indexText));
        });
        return;
      }

      for (const key of ["regular", "commercial"]) {
        markerRefs[key].forEach((marker, index) => {
          marker.setIcon(createStopIcon(key, index, state.selectedStop[key] === index));
          marker.setPopupContent(popupHtml(key, index));
        });
      }
    }

    function syncLayerButtons() {
      document.querySelectorAll(".layer-toggle").forEach(button => {
        const active = state.visible[button.dataset.layer];
        button.setAttribute("aria-pressed", String(active));
      });
    }

    function fitVisibleLayers() {
      if (!leafletReady) return;
      const latLngs = [];
      for (const key of ["regular", "commercial"]) {
        if (state.visible[key]) {
          services[key].route.forEach(point => latLngs.push(point));
        }
      }
      if (!latLngs.length) return;
      map.fitBounds(L.latLngBounds(latLngs), {
        paddingTopLeft: [45, 85],
        paddingBottomRight: [55, 60],
        animate: true,
        duration: .6
      });
    }

    function toggleLayer(serviceKey) {
      stopAnimation();
      const other = serviceKey === "regular" ? "commercial" : "regular";
      if (state.visible[serviceKey] && !state.visible[other]) {
        showToast("Debe permanecer visible al menos una ruta.");
        return;
      }
      state.visible[serviceKey] = !state.visible[serviceKey];
      if (state.visible[serviceKey]) state.activeService = serviceKey;
      else if (state.visible[other]) state.activeService = other;
      renderAll();
      fitVisibleLayers();
    }

    function stopAnimation() {
      if (state.animationTimer) {
        clearTimeout(state.animationTimer);
        state.animationTimer = null;
      }
      if (state.animationFrame) {
        cancelAnimationFrame(state.animationFrame);
        state.animationFrame = null;
      }
      state.animationRunning = false;
      dom.playTour.innerHTML = `<span aria-hidden="true">▶</span><span class="play-label">Recorrer</span>`;
      dom.playTour.disabled = false;
      if (leafletReady && vehicleMarker) {
        map.removeLayer(vehicleMarker);
        vehicleMarker = null;
      }
      if (fallbackVehicleMarker) {
        fallbackVehicleMarker.hidden = true;
      }
    }

    function showVehicle(position) {
      if (leafletReady) {
        if (!vehicleMarker) {
          vehicleMarker = L.marker(position, {
            zIndexOffset: 1000,
            icon: L.divIcon({
              className: "bus-div-icon",
              html: `<div class="bus-dot" aria-label="Autobús">🚌</div>`,
              iconSize: [38, 38],
              iconAnchor: [19, 19]
            })
          }).addTo(map);
        } else {
          vehicleMarker.setLatLng(position);
        }
        return;
      }

      if (fallbackVehicleMarker && fallbackProjection) {
        const [x, y] = projectFallback(
          position[0],
          position[1],
          fallbackProjection.bounds,
          fallbackProjection.width,
          fallbackProjection.height,
          fallbackProjection.padding
        );
        fallbackVehicleMarker.hidden = false;
        fallbackVehicleMarker.setAttribute("transform", `translate(${x} ${y})`);
      }
    }

    function selectTourOccurrence(serviceKey, occurrenceIndex) {
      const occurrence = services[serviceKey].stopOccurrences[occurrenceIndex];
      if (!occurrence || state.selectedStop[serviceKey] === occurrence.stopIndex) return;
      state.selectedStop[serviceKey] = occurrence.stopIndex;
      renderStopList();
      updateMarkerStylesAndPopups();
      if (!leafletReady) showFallbackPopup(serviceKey, occurrence.stopIndex);
    }

    function finishTour(serviceKey, originalStop) {
      state.animationFrame = null;
      state.animationTimer = setTimeout(() => {
        state.animationTimer = null;
        state.selectedStop[serviceKey] = originalStop;
        renderStopList();
        updateMarkerStylesAndPopups();
        stopAnimation();
        showToast(`${services[serviceKey].code}: vuelta completa visualizada.`);
      }, 700);
    }

    function playTour() {
      if (state.animationRunning) {
        stopAnimation();
        return;
      }

      const key = state.activeService;
      const service = services[key];
      const originalStop = state.selectedStop[key];

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        showToast("Movimiento reducido activo: usa la lista de paradas para recorrer la línea.");
        return;
      }

      state.animationRunning = true;
      dom.playTour.innerHTML = `<span aria-hidden="true">■</span><span class="play-label">Detener</span>`;

      const startedAt = performance.now();
      const durationMs = service.routeMetrics.totalDistanceM / TOUR_SPEED_MPS * 1000;
      let activeOccurrence = -1;
      let lastPanAt = 0;

      function frame(now) {
        if (!state.animationRunning) return;
        const progress = Math.min(1, (now - startedAt) / durationMs);
        const distanceAlongM = service.routeMetrics.totalDistanceM * progress;
        const sample = sampleRouteAtDistance(
          service.route,
          service.routeMetrics.cumulativeDistances,
          distanceAlongM
        );
        showVehicle(sample.position);

        const occurrenceIndex = getOccurrenceIndexAtDistance(service.stopOccurrences, distanceAlongM);
        if (occurrenceIndex !== activeOccurrence) {
          activeOccurrence = occurrenceIndex;
          selectTourOccurrence(key, occurrenceIndex);
        }
        if (leafletReady && now - lastPanAt > 500) {
          map.panInside(sample.position, { padding: [70, 70], animate: false });
          lastPanAt = now;
        }

        if (progress === 1) finishTour(key, originalStop);
        else state.animationFrame = requestAnimationFrame(frame);
      }

      state.animationFrame = requestAnimationFrame(frame);
    }

    function locateUser() {
      if (!navigator.geolocation) {
        showToast("Este navegador no ofrece geolocalización.");
        return;
      }

      showToast("Solicitando tu ubicación…");
      navigator.geolocation.getCurrentPosition(
        position => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = position.coords.accuracy;

          if (!leafletReady) {
            showToast("Ubicación obtenida; el mapa base no está disponible.");
            return;
          }

          if (userMarker) map.removeLayer(userMarker);
          if (userAccuracy) map.removeLayer(userAccuracy);

          userMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: "stop-div-icon",
              html: `<div class="user-location" title="Tu ubicación"></div>`,
              iconSize: [18, 18],
              iconAnchor: [9, 9]
            }),
            zIndexOffset: 1200
          }).addTo(map).bindPopup(`Tu ubicación aproximada<br><small>Precisión: ±${Math.round(accuracy)} m</small>`);

          userAccuracy = L.circle([lat, lng], {
            radius: accuracy,
            color: "#10b981",
            weight: 1,
            fillColor: "#10b981",
            fillOpacity: .08
          }).addTo(map);

          map.flyTo([lat, lng], 15, { duration: .8 });
          userMarker.openPopup();
          showToast("Ubicación mostrada.");
        },
        error => {
          const message = error.code === 1
            ? "No se ha concedido permiso de ubicación."
            : "No se ha podido obtener la ubicación.";
          showToast(message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    }

    function showToast(message) {
      clearTimeout(state.toastTimer);
      dom.toast.textContent = message;
      dom.toast.classList.add("show");
      state.toastTimer = setTimeout(() => dom.toast.classList.remove("show"), 2800);
    }

    function projectFallback(lat, lng, bounds, width, height, pad) {
      const x = pad + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (width - pad * 2);
      const y = height - pad - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * (height - pad * 2);
      return [x, y];
    }

    function initFallbackMap() {
      document.getElementById("map").style.display = "none";
      dom.fallbackMap.hidden = false;

      const all = regularRoute.concat(commercialRoute);
      const bounds = {
        minLat: Math.min(...all.map(p => p[0])) - .001,
        maxLat: Math.max(...all.map(p => p[0])) + .001,
        minLng: Math.min(...all.map(p => p[1])) - .001,
        maxLng: Math.max(...all.map(p => p[1])) + .001
      };
      const W = 1100;
      const H = 780;
      const P = 68;
      fallbackProjection = { bounds, width: W, height: H, padding: P };

      function points(route) {
        return route.map(([lat, lng]) => projectFallback(lat, lng, bounds, W, H, P).join(",")).join(" ");
      }

      function stopSvg(serviceKey, stop, index) {
        const [x, y] = projectFallback(stop.lat, stop.lng, bounds, W, H, P);
        const color = services[serviceKey].color;
        return `
          <g data-fallback-stop="${serviceKey}:${index}" role="button" tabindex="0" style="cursor:pointer">
            <circle cx="${x}" cy="${y}" r="14" fill="${color}" stroke="#fff" stroke-width="5"></circle>
            <text x="${x}" y="${y + 3.5}" text-anchor="middle" fill="#fff" font-size="9" font-weight="900">${index + 1}</text>
          </g>
        `;
      }

      dom.fallbackCanvas.innerHTML = `
        <svg viewBox="0 0 ${W} ${H}" aria-label="Plano esquemático de las rutas">
          <defs>
            <pattern id="grid" width="55" height="55" patternUnits="userSpaceOnUse">
              <path d="M 55 0 L 0 0 0 55" fill="none" stroke="#cbd8e4" stroke-width="1"></path>
            </pattern>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#10233f" flood-opacity=".22"></feDropShadow>
            </filter>
          </defs>
          <rect width="${W}" height="${H}" fill="#e8f0f6"></rect>
          <rect width="${W}" height="${H}" fill="url(#grid)" opacity=".85"></rect>
          <path d="M50 610 C260 540 350 690 600 610 S910 535 1060 590" fill="none" stroke="#d7e5d8" stroke-width="85" opacity=".8"></path>
          <path d="M90 170 C300 230 580 90 1040 210" fill="none" stroke="#d9e8f5" stroke-width="34" opacity=".9"></path>
          <text x="540" y="435" text-anchor="middle" fill="#9aabba" font-size="66" font-weight="800" opacity=".32">XÀTIVA</text>

          <g data-fallback-group="regular" filter="url(#shadow)">
            <polyline points="${points(regularRoute)}" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"></polyline>
            <polyline points="${points(regularRoute)}" fill="none" stroke="${COLORS.regular}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"></polyline>
            ${regularStops.map((s, i) => stopSvg("regular", s, i)).join("")}
          </g>

          <g data-fallback-group="commercial" filter="url(#shadow)" style="display:none">
            <polyline points="${points(commercialRoute)}" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></polyline>
            <polyline points="${points(commercialRoute)}" fill="none" stroke="${COLORS.commercial}" stroke-width="6" stroke-dasharray="12 10" stroke-linecap="round" stroke-linejoin="round"></polyline>
            ${commercialStops.map((s, i) => stopSvg("commercial", s, i)).join("")}
          </g>
          <g id="fallbackVehicle" hidden aria-label="Autobús en el recorrido" filter="url(#shadow)">
            <circle r="19" fill="#ffffff" stroke="#10233f" stroke-width="3"></circle>
            <text y="4" text-anchor="middle" fill="#10233f" font-size="9" font-weight="900">BUS</text>
          </g>
        </svg>
      `;
      fallbackVehicleMarker = document.getElementById("fallbackVehicle");

      dom.fallbackCanvas.querySelectorAll("[data-fallback-stop]").forEach(node => {
        const activate = () => {
          const [serviceKey, indexText] = node.dataset.fallbackStop.split(":");
          state.visible[serviceKey] = true;
          selectStop(serviceKey, Number(indexText), false);
        };
        node.addEventListener("click", activate);
        node.addEventListener("keydown", event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activate();
          }
        });
      });

      updateMapLayers();
      updateMarkerStylesAndPopups();
    }

    function showFallbackPopup(serviceKey, index) {
      const service = services[serviceKey];
      const stop = service.stops[index];
      const pass = getPassTime(serviceKey, index);
      dom.fallbackPopup.hidden = false;
      dom.fallbackPopup.innerHTML = `
        <strong>${service.code} · ${index + 1}. ${escapeHtml(stop.name)}</strong><br>
        Paso ${pass.kind}: <strong>${pass.time}</strong><br>
        Vuelta ${state.selectedTrip[serviceKey] + 1} · salida ${getDeparture(serviceKey)}
      `;
    }

    function buildGeoJSON() {
      const features = [];

      for (const key of ["regular", "commercial"]) {
        const service = services[key];

        features.push({
          type: "Feature",
          properties: {
            id: key,
            line: service.code,
            name: service.name,
            schedule: service.description,
            geometry_accuracy: service.routeMetadata.geometryAccuracy,
            source: service.routeMetadata.source,
            source_url: service.routeMetadata.sourceUrl,
            router: service.routeMetadata.router,
            routing_profile: service.routeMetadata.routingProfile,
            generated_at: service.routeMetadata.generatedAt,
            distance_m: service.routeMetadata.distanceM,
            license: service.routeMetadata.license
          },
          geometry: structuredClone(service.routeFeature.geometry)
        });

        service.stops.forEach((stop, index) => {
          const occurrence = service.stopOccurrences.find(item => item.stopIndex === index && !item.terminal);
          features.push({
            type: "Feature",
            properties: {
              stop_id: stop.id,
              line: service.code,
              stop_number: index + 1,
              stop_sequence: occurrence.sequence,
              name: stop.name,
              lines: stop.lines.join(","),
              coordinate_accuracy: "orientative",
              route_distance_m: occurrence.distanceAlongM,
              snap_distance_m: occurrence.snapDistanceM,
              route_segment_index: occurrence.segmentIndex
            },
            geometry: {
              type: "Point",
              coordinates: [stop.lng, stop.lat]
            }
          });
        });
      }

      return {
        type: "FeatureCollection",
        name: "Autobus urbano de Xativa - L1 y L2",
        generated: new Date(Math.max(
          ...Object.values(services).map(service => Date.parse(service.routeMetadata.generatedAt))
        )).toISOString(),
        attribution: "Route geometry derived from OpenStreetMap data (ODbL).",
        features
      };
    }

    function downloadBlob(filename, content, mime) {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function downloadGeoJSON() {
      downloadBlob(
        "xativa_bus_urbano_l1_l2.geojson",
        JSON.stringify(buildGeoJSON(), null, 2),
        "application/geo+json;charset=utf-8"
      );
      showToast("GeoJSON preparado.");
    }

    function csvEscape(value) {
      const text = String(value);
      return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
    }

    function downloadCSV() {
      const rows = [];
      rows.push(["linea", "vuelta", "salida", "destino_o_retorno", "hora", "intervalo_min", "tipo"]);

      regularDepartures.forEach((departure, index) => {
        const gap = index === 0 ? "" : durationMinutes(regularDepartures[index - 1], departure);
        rows.push(["L1", index + 1, departure, "Hospital Lluís Alcanyís", regularHospitalArrivals[index], gap, "publicado"]);
      });

      commercialDepartures.forEach((departure, index) => {
        rows.push(["L2", index + 1, departure, "Centre Comercial Plaza Mayor", addMinutes(departure, 16), index === 0 ? "" : 30, "estimado"]);
        rows.push(["L2", index + 1, departure, "Regreso Albereda Jaume I, 18", addMinutes(departure, 30), "", "estimado"]);
      });

      const csv = "\uFEFF" + rows.map(row => row.map(csvEscape).join(",")).join("\n");
      downloadBlob("xativa_bus_urbano_horarios.csv", csv, "text/csv;charset=utf-8");
      showToast("CSV de horarios preparado.");
    }

    document.querySelectorAll(".service-tab").forEach(button => {
      button.addEventListener("click", () => setActiveService(button.dataset.service));
    });

    document.querySelectorAll(".tab-btn").forEach(button => {
      button.addEventListener("click", () => switchTab(button.dataset.tab));
    });

    document.querySelectorAll(".layer-toggle").forEach(button => {
      button.addEventListener("click", () => toggleLayer(button.dataset.layer));
    });

    document.querySelector('[data-action="fit"]').addEventListener("click", () => {
      if (leafletReady) fitVisibleLayers();
      else showToast("El plano esquemático ya muestra las rutas completas.");
    });

    document.querySelector('[data-action="locate"]').addEventListener("click", locateUser);

    dom.tripSelect.addEventListener("change", event => selectTrip(Number(event.target.value)));

    dom.tripChips.addEventListener("click", event => {
      const button = event.target.closest("[data-trip]");
      if (button) selectTrip(Number(button.dataset.trip));
    });

    dom.stopList.addEventListener("click", event => {
      const button = event.target.closest("[data-stop]");
      if (button) selectStop(state.activeService, Number(button.dataset.stop), true);
    });

    dom.scheduleTable.addEventListener("click", event => {
      const row = event.target.closest("[data-table-trip]");
      if (row) {
        selectTrip(Number(row.dataset.tableTrip));
        switchTab("stops");
      }
    });

    dom.stopSearch.addEventListener("input", event => {
      state.search = event.target.value;
      renderStopList();
    });

    dom.stopSearch.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        state.search = "";
        dom.stopSearch.value = "";
        renderStopList();
      }
    });

    dom.clearSearch.addEventListener("click", () => {
      state.search = "";
      dom.stopSearch.value = "";
      dom.stopSearch.focus();
      renderStopList();
    });

    dom.playTour.addEventListener("click", playTour);
    document.getElementById("downloadGeoJSON").addEventListener("click", downloadGeoJSON);
    document.getElementById("downloadCSV").addEventListener("click", downloadCSV);

    window.addEventListener("resize", () => {
      if (leafletReady) map.invalidateSize();
    });

    renderAll();
    initMap();
