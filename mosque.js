async function findNearestMosquesOSM() {
    const mosqueList = document.getElementById('mosque-list');
    const messageDiv = document.getElementById('message');
    mosqueList.innerHTML = '<div class="loading-text">Finding nearby mosques…</div>';
    messageDiv.style.display = 'none';

    // Use stored coords (set by popup) first — avoids permission prompts
    let userLocation;
    const stored = await new Promise(resolve => chrome.storage.local.get(['coords'], resolve));
    if (stored.coords?.latitude) {
        userLocation = { lat: stored.coords.latitude, lng: stored.coords.longitude };
    } else if (navigator.geolocation) {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: false,
                    timeout: 10000,
                    maximumAge: 300000
                });
            });
            userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
            chrome.storage.local.set({ coords: { latitude: userLocation.lat, longitude: userLocation.lng } });
        } catch (err) {
            const msg = err.code === 1 ? 'Allow location in Chrome settings, or set your city in the main popup first.' :
                        err.code === 3 ? 'Location request timed out. Try again.' :
                        'Could not get your location. Set your city in the main popup first.';
            mosqueList.innerHTML = `<div class="error-text">${msg}</div>`;
            return;
        }
    } else {
        mosqueList.innerHTML = '<div class="error-text">Set your city in the main popup first.</div>';
        return;
    }

    try {
        // "out center" is lightweight — returns a single lat/lon for nodes, ways, and relations
        const query = `[out:json][timeout:20];
(
  node["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${userLocation.lat},${userLocation.lng});
  way["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${userLocation.lat},${userLocation.lng});
  relation["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${userLocation.lat},${userLocation.lng});
);
out center;`;

        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query
        });

        if (!response.ok) throw new Error(`Overpass ${response.status}`);

        const data = await response.json();
        mosqueList.innerHTML = '';

        if (!data.elements || data.elements.length === 0) {
            mosqueList.innerHTML = '<div class="empty-text">No mosques found within 5 km.<br><br>If your location looks wrong, go back and type your city in the main screen.</div>';
            return;
        }

        // Compute distance for each, sort by nearest
        const mosques = data.elements
            .map(el => {
                const lat = el.lat ?? el.center?.lat;
                const lon = el.lon ?? el.center?.lon;
                if (!lat || !lon) return null;
                const distance = calculateDistance(userLocation.lat, userLocation.lng, lat, lon);
                return { ...el, _lat: lat, _lon: lon, distance };
            })
            .filter(Boolean)
            .sort((a, b) => a.distance - b.distance);

        mosques.forEach(place => renderMosqueCard(place, userLocation));

    } catch (err) {
        console.error('Mosque fetch error:', err);
        const msg = err.message.includes('504') || err.message.includes('503')
            ? 'Map service is temporarily busy. Please try again in a moment.'
            : 'Could not load mosque data. Check your connection.';
        mosqueList.innerHTML = `<div class="error-text">${msg}</div>`;
    }
}

function renderMosqueCard(place, userLocation) {
    const mosqueList = document.getElementById('mosque-list');
    const tags = place.tags || {};
    const name = tags.name || tags['name:en'] || tags['name:ar'] || 'Unnamed Mosque';

    const addrParts = [
        tags['addr:housenumber'],
        tags['addr:street'],
        tags['addr:city'],
        tags['addr:postcode']
    ].filter(Boolean);
    const address = addrParts.length ? addrParts.join(', ') : null;

    const distKm = place.distance.toFixed(2);
    const distLabel = place.distance < 1
        ? `${Math.round(place.distance * 1000)} m away`
        : `${distKm} km away`;

    const directionsUrl = `https://www.openstreetmap.org/directions?from=${userLocation.lat},${userLocation.lng}&to=${place._lat},${place._lon}`;

    const card = document.createElement('div');
    card.className = 'mosque-card';
    card.innerHTML = `
        <div class="mosque-card-header">
            <span class="mosque-card-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22V10l9-7 9 7v12"/><path d="M9 22v-5a3 3 0 0 1 6 0v5"/></svg></span>
            <div class="mosque-card-title">
                <div class="mosque-card-name">${name}</div>
                ${address ? `<div class="mosque-card-address">${address}</div>` : ''}
            </div>
        </div>
        <div class="mosque-card-footer">
            <span class="mosque-card-dist">${distLabel}</span>
            <a href="${directionsUrl}" target="_blank" class="mosque-card-btn">Directions →</a>
        </div>
    `;
    mosqueList.appendChild(card);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

document.addEventListener('DOMContentLoaded', () => {
    findNearestMosquesOSM();
    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = 'popup.html';
    });
    document.getElementById('retry-btn')?.addEventListener('click', () => {
        findNearestMosquesOSM();
    });
});
