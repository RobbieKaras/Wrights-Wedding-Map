// --- 1. DEFINE LOCATIONS & ROUTES ---
const locations = {
    // Ann Arbor: General downtown area
    'annarbor': { lat: 42.2808, lng: -83.7430, label: 'Ann Arbor', elementId: 'toggle-annarbor', address: 'Ann Arbor, MI' }, 
    
    // Plymouth (Reception): 499 S. Main St
    'plymouth': { lat: 42.3686, lng: -83.4727, label: 'The Meeting House (Reception)', elementId: 'toggle-plymouth', address: '499 S. Main St, Plymouth, MI 48170' }, 
    
    // Newport (Wedding/Ceremony): 8033 N. Dixie Hwy
    'newport': { lat: 42.0298, lng: -83.3338, label: 'Newport Venue (Ceremony)', elementId: 'toggle-newport', address: '8033 N. Dixie Hwy, Newport, MI 48166' }, 
    
    // DTW Airport: 9000 Middlebelt Rd
    'dtw': { lat: 42.2162, lng: -83.3551, label: 'DTW Airport', elementId: 'toggle-dtw', address: '9000 Middlebelt Rd, Romulus, MI 48174' }
};

const routes = [
    // Define all routes with static data and the final, working Google Maps URL
    { start: 'annarbor', end: 'plymouth', time: 25, distance: 17, link: 'https://www.google.com/maps/dir/Ann+Arbor,+MI/The+Meeting+House+at+499+S+Main+St,+Plymouth,+MI+48170' },
    { start: 'annarbor', end: 'newport', time: 45, distance: 39, link: 'https://www.google.com/maps/dir/Ann+Arbor,+MI/8033+N+Dixie+Hwy,+Newport,+MI+48166' },
    { start: 'annarbor', end: 'dtw', time: 30, distance: 28, link: 'https://www.google.com/maps/dir/Ann+Arbor,+MI/Detroit+Metropolitan+Wayne+County+Airport+(DTW),+Romulus,+MI' },
    { start: 'plymouth', end: 'newport', time: 50, distance: 45, link: 'https://www.google.com/maps/dir/The+Meeting+House+at+499+S+Main+St,+Plymouth,+MI+48170/8033+N+Dixie+Hwy,+Newport,+MI+48166' },
    { start: 'plymouth', end: 'dtw', time: 22, distance: 17, link: 'https://www.google.com/maps/dir/The+Meeting+House+at+499+S+Main+St,+Plymouth,+MI+48170/Detroit+Metropolitan+Wayne+County+Airport+(DTW),+Romulus,+MI' },
    { start: 'newport', end: 'dtw', time: 25, distance: 23, link: 'https://www.google.com/maps/dir/8033+N+Dixie+Hwy,+Newport,+MI+48166/Detroit+Metropolitan+Wayne+County+Airport+(DTW),+Romulus,+MI' }
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
    
    // FIX: Call invalidateSize() with a slight delay to force map to recalculate 
    // its size and center itself correctly after scrolling.
    setTimeout(function () {
        map.invalidateSize();
    }, 100); 
}

// --- 3. DRAW MARKERS AND LINES (POLYLINES) ---
function drawRoutesAndMarkers() {
    for (const key in locations) {
        let marker = L.marker([locations[key].lat, locations[key].lng])
            .addTo(map)
            .bindTooltip(locations[key].label, { permanent: true, direction: 'right' }); 
        
        // Pin Click Listener: Route from Current Location
        // Now passing the full location object (which contains the full address)
        marker.on('click', () => { 
            routeFromCurrentLocation(locations[key]); 
        });

        allMarkers[key] = marker; 
    }

    routes.forEach(route => {
        const polyline = L.polyline([
            [locations[route.start].lat, locations[route.start].lng],
            [locations[route.end].lat, locations[route.end].lng]
        ], {
            color: '#A0522D', 
            opacity: 0.8,
            weight: 6, // Increased for mobile tap detection
            interactive: true, 
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(map);

        // ATTACH HOVER LISTENERS
        polyline.on('mouseover', (e) => showPopup(e, route));
        polyline.on('mouseout', hidePopup);
        
        // ATTACH CLICK LISTENER (Opens the direct route link)
        polyline.on('click', () => { window.open(route.link, '_blank'); });

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

function toggleLocation(locationId, isVisible) {
    const marker = allMarkers[locationId];
    
    if (isVisible) {
        map.addLayer(marker);
    } else {
        map.removeLayer(marker);
    }
    
    allPolylines.forEach(polyline => {
        const isConnected = polyline.locations.includes(locationId);

        if (isConnected) {
            const otherLocationId = polyline.locations.find(id => id !== locationId);
            const otherMarkerIsVisible = document.getElementById(`toggle-${otherLocationId}`).checked;

            let finalOpacity;
            
            if (isVisible && otherMarkerIsVisible) {
                finalOpacity = 0.8; 
            } else {
                finalOpacity = 0;
            }

            polyline.setStyle({ opacity: finalOpacity, clickable: finalOpacity > 0 });
        }
    });
}

// --- 5. ROUTE FROM CURRENT LOCATION ---
function routeFromCurrentLocation(locationObject) {
    // FIX: Use the 'address' property and encode it for the URL.
    const destinationAddress = encodeURIComponent(locationObject.address);
    
    // The final robust URL: Origin is left blank/general ('/dir/') forcing GPS location detection.
    const googleMapsUrl = `https://www.google.com/maps/dir//${destinationAddress}&travelmode=driving`;
    
    window.open(googleMapsUrl, '_blank');
}

// --- 6. HANDLE INTERACTION (POPUP LOGIC - CENTERED FIX) ---
const popup = document.getElementById('travel-info-popup');
const popupRoute = document.getElementById('popup-route');
const popupTime = document.getElementById('popup-time');
const popupDistance = document.getElementById('popup-distance');
const popupLink = document.getElementById('popup-link');

function showPopup(event, routeData) {
    // Only show popup if the line is currently visible (opacity > 0)
    if (event.target.options.opacity > 0) {
        
        popupRoute.textContent = `${locations[routeData.start].label} → ${locations[routeData.end].label}`;
        
        // Display Estimate: X min
        popupTime.textContent = `Estimate: ${routeData.time} min`;
        
        // Display Distance: Y mi
        popupDistance.textContent = `Distance: ${routeData.distance} mi`;
        
        // Set the link
        popupLink.href = routeData.link;

        // CRITICAL FIX: Removed positioning code (left/top) as CSS now handles centering.
        
        popup.classList.add('visible');
    }
}

function hidePopup() {
    popup.classList.remove('visible');
}
