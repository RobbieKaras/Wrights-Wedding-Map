// --- 1. DEFINE LOCATIONS & ROUTES ---
const locations = {
    annarbor: { lat: 42.2808, lng: -83.7430, label: 'Ann Arbor', elementId: 'toggle-annarbor', address: 'Ann Arbor, MI' },
    plymouth: { lat: 42.3686, lng: -83.4727, label: 'The Meeting House (Reception)', elementId: 'toggle-plymouth', address: '499 S. Main St, Plymouth, MI 48170' },
    newport:  { lat: 42.0298, lng: -83.3338, label: 'Newport Venue (Ceremony)', elementId: 'toggle-newport', address: '8033 N. Dixie Hwy, Newport, MI 48166' },
    dtw:      { lat: 42.2162, lng: -83.3551, label: 'DTW Airport', elementId: 'toggle-dtw', address: '9000 Middlebelt Rd, Romulus, MI 48174' }
};

const routes = [
    { start: 'annarbor', end: 'plymouth', time: 28, distance: 20, link: 'https://www.google.com/maps/dir/Ann+Arbor,+MI/The+Meeting+House+at+499+S+Main+St,+Plymouth,+MI+48170' },
    { start: 'annarbor', end: 'newport',  time: 45, distance: 39, link: 'https://www.google.com/maps/dir/Ann+Arbor,+MI/8033+N+Dixie+Hwy,+Newport,+MI+48166' },
    { start: 'annarbor', end: 'dtw',      time: 30, distance: 24, link: 'https://www.google.com/maps/dir/Ann+Arbor,+MI/Detroit+Metropolitan+Wayne+County+Airport+(DTW),+Romulus,+MI' },
    { start: 'plymouth', end: 'newport',  time: 35, distance: 33, link: 'https://www.google.com/maps/dir/The+Meeting+House+at+499+S+Main+St,+Plymouth,+MI+48170/8033+N+Dixie+Hwy,+Newport,+MI+48166' },
    { start: 'plymouth', end: 'dtw',      time: 22, distance: 17, link: 'https://www.google.com/maps/dir/The+Meeting+House+at+499+S+Main+St,+Plymouth,+MI+48170/Detroit+Metropolitan+Wayne+County+Airport+(DTW),+Romulus,+MI' },
    { start: 'newport',  end: 'dtw',      time: 22, distance: 20, link: 'https://www.google.com/maps/dir/8033+N+Dixie+Hwy,+Newport,+MI+48166/Detroit+Metropolitan+Wayne+County+Airport+(DTW),+Romulus,+MI' }
];

let map;
let allMarkers = {};
// Store routes as pairs: { visible: polyline, hit: hitLine, locations: [start,end] }
let allPolylines = [];

// Touch detection (optional: for tooltip behavior)
const IS_TOUCH = window.matchMedia('(hover: none), (pointer: coarse)').matches;

// --- 2. INITIALIZE MAP ---
document.addEventListener('DOMContentLoaded', initMap);

function initMap() {
    map = L.map('map').setView([42.2, -83.5], 9);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    drawRoutesAndMarkers();
    setupToggles();

    // Fix sizing on load
    setTimeout(() => map.invalidateSize(), 100);

    // Fix sizing when tab returns (mobile browser quirk)
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') map.invalidateSize();
    });

    // Clicking the map background hides popup
    map.on('click', hidePopup);
}

// --- 3. DRAW MARKERS AND LINES (POLYLINES) ---
function drawRoutesAndMarkers() {
    // MARKERS
    for (const key in locations) {
        const loc = locations[key];

        const marker = L.marker([loc.lat, loc.lng]).addTo(map);

        // Desktop: permanent labels; Mobile: non-permanent (cleaner + faster)
        if (!IS_TOUCH) {
            marker.bindTooltip(loc.label, { permanent: true, direction: 'right' });
        } else {
            marker.bindTooltip(loc.label, { permanent: false, direction: 'top' });
        }

        // Pin click: directions from user's current location to destination ADDRESS
        marker.on('click', () => {
            routeFromCurrentLocation(loc);
        });

        allMarkers[key] = marker;
    }

    // ROUTE LINES
    routes.forEach(route => {
        const latlngs = [
            [locations[route.start].lat, locations[route.start].lng],
            [locations[route.end].lat, locations[route.end].lng]
        ];

        // Visible line
        const polyline = L.polyline(latlngs, {
            color: '#A0522D',
            opacity: 0.8,
            weight: 6,
            interactive: true,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(map);

        // Invisible hit line for easy tapping/clicking
        const hitLine = L.polyline(latlngs, {
            opacity: 0,
            weight: 25,
            interactive: true
        }).addTo(map);

        // CLICK ONLY: show popup (do NOT open Google Maps immediately)
        const handleClick = (e) => {
            // only if route is visible
            if (polyline.options.opacity > 0) {
                // prevent map click from immediately hiding popup
                if (e && e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
                showPopup(route);
            }
        };

        polyline.on('click', handleClick);
        hitLine.on('click', handleClick);

        allPolylines.push({
            visible: polyline,
            hit: hitLine,
            locations: [route.start, route.end]
        });
    });
}

// --- 4. LOCATION TOGGLE LOGIC ---
function setupToggles() {
    const ids = ['annarbor', 'plymouth', 'newport', 'dtw'];

    ids.forEach(id => {
        document.getElementById(`toggle-${id}`).addEventListener('change', (e) => {
            toggleLocation(id, e.target.checked);
        });
    });
}

function toggleLocation(locationId, isVisible) {
    const marker = allMarkers[locationId];

    if (isVisible) map.addLayer(marker);
    else map.removeLayer(marker);

    allPolylines.forEach(pair => {
        const isConnected = pair.locations.includes(locationId);

        if (isConnected) {
            const otherLocationId = pair.locations.find(id => id !== locationId);
            const otherMarkerIsVisible = document.getElementById(`toggle-${otherLocationId}`).checked;

            const finalOpacity = (isVisible && otherMarkerIsVisible) ? 0.8 : 0;

            // show/hide the visible line
            pair.visible.setStyle({ opacity: finalOpacity });

            // make both lines interactive only when visible
            pair.visible.options.interactive = finalOpacity > 0;
            pair.hit.options.interactive = finalOpacity > 0;
        }
    });

    hidePopup();
}

// --- 5. ROUTE FROM CURRENT LOCATION (DESTINATION AS ADDRESS) ---
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

                window.open(url, '_blank', 'noopener,noreferrer');
            },
            () => {
                // If user blocks location: just open the address in Maps
                const url =
                    `https://www.google.com/maps/search/?api=1` +
                    `&query=${encodeURIComponent(destinationAddress)}`;

                window.open(url, '_blank', 'noopener,noreferrer');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
        return;
    }

    const fallback =
        `https://www.google.com/maps/search/?api=1` +
        `&query=${encodeURIComponent(destinationAddress)}`;

    window.open(fallback, '_blank', 'noopener,noreferrer');
}

// --- 6. POPUP LOGIC ---
const popup = document.getElementById('travel-info-popup');
const popupRoute = document.getElementById('popup-route');
const popupTime = document.getElementById('popup-time');
const popupDistance = document.getElementById('popup-distance');
const popupLink = document.getElementById('popup-link');

function showPopup(routeData) {
    popupRoute.textContent = `${locations[routeData.start].label} \u2194 ${locations[routeData.end].label}`;
    popupTime.textContent = `Estimate: ${routeData.time} min`;
    popupDistance.textContent = `Distance: ${routeData.distance} mi`;
    popupLink.href = routeData.link;

    popup.classList.add('visible');
}

function hidePopup() {
    popup.classList.remove('visible');
}
