// --- 1. DEFINE LOCATIONS & ROUTES ---
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
  {
    start: "annarbor",
    end: "plymouth",
    time: 28,
    distance: 20,
    link: "https://www.google.com/maps/dir/Ann+Arbor,+MI/The+Meeting+House+at+499+S+Main+St,+Plymouth,+MI+48170",
  },
  {
    start: "annarbor",
    end: "newport",
    time: 45,
    distance: 39,
    link: "https://www.google.com/maps/dir/Ann+Arbor,+MI/8033+N+Dixie+Hwy,+Newport,+MI+48166",
  },
  {
    start: "annarbor",
    end: "dtw",
    time: 30,
    distance: 24,
    link: "https://www.google.com/maps/dir/Ann+Arbor,+MI/Detroit+Metropolitan+Wayne+County+Airport+(DTW),+Romulus,+MI",
  },
  {
    start: "plymouth",
    end: "newport",
    time: 35,
    distance: 33,
    link: "https://www.google.com/maps/dir/The+Meeting+House+at+499+S+Main+St,+Plymouth,+MI+48170/8033+N+Dixie+Hwy,+Newport,+MI+48166",
  },
  {
    start: "plymouth",
    end: "dtw",
    time: 22,
    distance: 17,
    link: "https://www.google.com/maps/dir/The+Meeting+House+at+499+S+Main+St,+Plymouth,+MI+48170/Detroit+Metropolitan+Wayne+County+Airport+(DTW),+Romulus,+MI",
  },
  {
    start: "newport",
    end: "dtw",
    time: 22,
    distance: 20,
    link: "https://www.google.com/maps/dir/8033+N+Dixie+Hwy,+Newport,+MI+48166/Detroit+Metropolitan+Wayne+County+Airport+(DTW),+Romulus,+MI",
  },
];

let map;
let allMarkers = {};

// We store route pairs as { key, route, visible, hit }
let allPolylines = [];

// Detect touch/mobile (no hover)
const IS_TOUCH = window.matchMedia("(hover: none), (pointer: coarse)").matches;

// --- 2. INITIALIZE MAP ---
document.addEventListener("DOMContentLoaded", initMap);

function initMap() {
  map = L.map("map").setView([42.2, -83.5], 9);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  drawRoutesAndMarkers();
  setupToggles();

  // Initial centering fix
  setTimeout(() => map.invalidateSize(), 100);

  // Mobile browser quirks
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") map.invalidateSize();
  });

  // Nice UX: clicking the map background hides popup
  map.on("click", hidePopup);
}

// --- 3. DRAW MARKERS AND LINES (POLYLINES) ---
function drawRoutesAndMarkers() {
  // MARKERS
  for (const key in locations) {
    const loc = locations[key];

    const marker = L.marker([loc.lat, loc.lng]).addTo(map);

    // Desktop: permanent labels; Mobile: tap-to-show labels
    if (!IS_TOUCH) {
      marker.bindTooltip(loc.label, { permanent: true, direction: "right" });
    } else {
      marker.bindTooltip(loc.label, { permanent: false, direction: "top" });
    }

    // Pin click: route from current location to this venue (destination uses ADDRESS)
    marker.on("click", () => routeFromCurrentLocation(loc));

    allMarkers[key] = marker;
  }

  // ROUTE LINES
  routes.forEach((route) => {
    const latlngs = [
      [locations[route.start].lat, locations[route.start].lng],
      [locations[route.end].lat, locations[route.end].lng],
    ];

    const routeKey = `${route.start}-${route.end}`;

    // Visible line (pretty)
    const visible = L.polyline(latlngs, {
      color: "#A0522D",
      opacity: 0.8,
      weight: 6,
      interactive: true,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);

    // Invisible hit line (big tap/click target)
    const hit = L.polyline(latlngs, {
      opacity: 0,
      weight: 25,
      interactive: true,
    }).addTo(map);

    // CLICK-ONLY behavior for ALL devices:
    // click/tap the line => show popup; user clicks popup link to open Google Maps
    const clickHandler = () => {
      // Only show if this route is currently "visible"
      if (visible.options.opacity > 0) {
        showPopup(route);
      }
    };

    visible.on("click", clickHandler);
    hit.on("click", clickHandler);

    // Save for toggle logic
    visible.locations = [route.start, route.end];
    hit.locations = [route.start, route.end];

    allPolylines.push({ key: routeKey, route, visible, hit });
  });
}

// --- 4. LOCATION TOGGLE LOGIC ---
function setupToggles() {
  const ids = ["annarbor", "plymouth", "newport", "dtw"];

  ids.forEach((id) => {
    document.getElementById(`toggle-${id}`).addEventListener("change", (e) => {
      toggleLocation(id, e.target.checked);
    });
  });
}

function toggleLocation(locationId, isVisible) {
  const marker = allMarkers[locationId];

  if (isVisible) map.addLayer(marker);
  else map.removeLayer(marker);

  allPolylines.forEach((pair) => {
    const isConnected = pair.visible.locations.includes(locationId);

    if (isConnected) {
      const otherLocationId = pair.visible.locations.find((id) => id !== locationId);
      const otherMarkerIsVisible =
        document.getElementById(`toggle-${otherLocationId}`).checked;

      const finalOpacity = isVisible && otherMarkerIsVisible ? 0.8 : 0;

      // Visible line appearance
      pair.visible.setStyle({ opacity: finalOpacity });

      // Only interactive if visible
      pair.visible.options.interactive = finalOpacity > 0;
      pair.hit.options.interactive = finalOpacity > 0;
    }
  });

  // If you hide a route that was showing a popup, hide popup too
  // (prevents popup lingering for a now-hidden route)
  // Simple approach: just hide popup whenever toggles change
  hidePopup();
}

// --- 5. ROUTE FROM CURRENT LOCATION ---
// Uses browser GPS for origin, destination uses ADDRESS (nicer than coords).
function routeFromCurrentLocation(locationObject) {
  const destinationAddress = locationObject.address;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const origin = `${pos.coords.latitude},${pos.coords.longitude}`;

        const url =
          `https://www.google.com/maps/dir/?api=1` +
          `&origin=${encodeURIComponent(origin)}` +
          `&destination=${encodeURIComponent(destinationAddress)}` +
          `&travelmode=driving`;

        window.open(url, "_blank", "noopener,noreferrer");
      },
      () => {
        // If user blocks location, fall back to searching the address
        const url =
          `https://www.google.com/maps/search/?api=1` +
          `&query=${encodeURIComponent(destinationAddress)}`;

        window.open(url, "_blank", "noopener,noreferrer");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
    return;
  }

  // Very old browser fallback
  const url =
    `https://www.google.com/maps/search/?api=1` +
    `&query=${encodeURIComponent(destinationAddress)}`;

  window.open(url, "_blank", "noopener,noreferrer");
}

// --- 6. HANDLE INTERACTION (POPUP LOGIC) ---
const popup = document.getElementById("travel-info-popup");
const popupRoute = document.getElementById("popup-route");
const popupTime = document.getElementById("popup-time");
const popupDistance = document.getElementById("popup-distance");
const popupLink = document.getElementById("popup-link");

function showPopup(routeData) {
  // Route title
  popupRoute.textContent = `${locations[routeData.start].label} \u2194 ${locations[routeData.end].label}`;

  // Details
  popupTime.textContent = `Estimate: ${routeData.time} min`;
  popupDistance.textContent = `Distance: ${routeData.distance} mi`;

  // Link that opens Google Maps
  popupLink.href = routeData.link;

  popup.classList.add("visible");
}

function hidePopup() {
  popup.classList.remove("visible");
}


