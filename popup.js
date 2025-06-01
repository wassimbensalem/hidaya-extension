// Global settings object, loaded from storage
let settings = {
    showAyah: true
};

// Load settings and preferred location on init
chrome.storage.local.get(['settings', 'location'], function(result) {
    if (result.settings) {
        settings = result.settings;
        if (document.getElementById('show-ayah')) {
            document.getElementById('show-ayah').checked = settings.showAyah;
        }
    }
    
    if (result.location) {
        const locationInput = document.getElementById('location-input');
        if (locationInput) {
            locationInput.value = result.location;
            getCoordinatesFromCity(result.location).then(coords => {
                if (coords) {
                    fetchPrayerTimes(coords.latitude, coords.longitude).then(timings => {
                        if (timings) {
                            updatePrayerTimesDisplay(timings);
                        }
                    });
                }
            });
        }
    }
});

const showAyahCheckbox = document.getElementById('show-ayah');
if (showAyahCheckbox) {
    showAyahCheckbox.addEventListener('change', function() {
        settings.showAyah = this.checked;
        saveSettings();
    });
}

function saveSettings() {
    const showAyahCheckbox = document.getElementById('show-ayah');
    if (showAyahCheckbox) {
         settings = {
            showAyah: showAyahCheckbox.checked
        };
        chrome.storage.local.set({ settings: settings });
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

async function fetchPrayerTimes(latitude, longitude) {
    try {
        const date = new Date().toISOString().split('T')[0];
        const response = await fetch(`https://api.aladhan.com/v1/timings/${date}?latitude=${latitude}&longitude=${longitude}&method=2`);
        if (!response.ok) {
            throw new Error('Failed to fetch prayer times');
        }
        const data = await response.json();
        if (!data || !data.data || !data.data.timings) {
            throw new Error('Invalid prayer times data received from API');
        }
        return data.data.timings;
    } catch (error) {
        console.error('Error fetching prayer times:', error);
        showError('Error fetching prayer times. Please try again.');
        return null;
    }
}

async function getCoordinatesFromCity(city) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
        if (!response.ok) {
            throw new Error('Failed to fetch location');
        }
        const data = await response.json();
        if (data && data.length > 0) {
            return {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon),
                display_name: data[0].display_name
            };
        }
        showError('City not found. Please try another city name.');
        return null;
    } catch (error) {
        console.error('Error getting coordinates:', error);
        showError('Error finding location. Please try again.');
        return null;
    }
}

// Calculates and displays the time remaining until the next prayer.
function updateNextPrayerTimer(prayerTimes) {
    const nextPrayerDiv = document.getElementById('next-prayer');
    if (!nextPrayerDiv || !prayerTimes) return;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes since midnight
    
    const prayers = [
        { name: 'Fajr', time: prayerTimes.Fajr },
        { name: 'Dhuhr', time: prayerTimes.Dhuhr },
        { name: 'Asr', time: prayerTimes.Asr },
        { name: 'Maghrib', time: prayerTimes.Maghrib },
        { name: 'Isha', time: prayerTimes.Isha }
    ];
    
    let nextPrayer = null;
    let timeUntilNext = Infinity;
    let nextPrayerIsTomorrow = false;

    prayers.forEach(prayer => {
        if (!prayer.time) return; // Skip if prayer time is undefined
        const [hours, minutes] = prayer.time.split(':').map(Number);
        const prayerTime = hours * 60 + minutes; // Prayer time in minutes since midnight
        let timeDiff = prayerTime - currentTime;
        
        if (timeDiff > 0 && timeDiff < timeUntilNext) {
            timeUntilNext = timeDiff;
            nextPrayer = prayer;
            nextPrayerIsTomorrow = false;
        }
    });
    
    // If all prayers for today have passed, the next prayer is Fajr of the next day.
    if (!nextPrayer && prayerTimes.Fajr) { 
        const [fajrHours, fajrMinutes] = prayerTimes.Fajr.split(':').map(Number);
        const fajrTimeTomorrow = fajrHours * 60 + fajrMinutes;
        timeUntilNext = (24 * 60 - currentTime) + fajrTimeTomorrow; // Minutes remaining today + minutes into tomorrow until Fajr
        nextPrayer = prayers.find(p => p.name === 'Fajr');
        nextPrayerIsTomorrow = true;
    }

    if (nextPrayer) {
        const hours = Math.floor(timeUntilNext / 60);
        const minutes = timeUntilNext % 60;
        nextPrayerDiv.innerHTML = `
            <strong>Next Prayer:</strong> ${nextPrayer.name} ${nextPrayerIsTomorrow ? '(Tomorrow)' : ''}<br>
            In ${hours}h ${minutes}m
        `;
    } else {
        nextPrayerDiv.innerHTML = '<strong>Next Prayer:</strong> Unavailable';
    }
}

function updatePrayerTimesDisplay(timings) {
    const prayerTimesDiv = document.getElementById('prayer-times');
    if (!prayerTimesDiv) return;
    prayerTimesDiv.innerHTML = ''; // Clear previous times
    
    const prayersToShow = [
        { name: 'Fajr', time: timings.Fajr },
        { name: 'Sunrise', time: timings.Sunrise },
        { name: 'Dhuhr', time: timings.Dhuhr },
        { name: 'Asr', time: timings.Asr },
        { name: 'Maghrib', time: timings.Maghrib },
        { name: 'Isha', time: timings.Isha }
    ];

    prayersToShow.forEach(prayer => {
        if (!prayer.time) return; 
        const div = document.createElement('div');
        div.className = 'prayer-time';
        div.innerHTML = `
            <span class="prayer-name">${prayer.name}</span>
            <span class="prayer-time-value">${prayer.time}</span>
        `;
        prayerTimesDiv.appendChild(div);
    });

    chrome.storage.local.set({ prayerTimes: timings });
    updateNextPrayerTimer(timings);
}

const locationButton = document.getElementById('location-btn');
if (locationButton) {
    locationButton.addEventListener('click', async function() {
        const locationInput = document.getElementById('location-input');
        if (locationInput) {
            const city = locationInput.value.trim();
            if (city) {
                chrome.storage.local.set({ location: city }); // Save manually entered location
                const coords = await getCoordinatesFromCity(city);
                if (coords) {
                    const timings = await fetchPrayerTimes(coords.latitude, coords.longitude);
                    if (timings) {
                        updatePrayerTimesDisplay(timings);
                    }
                }
            } else {
                showError('Please enter a city name');
            }
        }
    });
}

// On initial load, try to use geolocation if no location is saved.
// Otherwise, the saved location (handled by the top-level .get) is used.
document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.local.get(['location'], function(result) {
        if (!result.location) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const { latitude, longitude } = position.coords;
                        // Attempt to reverse geocode to get city name for user convenience and storage
                        try {
                            const geoResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                            if (geoResponse.ok) {
                                const geoData = await geoResponse.json();
                                if (geoData.address && geoData.address.city) {
                                    chrome.storage.local.set({ location: geoData.address.city });
                                    const locationInput = document.getElementById('location-input');
                                    if(locationInput) locationInput.value = geoData.address.city;
                                }
                            }
                        } catch (e) { console.warn("Could not reverse geocode city from coordinates", e); }
                        
                        const timings = await fetchPrayerTimes(latitude, longitude);
                        if (timings) {
                            updatePrayerTimesDisplay(timings);
                        }
                    },
                    (error) => {
                        showError('Could not get your location. Please enter a city name manually.');
                        // User must input manually if geolocation fails or is denied.
                        console.warn('Geolocation error:', error.message);
                    },
                    {
                        enableHighAccuracy: false, // Conserve battery; city-level accuracy is sufficient.
                        timeout: 10000, // Wait 10 seconds for location.
                        maximumAge: 3600000 // Accept cached position up to 1 hour old.
                    }
                );
            } else {
                showError('Geolocation is not supported. Please enter a city name manually.');
            }
        }
    });
    
    fetchAndDisplayNearestMosque(); // Load mosque teaser
});

// Removed findNearestMosque from here as it was for a different UI (mosque.html has its own JS)
// Removed Quran Stream functionality

// It might be good to add some basic CSS for status messages (error, success, loading)
// e.g., in popup.html's <style> tag or a separate CSS file:
// .status-message.error { color: red; }
// .status-message.success { color: green; }
// .status-message.loading { color: blue; } 

document.addEventListener('DOMContentLoaded', async function () {
    const nextPrayerLabelEl = document.getElementById('next-prayer-label');
    const nextPrayerTimeEl = document.getElementById('next-prayer-time');
    const nextPrayerNameEl = document.getElementById('next-prayer-name');
    
    const mosqueContentEl = document.getElementById('mosque-content');
    const quranContentEl = document.getElementById('quran-content');
    const dhikrContentEl = document.getElementById('dhikr-content');

    async function loadPrayerTimes() {
        try {
            const { location } = await chrome.storage.local.get('location');
            if (!location) {
                if (nextPrayerNameEl) nextPrayerNameEl.textContent = "Set location first";
                if (nextPrayerTimeEl) nextPrayerTimeEl.textContent = " "; 
                return;
            }

            const coords = await getCoordinatesFromCity(location);
            if (!coords) {
                if (nextPrayerNameEl) nextPrayerNameEl.textContent = "Location not found";
                if (nextPrayerTimeEl) nextPrayerTimeEl.textContent = " "; 
                return;
            }

            const date = new Date().toISOString().split('T')[0];
            const response = await fetch(`https://api.aladhan.com/v1/timings/${date}?latitude=${coords.latitude}&longitude=${coords.longitude}&method=2`);
            if (!response.ok) throw new Error('Failed to fetch prayer times');
            const data = await response.json();
            if (!data || !data.data || !data.data.timings) throw new Error('Invalid prayer times data format');
            const timings = data.data.timings;

            displayNextPrayer(timings);

        } catch (error) {
            console.error('Error loading prayer times:', error);
            if (nextPrayerNameEl) nextPrayerNameEl.textContent = 'Error loading times';
            if (nextPrayerTimeEl) nextPrayerTimeEl.textContent = " ";
        }
    }

    function displayNextPrayer(timings) {
        const now = new Date();
        const prayerOrder = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        let nextPrayerFound = null;

        for (const prayerName of prayerOrder) {
            const prayerTimeStr = timings[prayerName];
            if (!prayerTimeStr) continue;

            const [hours, minutes] = prayerTimeStr.split(':').map(Number);
            const prayerDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

            if (prayerDate > now) {
                nextPrayerFound = { name: prayerName, time: prayerTimeStr, date: prayerDate };
                break;
            }
        }

        // If no prayer found for today, it means the next prayer is Fajr tomorrow
        if (!nextPrayerFound) { 
            const fajrTimeStr = timings['Fajr'];
            if (fajrTimeStr) {
                const [hours, minutes] = fajrTimeStr.split(':').map(Number);
                const tomorrowFajrDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hours, minutes);
                nextPrayerFound = { name: 'Fajr', time: fajrTimeStr, date: tomorrowFajrDate, tomorrow: true };
            }
        }

        if (nextPrayerFound) {
            if(nextPrayerLabelEl) nextPrayerLabelEl.textContent = `NEXT PRAYER: ${nextPrayerFound.name.toUpperCase()}`;
            let hours = nextPrayerFound.date.getHours();
            const minutes = nextPrayerFound.date.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            const minutesStr = minutes < 10 ? '0' + minutes : minutes;
            if(nextPrayerTimeEl) nextPrayerTimeEl.textContent = `${hours}:${minutesStr} ${ampm}`;
            if(nextPrayerNameEl) nextPrayerNameEl.textContent = nextPrayerFound.name + (nextPrayerFound.tomorrow ? ' (Tomorrow)' : '');
        } else {
            if(nextPrayerLabelEl) nextPrayerLabelEl.textContent = 'NEXT PRAYER';
            if(nextPrayerTimeEl) nextPrayerTimeEl.textContent = 'N/A';
            if(nextPrayerNameEl) nextPrayerNameEl.textContent = 'Unavailable';
        }
    }
    
    async function getCoordinatesFromCity(city) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
            if (!response.ok) throw new Error('Failed to fetch location coordinates');
            const data = await response.json();
            if (data && data.length > 0) {
                return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
            }
            return null;
        } catch (error) {
            console.error('Error getting coordinates:', error);
            return null;
        }
    }

    async function loadQuranAyah() {
        if (!quranContentEl) return;
        quranContentEl.innerHTML = '<div class="loading-text">Loading Ayah...</div>';
        try {
            const ayahData = await chrome.runtime.sendMessage({ action: 'fetchRandomAyah' });
            if (ayahData && (ayahData.text || ayahData.arabic)) {
                let html = '';
                if (ayahData.arabic) {
                     html += `<div class="arabic">${ayahData.arabic}</div>`;
                }
                if (ayahData.text) {
                    html += `<p>${ayahData.text}</p>`;
                }
                if (ayahData.surahNameEn && ayahData.ayahNumber) {
                    html += `<span class="reference">Surah ${ayahData.surahNameEn}, ${ayahData.surahNumber}:${ayahData.ayahNumber}</span>`;
                }
                quranContentEl.innerHTML = html;
            } else {
                quranContentEl.textContent = 'Could not load Ayah at this time.';
            }
        } catch (error) {
            console.error('Error loading Quran Ayah:', error);
            quranContentEl.textContent = 'Error loading Ayah.';
        }
    }

    async function loadDhikr() {
        if (!dhikrContentEl) return;
        dhikrContentEl.innerHTML = '<div class="loading-text">Loading Dhikr...</div>';
        try {
            const dhikrData = await chrome.runtime.sendMessage({ action: 'fetchRandomDhikr' });
            if (dhikrData && dhikrData.content) {
                let html = '';
                 if(dhikrData.arabic && dhikrData.arabic !== dhikrData.content) { 
                    html += `<div class="arabic">${dhikrData.arabic}</div>`;
                 }
                html += `<p>${dhikrData.content}</p>`;
                if (dhikrData.reference) {
                    html += `<span class="reference">${dhikrData.reference}</span>`;
                }
                dhikrContentEl.innerHTML = html;
            } else {
                dhikrContentEl.textContent = 'Could not load Dhikr at this time.';
            }
        } catch (error) {
            console.error('Error loading Dhikr:', error);
            dhikrContentEl.textContent = 'Error loading Dhikr.';
        }
    }

    // Populates the mosque section with a link to the dedicated mosque finding page.
    function loadMosqueSection() {
        if (!mosqueContentEl) return;
        mosqueContentEl.innerHTML = ''; 
        const link = document.createElement('a');
        link.href = 'mosque.html';
        link.className = 'action-link';
        link.textContent = 'Find Nearby Mosques';
        // Basic styling for the link, consider moving to CSS
        link.style.marginTop = '5px';
        link.style.padding = '10px'; 
        link.style.backgroundColor = '#6c757d'; 
        mosqueContentEl.appendChild(link);
    }

    // Initial data loading for different sections of the popup
    if (nextPrayerLabelEl && nextPrayerTimeEl && nextPrayerNameEl) {
        loadPrayerTimes();
    }
    if (quranContentEl) {
        loadQuranAyah();
    }
    if (dhikrContentEl) {
        loadDhikr();
    }
    if (mosqueContentEl) {
        loadMosqueSection();
    }
}); 

// Fetches and displays information about the nearest mosque.
async function fetchAndDisplayNearestMosque() {
    const mosqueInfoContentEl = document.getElementById('mosque-info-content');
    if (!mosqueInfoContentEl) return;

    mosqueInfoContentEl.innerHTML = '<p class="loading-text">Finding nearby mosque...</p>';

    try {
        // Get current geolocation coordinates
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false, // City-level accuracy is fine
                timeout: 10000, 
                maximumAge: 300000 // Use cached position if < 5 minutes old
            });
        });
        const { latitude, longitude } = position.coords;

        // Fetch mosques from Overpass API
        const radius = 0.05; // Approx 5km search radius in degrees
        const bbox = [
            latitude - radius,
            longitude - radius,
            latitude + radius,
            longitude + radius
        ].join(',');

        // Query for mosques (places of worship for Muslims) within 5km
        const query = `[out:json][timeout:25];
            (
                node["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${latitude},${longitude});
                way["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${latitude},${longitude});
                relation["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${latitude},${longitude});
            );
            out center;`;
        
        const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
        if (!response.ok) {
            throw new Error(`Overpass API error: ${response.status}`);
        }
        const data = await response.json();

        if (data.elements && data.elements.length > 0) {
            // Display the first mosque found. More sophisticated sorting/selection could be added.
            const firstMosque = data.elements[0];
            const mosqueName = firstMosque.tags?.name || 'Unnamed Mosque';
            let mosqueAddress = 'Address not available';
            if (firstMosque.tags) {
                const addr = firstMosque.tags;
                mosqueAddress = [
                    addr['addr:housenumber'], addr['addr:street'],
                    addr['addr:city'], addr['addr:postcode']
                ].filter(Boolean).join(', ') || 'Address not specified';
            }
            // Fallback to coordinates if address parts are missing
            if (mosqueAddress === 'Address not specified' && firstMosque.lat && firstMosque.lon){
                 mosqueAddress = `Location: ${firstMosque.lat.toFixed(4)}, ${firstMosque.lon.toFixed(4)}`;
            }

            mosqueInfoContentEl.innerHTML = `
                <p class="mosque-name">${mosqueName}</p>
                <p class="mosque-address">${mosqueAddress}</p>
            `;

        } else {
            mosqueInfoContentEl.innerHTML = '<p class="error-text">No mosques found nearby.</p>';
        }

    } catch (error) {
        console.error('Error fetching nearest mosque for popup:', error);
        let errorMessage = 'Could not find nearby mosque.';
        if (error.message.includes('User denied Geolocation') || error.code === 1) {
            errorMessage = 'Location access denied.';
        } else if (error.message.includes('Overpass API error')) {
            errorMessage = 'Mosque data service error.';
        }
        mosqueInfoContentEl.innerHTML = `<p class="error-text">${errorMessage}</p>`;
    }
} 