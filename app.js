// --- 1. DEFINE LOCATIONS & ROUTES ---
const locations = {
    // Ann Arbor: General downtown area
    'annarbor': { 
        lat: 42.2808, 
        lng: -83.7430, 
        label: 'Ann Arbor', 
        elementId: 'toggle-annarbor', 
        address: 'Ann Arbor, MI' 
    },

    // Plymouth (Reception): 499 S. Main St
    'plymouth': { 
        lat: 42.3686, 
        lng: -83.4727, 
        label: 'The Meeting House (Reception)', 
        elementId: 'toggle-plymouth', 
        address: '499 S. Main St, Plymouth, MI 48170' 
    },

    // Newport (Wedding): 8033 N. Dixie Hwy
    'newport': { 
        lat: 42.0298, 
        lng: -83.3338, 
        label: 'Newport Venue (Wedding)', 
        elementId: 'toggle-newport', 
        address: '8033 N. Dixie Hwy, Newport, MI 48166' 
    },

    // DTW Airport
    'dtw': { 
        lat: 42.2162, 
        lng: -83.3551, 
        label: 'DTW Airport', 
        elementId: 'toggle-dtw', 
        address: '9000 Middlebelt Rd, Romulus, MI 48174' 
    }
};

const routes = [
    { start: 'annarbor', end: 'plymouth', time: 25, distance: 17, link: 'https://www.google.com/maps/dir/Ann+Arbor,+MI/The+Meeting+House,+499+S+Main+St,+Plymouth,+MI+48170' },
    { start: 'annarbor', end: 'newport', time: 45, distance: 39, link: 'https://www.google.com/maps/dir/Ann+Arbor,+MI/8033+N+Dixie+Hwy,+Newport,+MI+48166' },
    { start: 'annarbor', end: 'dtw', time: 30, distance: 28, link: 'https://www.google.com/maps/dir/Ann+Arbor,+MI/DTW' },
    { start: 'plymouth', end: 'newport', time: 50, distance: 45, link: 'https://www.google.com/maps/dir/499+S+Main+St,+Plymouth,+MI/8033+N+Dixie+Hwy,+Newport,+MI' },
    { start: 'plymouth', end: 'dtw', time: 22, distance: 17, link: 'https://www.google.com/maps/dir/499+S+Main+St,+Plymouth,+MI/DTW' },
    { start: 'newport', end: 'dtw', time: 25, distance: 23, link: 'https://www.google.com/maps/dir/8033+N+Dixie+Hwy,+Newport,+MI/DTW' }
];

let map;
let allMarkers = {};
let allPolylines = [];

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
}

// --- 3. DRAW MARKERS AND LINES ---
function drawRoutesAndMarkers() {

    // Draw markers
    for (const key in locations) {
        let marker = L.marker([locations[key].lat, locations[key].lng])
            .addTo(map)
            .bindTooltip(locations[key].label, { permanent: true, direction: 'right' });

        // CLICK = Directions from current location
        marker.on('click', () => { 
            routeFromCurrentLocation(locations[key]); 
        });

        allMarkers[key] = marker;
    }

    // Draw lines between locations
    routes.forEach(route => {
        const polyline = L.polyline([
            [locations[route.start].lat, locations[route.start].lng],
            [locations[route.end].lat, locations[route.end].lng]
        ], {
            color: '#A0522D',
            opacity: 0.8,
            weight: 4,
            interactive: true,
            lineCap: 'round'
        }).addTo(map);

        polyline.on('mouseover', (e) => showPopup(e, route));
        polyline.on('mouseout', hidePopup);

        polyline.on('click', () => {
            window.open(route.link, '_blank');
        });

        polyline.locations = [route.start, route.end];
        allPolylines.push(polyline);
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

function toggleLocation(id, visible) {
    const marker = allMarkers[id];

    if (visible) map.addLayer(marker);
    else map.removeLayer(marker);

    allPolylines.forEach(poly => {
        const isConnected = poly.locations.includes(id);
        if (isConnected) {
            const otherId = poly.locations.find(l => l !== id);
            const otherVisible = document.getElementById(`toggle-${otherId}`).checked;

            poly.setStyle({ opacity: (visible && otherVisible) ? 0.8 : 0 });
        }
    });
}

// --- 5. FIXED: ROUTE FROM CURRENT LOCATION ---
function routeFromCurrentLocation(locationObject) {
    const destinationAddress = encodeURIComponent(locationObject.address);

    // Real directions using user's GPS position
    const googleMapsUrl = 
        `https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${destinationAddress}&travelmode=driving`;

    window.open(googleMapsUrl, '_blank');
}

// --- 6. POPUP LOGIC ---
const popup = document.getElementById('travel-info-popup');
const popupRoute = document.getElementById('popup-route');
const popupTime = document.getElementById('popup-time');
const popupDistance = document.getElementById('popup-distance');
const popupLink = document.getElementById('popup-link');

function showPopup(event, routeData) {
    if (event.target.options.opacity > 0) {
        
        popupRoute.textContent = `${locations[routeData.start].label} → ${locations[routeData.end].label}`;
        popupTime.textContent = `Estimate: ${routeData.time} min`;
        popupDistance.textContent = `Distance: ${routeData.distance} mi`;
        popupLink.href = routeData.link;

        popup.style.left = `${event.originalEvent.layerX + 10}px`;
        popup.style.top = `${event.originalEvent.layerY + 10}px`;

        popup.classList.add('visible');
    }
}

function hidePopup() {
    popup.classList.remove('visible');
}
