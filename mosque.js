// Function to find nearest mosques using Overpass API
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
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        });

        const userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
        };

        // Overpass API query to find mosques (amenity=place_of_worship, religion=muslim)
        // Searches within a 5km radius (5000 meters)
        const radius = 5000;
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

        mosqueList.innerHTML = ''; // Clear loading or previous error messages

        if (data.elements && data.elements.length > 0) {
            let mosquesWithDistance = [];
            data.elements.forEach(place => {
                if (place.tags && (place.tags.name || place.tags.name_en)) {
                    const placeLat = place.lat || (place.center && place.center.lat);
                    const placeLon = place.lon || (place.center && place.center.lon);
                    let distance = Infinity; // Default to infinity if location is missing
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
                 messageDiv.textContent = 'No mosques with names found nearby. OpenStreetMap data might be incomplete in this area.';
                 messageDiv.style.display = 'block';
                 return;
            }

            // Sort mosques by distance (ascending)
            mosquesWithDistance.sort((a, b) => a.distance - b.distance);

            mosquesWithDistance.forEach(place => {
                createMosqueListItemOSM(place, userLocation); // createMosqueListItemOSM will use the pre-calculated distance if available
            });

        } else {
            messageDiv.textContent = 'No mosques found nearby. OpenStreetMap data might be incomplete in this area.';
            messageDiv.style.display = 'block';
        }

    } catch (error) {
        console.error('Error getting location or finding mosques (OSM):', error);
        let errorMessage = 'Error finding mosques. ';
        if (error.message.includes('Geolocation')) { // Check if error is from geolocation
             if (error.code === 1) { // PERMISSION_DENIED
                errorMessage += 'Please allow location access.';
            } else if (error.code === 2) { // POSITION_UNAVAILABLE
                errorMessage += 'Location information is unavailable.';
            } else if (error.code === 3) { // TIMEOUT
                errorMessage += 'Getting location timed out.';
            }
        } else if (error.message.includes('Overpass API')){
            errorMessage += 'Could not fetch data from OpenStreetMap.';
        }
         else {
            errorMessage += 'An unexpected error occurred.';
        }
        mosqueList.innerHTML = `<div class="error">${errorMessage}</div>`;
    }
}

// Function to create a list item for each mosque from OSM data
function createMosqueListItemOSM(place, userLocation) {
    const mosqueList = document.getElementById('mosque-list');
    const mosqueItem = document.createElement('div');
    mosqueItem.className = 'mosque-item';

    const name = place.tags.name || place.tags.name_en || 'Unnamed Mosque';
    let address = '';
    if (place.tags['addr:street']) address += place.tags['addr:street'];
    if (place.tags['addr:housenumber']) address += ' ' + place.tags['addr:housenumber'];
    if (place.tags['addr:city']) address += (address ? ', ' : '') + place.tags['addr:city'];
    if (!address) address = 'Address not available in OSM data';
    
    const placeLat = place.lat || (place.center && place.center.lat);
    const placeLon = place.lon || (place.center && place.center.lon);

    // Use pre-calculated distance if available from the sorting step, otherwise calculate it.
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

// Function to calculate distance between two lat/lng points (Haversine formula) - This function remains the same
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Event listener for DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    findNearestMosquesOSM(); // Initialize mosque search

    const backButton = document.getElementById('back-btn');
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = 'popup.html'; 
        });
    }
}); 