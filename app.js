// ================================
// 1. LOCATIONS & ROUTES
// ================================
const locations = {
  annarbor: {
    lat: 42.2808,
    lng: -83.743,
    label: "Ann Arbor",
    elementId: "toggle-annarbor",
    address: "Ann Arbor, MI",
  },
  plymouth: {
    lat: 42.3686,
    lng: -83.4727,
    label: "The Meeting House (Reception)",
    elementId: "toggle-plymouth",
    address: "499 S. Main St, Plymouth, MI 48170",
  },
  newport: {
    lat: 42.0298,
    lng: -83.3338,
    label: "Newport Venue (Ceremony)",
    elementId: "toggle-newport",
    address: "8033 N. Dixie Hwy, Newport, MI 48166",
  },
  dtw: {
    lat: 42.2162,
    lng: -83.3551,
    label: "DTW Airport",
    elementId: "toggle-dtw",
    address: "9000 Middlebelt Rd, Romulus, MI 48174",
  },
};

const routes = [
  { start: "annarbor", end: "plymouth", time: 28, distance: 20, link: "https://www.google.com/maps/dir/Ann+Arbor,+MI/499+S+Main+St,+Plymouth,+MI+48170" },
  { start: "annarbor", end: "newport", time: 45, distance: 39, link: "https://www.google.com/maps/dir/Ann+Arbor,+MI/8033+N+Dixie+Hwy,+Newport,+MI+48166" },
  { start: "annarbor", end: "dtw", time: 30, distance: 24, link: "https://www.google.com/maps/dir/Ann+Arbor,+MI/Detroit+Metropolitan+Wayne+County+Airport" },
  { start: "plymouth", end: "newport", time: 35, distance: 33, link: "https://www.google.com/maps/dir/499+S+Main+St,+Plymouth,+MI/8033+N+Dixie+Hwy,+Newport,+MI+48166" },
  { start: "plymouth", end: "dtw", time: 22, distance: 17, link: "https://www.google.com/maps/dir/499+S+Main+St,+Plymouth,+MI/Detroit+Metropolitan+Wayne+County+Airport" },
  { start: "newport", end: "dtw", time: 22, distance: 20, link: "https://www.google.com/maps/dir/8033+N+Dixie+Hwy,+Newport,+MI+48166/Detroit+Metropolitan+Wayne+County+Airport" },
];

// ================================
// 2. MAP SETUP
// ================================
let map;
let markers = {};
let polylines = [];

document.addEventListener("DOMContentLoaded", () => {
  map = L.map("map").setView([42.2, -83.5], 9);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  drawMarkers();
  drawRoutes();
  setupToggles();

  setTimeout(() => map.invalidateSize(), 100);
  map.on("click", hidePopup);
});

// ================================
// 3. MARKERS
// ================================
function drawMarkers() {
  for (const key in locations) {
    const loc = locations[key];

    const marker = L.marker([loc.lat, loc.lng]).addTo(map);
    marker.bindTooltip(loc.label, { permanent: false });

    marker.on("click", () => routeFromCurrentLocation(loc));

    markers[key] = marker;
  }
}

// ================================
// 4. ROUTES (CLICK ONLY)
// ================================
function drawRoutes() {
  routes.forEach((route) => {
    const latlngs = [
      [locations[route.start].lat, locations[route.start].lng],
      [locations[route.end].lat, locations[route.end].lng],
    ];

    const line = L.polyline(latlngs, {
      color: "#A0522D",
      weight: 7,
      opacity: 0.85,
    }).addTo(map);

    line.locations = [route.start, route.end];

    line.on("click", (e) => {
      e.originalEvent.stopPropagation();
      showPopup(route);
    });

    polylines.push(line);
  });
}

// ================================
// 5. TOGGLES
// ================================
function setupToggles() {
  ["annarbor", "plymouth", "newport", "dtw"].forEach((id) => {
    document.getElementById(`toggle-${id}`).addEventListener("change", (e) => {
      toggleLocation(id, e.target.checked);
    });
  });
}

function toggleLocation(id, visible) {
  if (visible) map.addLayer(markers[id]);
  else map.removeLayer(markers[id]);

  polylines.forEach((line) => {
    if (line.locations.includes(id)) {
      const other = line.locations.find((x) => x !== id);
      const otherVisible = document.getElementById(`toggle-${other}`).checked;
      line.setStyle({ opacity: visible && otherVisible ? 0.85 : 0 });
    }
  });

  hidePopup();
}

// ================================
// 6. GOOGLE MAPS ROUTING (ADDRESS)
// ================================
function routeFromCurrentLocation(loc) {
  const destination = loc.address;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const origin = `${pos.coords.latitude},${pos.coords.longitude}`;
        const url =
          `https://www.google.com/maps/dir/?api=1` +
          `&origin=${encodeURIComponent(origin)}` +
          `&destination=${encodeURIComponent(destination)}` +
          `&travelmode=driving`;

        window.open(url, "_blank");
      },
      () => {
        window.open(
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`,
          "_blank"
        );
      }
    );
  }
}

// ================================
// 7. POPUP
// ================================
const popup = document.getElementById("travel-info-popup");
const popupRoute = document.getElementById("popup-route");
const popupTime = document.getElementById("popup-time");
const popupDistance = document.getElementById("popup-distance");
const popupLink = document.getElementById("popup-link");

function showPopup(route) {
  popupRoute.textContent =
    `${locations[route.start].label} ↔ ${locations[route.end].label}`;
  popupTime.textContent = `Estimate: ${route.time} min`;
  popupDistance.textContent = `Distance: ${route.distance} mi`;
  popupLink.href = route.link;
  popup.classList.add("visible");
}

function hidePopup() {
  popup.classList.remove("visible");
}
