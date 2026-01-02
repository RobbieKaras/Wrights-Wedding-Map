// --- 1. DEFINE LOCATIONS & ROUTES ---
const locations = {
    annarbor: { lat: 42.2808, lng: -83.7430, label: "Ann Arbor", elementId: "toggle-annarbor", address: "Ann Arbor, MI" },
    plymouth: { lat: 42.3686, lng: -83.4727, label: "The Meeting House (Reception)", elementId: "toggle-plymouth", address: "499 S. Main St, Plymouth, MI 48170" },
    newport: { lat: 42.0298, lng: -83.3338, label: "Newport Venue (Ceremony)", elementId: "toggle-newport", address: "8033 N. Dixie Hwy, Newport, MI 48166" },
    dtw: { lat: 42.2162, lng: -83.3551, label: "DTW Airport", elementId: "toggle-dtw", address: "9000 Middlebelt Rd, Romulus, MI 48174" }
};

const routes = [
    { start: "annarbor", end: "plymouth", time: 28, distance: 20, link: "https://www.google.com/maps/dir/Ann+Arbor,+MI/The+Meeting+House+at+499+S+Main+St,+Plymouth,+MI+48170" },
    { start: "annarbor", end: "newport", time: 45, distance: 39, link: "https://www.google.com/maps/dir/Ann+Arbor,+MI/8033+N+Dixie+Hwy,+Newport,+MI+48166" },
    { start: "annarbor", end: "dtw", time: 30, distance: 24, link: "https://www.google.com/maps/dir/Ann+Arbor,+MI/Detroit+Metropolitan+Wayne+County+Airport+(DTW),+Romulus,+MI" },
    { start: "plymouth", end: "newport", time: 35, distance: 33, link: "https://www.google.com/maps/dir/The+Meeting+House+at+499+S+Main+St,+Plymouth,+MI+48170/8033+N+Dixie+Hwy,+Newport,+MI+48166" },
    { start: "plymouth", end: "dtw", time: 22, distance: 17, link: "https://www.google.com/maps/dir/The+Meeting+House+at+499+S+Main+St,+Plymouth,+MI+48170/Detroit+Metropolitan+Wayne+County+Airport+(DTW),+Romulus,+MI" },
    { start: "newport", end: "dtw", time: 22, distance: 20, link: "https://www.google.com/maps/dir/8033+N+Dixie+Hwy,+Newport,+MI+48166/Detroit+Metropolitan+Wayne+County+Airport+(DTW),+Romulus,+MI" }
];

let map;
let allMarkers = {};
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
    setTimeout(function () {
        map.invalidateSize();
    }, 100);

    // Force map redraw when tab visibility changes (mobile browser quirks)
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") {
            map.invalidateSize();
        }
    });
}

// --- 3. DRAW MARKERS AND LINES (POLYLINES) ---
function drawRoutesAndMarkers() {
    // MARKERS
    for (const key in locations) {
        const loc = locations[key];

        let marker = L.marker([loc.lat, loc.lng]).addTo(map);

        // Desktop: permanent labels; Mobile: tap-to-show labels
        if (!IS_TOUCH) {
            marker.bindTooltip(loc.label, { permanent: true, direction: "right" });
        } else {
            marker.bindTooltip(loc.label, { permanent: false, direction: "top" });
        }

        // Pin click: route from current location to this venue (using ADDRESS, not coords)
        marker.on("click", () => {
            routeFromCurrentLocation(loc);
        });

        allMarkers[key] = marker;
    }

    // ROUTE LINES
    routes.forEach((route) => {
        const latlngs = [
            [locations[route.start].lat, locations[route.start].lng],
            [locations[route.end].lat, locations[route.end].lng],
        ];

        // Visible line (pretty)
        const polyline = L.polyline(latlngs, {
            color: "#A0522D",
            opacity: 0.8,
            weight: 6,
            interactive: true,
            lineCap: "round",
            lineJoin: "round",
        }).addTo(map);

        // Invisible "hit line" (easy tapping on mobile, doesn't change visuals)
        const hitLine = L.polyline(latlngs, {
            opacity: 0,
            weight: 25,
            interactive: true,
        }).addTo(map);

        // Desktop: hover popup + click opens route
        if (!IS_TOUCH) {
            polyline.on("mouseover", (e) => showPopup(e, route));
            polyline.on("mouseout", hidePopup);
            polyline.on("click", () => window.open(route.link, "_blank", "noopener,noreferrer"));

            hitLine.on("mouseover", (e) => showPopup(e, route));
            hitLine.on("mouseout", hidePopup);
            hitLine.on("click", () => window.open(route.link, "_blank", "noopener,noreferrer"));
        } else {
            // Mobile: tap shows popup (no hover on phones)
            // (Guests can then tap the link inside the popup)
            polyline.on("click", (e) => showPopup(e, route));
            hitLine.on("click", (e) => showPopup(e, route));
        }

        polyline.locations = [route.start, route.end];
        hitLine.locations = [route.start, route.end];

        // Keep both lines together for toggling visibility
        allPolylines.push({ visible: polyline, hit: hitLine });
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

    if (isVisible) {
        map.addLayer(marker);
    } else {
        map.removeLayer(marker);
    }

    allPolylines.forEach((pair) => {
        const isConnected = pair.visible.locations.includes(locationId);

        if (isConnected) {
            const otherLocationId = pair.visible.locations.find((id) => id !== locationId);
            const otherMarkerIsVisible = document.getElementById(`toggle-${otherLocationId}`).checked;

            const finalOpacity = isVisible && otherMarkerIsVisible ? 0.8 : 0;

            // Visible line appearance
            pair.visible.setStyle({ opacity: finalOpacity });

            // Hit line should only be interactive when the route is "visible"
            pair.hit.setStyle({ opacity: 0 });
            pair.hit.options.interactive = finalOpacity > 0;

            // Also prevent interactions on the visible line when hidden
            pair.visible.options.interactive = finalOpacity > 0;
        }
    });
}

// --- 5. ROUTE FROM CURRENT LOCATION ---
// Uses browser GPS for origin, but uses the VENUE ADDRESS for destination (nicer than coords).
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

function showPopup(event, routeData) {
    // Only show popup if the route line is currently visible (opacity > 0)
    if (event?.target?.options?.opacity > 0 || IS_TOUCH) {
        popupRoute.textContent = `${locations[routeData.start].label} \u2194 ${locations[routeData.end].label}`;
        popupTime.textContent = `Estimate: ${routeData.time} min`;
        popupDistance.textContent = `Distance: ${routeData.distance} mi`;
        popupLink.href = routeData.link;
        popup.classList.add("visible");
    }
}

function hidePopup() {
    popup.classList.remove("visible");
}

