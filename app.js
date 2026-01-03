// --- 1. DEFINE LOCATIONS & ROUTES ---
const locations = {
  annarbor: { lat: 42.2808, lng: -83.7430, label: "Ann Arbor", elementId: "toggle-annarbor", address: "Ann Arbor, MI" },
  plymouth: { lat: 42.3686, lng: -83.4727, label: "The Meeting House (Reception)", elementId: "toggle-plymouth", address: "499 S. Main St, Plymouth, MI 48170" },
  newport:  { lat: 42.0298, lng: -83.3338, label: "Newport Venue (Ceremony)", elementId: "toggle-newport", address: "8033 N. Dixie Hwy, Newport, MI 48166" },
  dtw:      { lat: 42.2162, lng: -83.3551, label: "DTW Airport", elementId: "toggle-dtw", address: "9000 Middlebelt Rd, Romulus, MI 48174" }
};

const routes = [
  { start: "annarbor", end: "plymouth", time: 28, distance: 20, link: "https://www.google.com/maps/dir/Ann+Arbor,+MI/499+S+Main+St,+Plymouth,+MI+48170" },
  { start: "annarbor", end: "newport",  time: 45, distance: 39, link: "https://www.google.com/maps/dir/Ann+Arbor,+MI/8033+N+Dixie+Hwy,+Newport,+MI+48166" },
  { start: "annarbor", end: "dtw",      time: 30, distance: 24, link: "https://www.google.com/maps/dir/Ann+Arbor,+MI/Detroit+Metropolitan+Wayne+County+Airport" },
  { start: "plymouth", end: "newport",  time: 35, distance: 33, link: "https://www.google.com/maps/dir/499+S+Main+St,+Plymouth,+MI/8033+N+Dixie+Hwy,+Newport,+MI+48166" },
  { start: "plymouth", end: "dtw",      time: 22, distance: 17, link: "https://www.google.com/maps/dir/499+S+Main+St,+Plymouth,+MI/Detroit+Metropolitan+Wayne+County+Airport" },
  { start: "newport",  end: "dtw",      time: 22, distance: 20, link: "https://www.google.com/maps/dir/8033+N+Dixie+Hwy,+Newport,+MI+48166/Detroit+Metropolitan+Wayne+County+Airport" }
];

let map;
let allMarkers = {};
let allRoutePairs = []; // { visible, hit, locations: [start,end] }

// --- 2. POPUP ELEMENTS (your IDs) ---
const popup = document.getElementById("travel-info-popup");
const popupRoute = document.getElementById("popup-route");
const popupTime = document.getElementById("popup-time");
const popupDistance = document.getElementById("popup-distance");
const popupLink = document.getElementById("popup-link");

// --- 3. INITIALIZE MAP ---
document.addEventListener("DOMContentLoaded", initMap);

function initMap() {
  map = L.map("map").setView([42.2, -83.5], 9);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  drawRoutesAndMarkers();
  setupToggles();

  // sizing fixes
  setTimeout(() => map.invalidateSize(), 100);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") map.invalidateSize();
  });

  // click anywhere on the map background to hide popup
  map.on("click", hidePopup);
}

// --- 4. DRAW MARKERS + ROUTES ---
function drawRoutesAndMarkers() {
  // MARKERS
  for (const key in locations) {
    const loc = locations[key];

    const marker = L.marker([loc.lat, loc.lng]).addTo(map);
    marker.bindTooltip(loc.label, { permanent: false });

    marker.on("click", () => routeFromCurrentLocation(loc));

    allMarkers[key] = marker;
  }

  // ROUTE LINES (CLICK ONLY → POPUP)
  routes.forEach((route) => {
    const latlngs = [
      [locations[route.start].lat, locations[route.start].lng],
      [locations[route.end].lat, locations[route.end].lng]
    ];

    // pretty visible line
    const visible = L.polyline(latlngs, {
      color: "#A0522D",
      opacity: 0.8,
      weight: 6,
      interactive: true,
      lineCap: "round",
      lineJoin: "round"
    }).addTo(map);

    // invisible fat hit area (so lines aren’t “too small” on phones)
    const hit = L.polyline(latlngs, {
      opacity: 0,
      weight: 25,
      interactive: true
    }).addTo(map);

    const onRouteClick = (e) => {
      // prevent map click from instantly hiding the popup
      if (e?.originalEvent) e.originalEvent.stopPropagation();

      // only if route is currently shown
      if (visible.options.opacity > 0) {
        showPopup(route);
      }
    };

    visible.on("click", onRouteClick);
    hit.on("click", onRouteClick);

    allRoutePairs.push({
      visible,
      hit,
      locations: [route.start, route.end]
    });
  });
}

// --- 5. TOGGLES ---
function setupToggles() {
  ["annarbor", "plymouth", "newport", "dtw"].forEach((id) => {
    const el = document.getElementById(`toggle-${id}`);
    if (!el) return;

    el.addEventListener("change", (e) => {
      toggleLocation(id, e.target.checked);
    });
  });
}

function toggleLocation(locationId, isVisible) {
  const marker = allMarkers[locationId];

  if (isVisible) map.addLayer(marker);
  else map.removeLayer(marker);

  allRoutePairs.forEach((pair) => {
    const isConnected = pair.locations.includes(locationId);
    if (!isConnected) return;

    const otherId = pair.locations.find((id) => id !== locationId);
    const otherVisible = document.getElementById(`toggle-${otherId}`).checked;

    const show = isVisible && otherVisible;
    const opacity = show ? 0.8 : 0;

    pair.visible.setStyle({ opacity });
    pair.visible.options.interactive = show;
    pair.hit.options.interactive = show;
  });

  hidePopup();
}

// --- 6. PIN ROUTING (ADDRESS, NOT COORDS) ---
function routeFromCurrentLocation(locationObject) {
  const destination = locationObject.address;

  if (!navigator.geolocation) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`, "_blank");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const origin = `${pos.coords.latitude},${pos.coords.longitude}`;

      const url =
        `https://www.google.com/maps/dir/?api=1` +
        `&origin=${encodeURIComponent(origin)}` +
        `&destination=${encodeURIComponent(destination)}` +
        `&travelmode=driving`;

      window.open(url, "_blank", "noopener,noreferrer");
    },
    () => {
      // if they block location, open the destination only
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`, "_blank", "noopener,noreferrer");
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// --- 7. POPUP SHOW/HIDE (matches your CSS .visible) ---
function showPopup(routeData) {
  popupRoute.textContent = `${locations[routeData.start].label} ↔ ${locations[routeData.end].label}`;
  popupTime.textContent = `Estimate: ${routeData.time} min`;
  popupDistance.textContent = `Distance: ${routeData.distance} mi`;
  popupLink.href = routeData.link;

  popup.classList.add("visible");
}

function hidePopup() {
  popup.classList.remove("visible");
}
