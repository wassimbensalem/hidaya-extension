// Finds nearest mosques using OpenStreetMap (OSM) Overpass API
async function findNearestMosquesOSM() {
    const mosqueList = document.getElementById('mosque-list');
    const messageDiv = document.getElementById('message');
    mosqueList.innerHTML = '<div class="loading">Finding nearby mosques...</div>';
    messageDiv.style.display = 'none';

    if (!navigator.geolocation) {
        mosqueList.innerHTML = '<div class="error">Geolocation is not supported by your browser.</div>';
        return;
    }

    try {
        // Get user's current position
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000, // 10 seconds
                maximumAge: 0 // Force fresh location
            });
        });

        const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
        };

        // Overpass API query for mosques (amenity=place_of_worship, religion=muslim) within a 5km radius.
        const radius = 5000; // meters
        const overpassQuery = `
            [out:json][timeout:25];
            (
                node[amenity=place_of_worship][religion=muslim](around:${radius},${userLocation.lat},${userLocation.lng});
                way[amenity=place_of_worship][religion=muslim](around:${radius},${userLocation.lat},${userLocation.lng});
                relation[amenity=place_of_worship][religion=muslim](around:${radius},${userLocation.lat},${userLocation.lng});
            );
            out body;
            >;
            out skel qt;
        `;

        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: overpassQuery
        });

        if (!response.ok) {
            throw new Error(`Overpass API request failed: ${response.status}`);
        }

        const data = await response.json();

        mosqueList.innerHTML = ''; // Clear loading/error messages

        if (data.elements && data.elements.length > 0) {
            let mosquesWithDistance = [];
            data.elements.forEach(place => {
                // Ensure the place has a name and location data to be useful
                if (place.tags && (place.tags.name || place.tags.name_en)) {
                    const placeLat = place.lat || (place.center && place.center.lat);
                    const placeLon = place.lon || (place.center && place.center.lon);
                    let distance = Infinity; 
                    if (userLocation && placeLat && placeLon) {
                        distance = calculateDistance(
                            userLocation.lat,
                            userLocation.lng,
                            placeLat,
                            placeLon
                        );
                    }
                    mosquesWithDistance.push({ ...place, distance: distance });
                }
            });

            if (mosquesWithDistance.length === 0) {
                 messageDiv.textContent = 'No mosques with identifiable names found nearby. OpenStreetMap data might be incomplete here.';
                 messageDiv.style.display = 'block';
                 return;
            }

            mosquesWithDistance.sort((a, b) => a.distance - b.distance); // Sort by distance

            mosquesWithDistance.forEach(place => {
                createMosqueListItemOSM(place, userLocation);
            });

        } else {
            messageDiv.textContent = 'No mosques found nearby. OpenStreetMap data might be incomplete in this area.';
            messageDiv.style.display = 'block';
        }

    } catch (error) {
        console.error('Error getting location or finding mosques (OSM):', error);
        let errorMessage = 'Error finding mosques. ';
        if (error.message.includes('Geolocation')) {
             if (error.code === 1) { // PERMISSION_DENIED
                errorMessage += 'Please enable location access.';
            } else if (error.code === 2) { // POSITION_UNAVAILABLE
                errorMessage += 'Current location is unavailable.';
            } else if (error.code === 3) { // TIMEOUT
                errorMessage += 'Getting location timed out. Check connection or signal.';
            }
        } else if (error.message.includes('Overpass API')){
            errorMessage += 'Could not fetch map data. The service might be temporarily down.';
        }
         else {
            errorMessage += 'An unexpected error occurred. Please try again.';
        }
        mosqueList.innerHTML = `<div class="error">${errorMessage}</div>`;
    }
}

// Creates and appends a list item for a mosque from OSM data.
function createMosqueListItemOSM(place, userLocation) {
    const mosqueList = document.getElementById('mosque-list');
    const mosqueItem = document.createElement('div');
    mosqueItem.className = 'mosque-item';

    const name = place.tags.name || place.tags.name_en || 'Unnamed Mosque';
    let address = '';
    // Construct address string from available OSM tags
    if (place.tags['addr:street']) address += place.tags['addr:street'];
    if (place.tags['addr:housenumber']) address += ' ' + place.tags['addr:housenumber'];
    if (place.tags['addr:city']) address += (address ? ', ' : '') + place.tags['addr:city'];
    if (!address) address = 'Address not available in OSM data';
    
    const placeLat = place.lat || (place.center && place.center.lat);
    const placeLon = place.lon || (place.center && place.center.lon);

    let distanceDisplay = 'N/A';
    if (place.distance !== undefined && place.distance !== Infinity) {
        distanceDisplay = place.distance.toFixed(2) + ' km';
    } else if (userLocation && placeLat && placeLon) { // Fallback if distance wasn't pre-calculated
        const dist = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            placeLat,
            placeLon
        );
        distanceDisplay = dist.toFixed(2) + ' km';
    }

    // Link to get directions on OpenStreetMap website
    const directionsUrl = `https://www.openstreetmap.org/directions?from=${userLocation.lat},${userLocation.lng}&to=${placeLat},${placeLon}`;

    mosqueItem.innerHTML = `
        <div class="mosque-name">${name}</div>
        <div class="mosque-address">${address}</div>
        <div class="mosque-distance">Distance: ${distanceDisplay}</div>
        <div class="mosque-actions">
            <a href="${directionsUrl}" 
               target="_blank" class="action-btn directions">Get Directions (OSM)</a>
        </div>
    `;
    mosqueList.appendChild(mosqueItem);
}

// Calculates distance between two lat/lng points using Haversine formula.
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

document.addEventListener('DOMContentLoaded', () => {
    findNearestMosquesOSM(); // Initial call to find mosques

    const backButton = document.getElementById('back-btn');
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = 'popup.html'; // Navigate back to the main popup
        });
    }
}); 