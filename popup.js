// Global settings object, loaded from storage
let settings = {
    showAyah: true,
    showDua: true
};

// Load settings and preferred location on init
chrome.storage.local.get(['settings', 'location'], function(result) {
    if (result.settings) {
        settings = result.settings;
        const toggle = document.getElementById('show-ayah');
        if (toggle) toggle.checked = !!settings.showAyah;
    }

    if (result.location) {
        const locationInput = document.getElementById('location-input');
        if (locationInput) {
            locationInput.value = result.location;
            getCoordinatesFromCity(result.location).then(coords => {
                if (coords) {
                    chrome.storage.local.set({ coords: { latitude: coords.latitude, longitude: coords.longitude } });
                    fetchPrayerTimes(coords.latitude, coords.longitude).then(timings => {
                        if (timings) updatePrayerTimesDisplay(timings);
                    });
                    renderQibla(coords.latitude, coords.longitude);
                }
            });
        }
    }
});

const showAyahCheckbox = document.getElementById('show-ayah');
if (showAyahCheckbox) {
    showAyahCheckbox.addEventListener('change', function() {
        settings.showAyah = this.checked;
        settings.showDua  = this.checked;
        chrome.storage.local.set({ settings });
    });
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
        if (!response.ok) throw new Error('Failed to fetch prayer times');
        const data = await response.json();
        if (!data?.data?.timings) throw new Error('Invalid prayer times data');
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
        if (!response.ok) throw new Error('Failed to fetch location');
        const data = await response.json();
        if (data?.length > 0) {
            return {
                latitude:     parseFloat(data[0].lat),
                longitude:    parseFloat(data[0].lon),
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

// ─── Prayer times display ─────────────────────────────────────────────────────

function updatePrayerTimesDisplay(timings) {
    const grid = document.getElementById('prayer-times');
    if (!grid) return;
    grid.innerHTML = '';

    const prayersToShow = [
        { name: 'Fajr',    time: timings.Fajr    },
        { name: 'Sunrise', time: timings.Sunrise  },
        { name: 'Dhuhr',   time: timings.Dhuhr   },
        { name: 'Asr',     time: timings.Asr     },
        { name: 'Maghrib', time: timings.Maghrib  },
        { name: 'Isha',    time: timings.Isha    }
    ];

    // Determine which prayer is currently active (most recent past prayer)
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    let activePrayer = null;
    let latestPassedTime = -1;

    prayersToShow.forEach(({ name, time }) => {
        if (!time) return;
        const [h, m] = time.split(':').map(Number);
        const t = h * 60 + m;
        if (t <= currentTime && t > latestPassedTime) {
            latestPassedTime = t;
            activePrayer = name;
        }
    });

    prayersToShow.forEach(({ name, time }) => {
        if (!time) return;
        const card = document.createElement('div');
        card.className = 'prayer-card' + (name === activePrayer ? ' active' : '');
        card.innerHTML = `
            <span class="prayer-card-name">${name}</span>
            <span class="prayer-card-time">${time}</span>
        `;
        grid.appendChild(card);
    });

    chrome.storage.local.set({ prayerTimes: timings });
    updateNextPrayerTimer(timings);
}

// ─── Next prayer countdown banner ────────────────────────────────────────────

function updateNextPrayerTimer(prayerTimes) {
    const banner = document.getElementById('next-prayer');
    if (!banner || !prayerTimes) return;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const prayers = [
        { name: 'Fajr',    time: prayerTimes.Fajr    },
        { name: 'Dhuhr',   time: prayerTimes.Dhuhr   },
        { name: 'Asr',     time: prayerTimes.Asr     },
        { name: 'Maghrib', time: prayerTimes.Maghrib  },
        { name: 'Isha',    time: prayerTimes.Isha    }
    ];

    let nextPrayer = null;
    let timeUntilNext = Infinity;
    let nextPrayerIsTomorrow = false;

    prayers.forEach(prayer => {
        if (!prayer.time) return;
        const [h, m] = prayer.time.split(':').map(Number);
        const diff = (h * 60 + m) - currentTime;
        if (diff > 0 && diff < timeUntilNext) {
            timeUntilNext = diff;
            nextPrayer = prayer;
        }
    });

    // All prayers passed → next is Fajr tomorrow
    if (!nextPrayer && prayerTimes.Fajr) {
        const [fh, fm] = prayerTimes.Fajr.split(':').map(Number);
        timeUntilNext = (24 * 60 - currentTime) + (fh * 60 + fm);
        nextPrayer = prayers.find(p => p.name === 'Fajr');
        nextPrayerIsTomorrow = true;
    }

    if (nextPrayer) {
        const h = Math.floor(timeUntilNext / 60);
        const m = timeUntilNext % 60;
        banner.style.display = 'flex';
        banner.innerHTML = `
            <div class="next-banner-left">
                <div class="next-banner-label">Next Prayer</div>
                <div class="next-banner-name">${nextPrayer.name}${nextPrayerIsTomorrow ? ' · Tomorrow' : ''}</div>
            </div>
            <div class="next-banner-countdown">${h}h ${m}m</div>
        `;
    }
}

// ─── Location helpers ─────────────────────────────────────────────────────────

async function applyLocation(latitude, longitude) {
    chrome.storage.local.set({ coords: { latitude, longitude } });
    try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        if (r.ok) {
            const d = await r.json();
            const city = d.address?.city || d.address?.town || d.address?.village || d.address?.state || d.address?.county || d.address?.country;
            if (city) {
                chrome.storage.local.set({ location: city });
                const input = document.getElementById('location-input');
                if (input) input.value = city;
            }
        }
    } catch (e) { /* non-fatal */ }
    const timings = await fetchPrayerTimes(latitude, longitude);
    if (timings) updatePrayerTimesDisplay(timings);
    renderQibla(latitude, longitude);
}

async function getLocationViaIP() {
    // Providers ordered by reliability. Tested live — first two confirmed working.
    const providers = [
        async () => {
            const r = await fetch('https://geolocation-db.com/json/');
            if (!r.ok) throw new Error(`geolocation-db ${r.status}`);
            const d = await r.json();
            if (d.latitude == null || d.longitude == null) throw new Error('geolocation-db: no coords');
            return { latitude: d.latitude, longitude: d.longitude, city: d.city || null };
        },
        async () => {
            const r = await fetch('https://ip.guide/');
            if (!r.ok) throw new Error(`ip.guide ${r.status}`);
            const d = await r.json();
            if (!d.location?.latitude) throw new Error('ip.guide: no coords');
            return { latitude: d.location.latitude, longitude: d.location.longitude, city: d.location.city || null };
        },
        async () => {
            const r = await fetch('https://ipwho.is/');
            if (!r.ok) throw new Error(`ipwho.is ${r.status}`);
            const d = await r.json();
            if (!d.success || !d.latitude) throw new Error('ipwho.is: no coords');
            return { latitude: d.latitude, longitude: d.longitude, city: d.city || null };
        },
        async () => {
            const r = await fetch('https://ipapi.co/json/');
            if (!r.ok) throw new Error(`ipapi.co ${r.status}`);
            const d = await r.json();
            if (!d.latitude || !d.longitude) throw new Error('ipapi.co: no coords');
            return { latitude: d.latitude, longitude: d.longitude, city: d.city || null };
        }
    ];

    for (const provider of providers) {
        try { return await provider(); } catch (e) { console.warn('IP geo fallback:', e.message); }
    }
    throw new Error('All IP geolocation providers failed');
}

function openLocationCapturePage() {
    chrome.tabs.create({ url: chrome.runtime.getURL('location-capture.html') });
}

// ─── GPS button ───────────────────────────────────────────────────────────────

const PIN_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`;
const SPIN_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="9" stroke-dasharray="40 20" stroke-dashoffset="0"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></circle></svg>`;

const gpsButton = document.getElementById('gps-btn');
if (gpsButton) {
    gpsButton.addEventListener('click', async function() {
        gpsButton.innerHTML = SPIN_SVG;
        gpsButton.disabled = true;
        const finish = () => { gpsButton.innerHTML = PIN_SVG; gpsButton.disabled = false; };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    finish();
                    await applyLocation(pos.coords.latitude, pos.coords.longitude);
                },
                async () => {
                    // Browser GPS denied — try IP, then fall back to location-capture tab
                    try {
                        const { latitude, longitude, city } = await getLocationViaIP();
                        if (city) {
                            finish();
                            chrome.storage.local.set({ location: city });
                            const input = document.getElementById('location-input');
                            if (input) input.value = city;
                            await applyLocation(latitude, longitude);
                            return;
                        }
                    } catch (e) { /* IP also failed */ }
                    // IP gave no city — open the location-capture tab for proper permission
                    finish();
                    openLocationCapturePage();
                },
                { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
            );
        } else {
            try {
                const { latitude, longitude, city } = await getLocationViaIP();
                if (city) {
                    finish();
                    chrome.storage.local.set({ location: city });
                    const input = document.getElementById('location-input');
                    if (input) input.value = city;
                    await applyLocation(latitude, longitude);
                    return;
                }
            } catch (e) { /* IP failed */ }
            finish();
            openLocationCapturePage();
        }
    });
}

// ─── Set location button ──────────────────────────────────────────────────────

const locationButton = document.getElementById('location-btn');
if (locationButton) {
    locationButton.addEventListener('click', async function() {
        const locationInput = document.getElementById('location-input');
        if (locationInput) {
            const city = locationInput.value.trim();
            if (city) {
                chrome.storage.local.set({ location: city });
                const coords = await getCoordinatesFromCity(city);
                if (coords) {
                    chrome.storage.local.set({ coords: { latitude: coords.latitude, longitude: coords.longitude } });
                    const timings = await fetchPrayerTimes(coords.latitude, coords.longitude);
                    if (timings) updatePrayerTimesDisplay(timings);
                    renderQibla(coords.latitude, coords.longitude);
                }
            } else {
                showError('Please enter a city name');
            }
        }
    });
}

// ─── DOMContentLoaded ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
    chrome.storage.local.get(['location'], function(result) {
        if (!result.location) {
            const grid = document.getElementById('prayer-times');
            if (grid) {
                grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-2);font-size:12px;padding:12px 0;">Enter your city above to see prayer times</p>';
            }
        }
    });

    fetchAndDisplayNearestMosque();
    initPrayerLog();
    initQibla();
});

// ─── Prayer Log ───────────────────────────────────────────────────────────────

const PRAYER_LOG_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const todayKey = new Date().toISOString().split('T')[0];

function initPrayerLog() {
    chrome.storage.local.get({ prayerLog: {}, prayerTimes: null }, ({ prayerLog, prayerTimes }) => {
        const todayLog = prayerLog[todayKey] || {};
        renderPrayerLog(todayLog, prayerTimes);
        renderStreak(prayerLog);
    });
}

function renderPrayerLog(todayLog, prayerTimes) {
    const listEl = document.getElementById('prayer-log-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const CHECK_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

    PRAYER_LOG_PRAYERS.forEach(prayer => {
        const logged = !!todayLog[prayer];
        const time   = prayerTimes ? (prayerTimes[prayer] || '') : '';

        const item = document.createElement('div');
        item.className = 'log-row' + (logged ? ' logged' : '');
        item.innerHTML = `
            <span class="log-name">${prayer}</span>
            <span class="log-time">${time}</span>
            <button class="log-btn" data-prayer="${prayer}" aria-label="${logged ? 'Marked' : 'Mark as prayed'}">
                ${CHECK_SVG}
            </button>
        `;
        listEl.appendChild(item);
    });

    listEl.querySelectorAll('.log-btn').forEach(btn => {
        btn.addEventListener('click', () => togglePrayerLog(btn.dataset.prayer));
    });
}

function togglePrayerLog(prayerName) {
    chrome.storage.local.get({ prayerLog: {}, prayerTimes: null }, ({ prayerLog, prayerTimes }) => {
        const todayLog = prayerLog[todayKey] || {};
        todayLog[prayerName] = !todayLog[prayerName];
        prayerLog[todayKey]  = todayLog;

        // Keep only last 60 days
        const keys = Object.keys(prayerLog).sort();
        if (keys.length > 60) {
            keys.slice(0, keys.length - 60).forEach(k => delete prayerLog[k]);
        }

        chrome.storage.local.set({ prayerLog }, () => {
            renderPrayerLog(todayLog, prayerTimes);
            renderStreak(prayerLog);
        });
    });
}

function renderStreak(prayerLog) {
    const streakBar      = document.getElementById('streak-bar');
    const streakCountEl  = document.getElementById('streak-count');
    const streakTodayEl  = document.getElementById('streak-today');
    if (!streakBar) return;

    const todayLog   = prayerLog[todayKey] || {};
    const doneToday  = PRAYER_LOG_PRAYERS.filter(p => todayLog[p]).length;

    let streak = 0;
    const base = new Date();
    for (let i = 1; i <= 60; i++) {
        const d = new Date(base);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const log = prayerLog[key] || {};
        if (PRAYER_LOG_PRAYERS.every(p => log[p])) streak++;
        else break;
    }

    streakBar.style.display = 'flex';
    streakCountEl.textContent = streak;
    streakTodayEl.textContent = `${doneToday}/5 today`;
}

// ─── Qibla Direction ──────────────────────────────────────────────────────────

const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;

function calculateQibla(lat, lon) {
    const lat1 = lat * (Math.PI / 180);
    const lat2 = KAABA_LAT * (Math.PI / 180);
    const dLon = (KAABA_LON - lon) * (Math.PI / 180);
    const y    = Math.sin(dLon) * Math.cos(lat2);
    const x    = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return Math.round((Math.atan2(y, x) * (180 / Math.PI) + 360) % 360);
}

function bearingToCardinal(bearing) {
    return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(bearing / 45) % 8];
}

function renderQibla(lat, lon) {
    const bearing  = calculateQibla(lat, lon);
    const cardinal = bearingToCardinal(bearing);
    const needle   = document.getElementById('qibla-arrow');
    const info     = document.getElementById('qibla-info');
    if (needle) needle.style.transform = `rotate(${bearing}deg)`;
    if (info) {
        info.innerHTML = `
            <div class="qibla-deg">${bearing}°</div>
            <div class="qibla-dir">${cardinal} — toward Mecca</div>
        `;
    }
}

function initQibla() {
    chrome.storage.local.get(['coords'], ({ coords }) => {
        if (coords?.latitude) renderQibla(coords.latitude, coords.longitude);
    });
}

// ─── Nearest Mosque teaser ────────────────────────────────────────────────────

async function fetchAndDisplayNearestMosque() {
    const el = document.getElementById('mosque-info-content');
    if (!el) return;
    el.innerHTML = '<p class="loading-text">Finding nearby mosque…</p>';

    let latitude, longitude;
    const stored = await new Promise(resolve => chrome.storage.local.get(['coords'], resolve));

    if (stored.coords?.latitude) {
        ({ latitude, longitude } = stored.coords);
    } else {
        try {
            const pos = await new Promise((resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: false, timeout: 8000, maximumAge: 300000
                })
            );
            ({ latitude, longitude } = pos.coords);
            chrome.storage.local.set({ coords: { latitude, longitude } });
        } catch (geoErr) {
            const msg = geoErr.code === 1 ? 'Allow location to see nearby mosques.' : 'Location unavailable.';
            el.innerHTML = `<p class="error-text">${msg}</p>`;
            return;
        }
    }

    try {
        const query = `[out:json][timeout:15];
(node["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${latitude},${longitude});
 way["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${latitude},${longitude});
 relation["amenity"="place_of_worship"]["religion"="muslim"](around:5000,${latitude},${longitude}););
out center;`;
        const response = await fetch(
            `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
        );
        if (!response.ok) throw new Error(`Overpass ${response.status}`);
        const data = await response.json();

        if (data.elements?.length > 0) {
            const m = data.elements[0];
            const name = m.tags?.name || 'Unnamed Mosque';
            const addrParts = [
                m.tags?.['addr:housenumber'],
                m.tags?.['addr:street'],
                m.tags?.['addr:city']
            ].filter(Boolean);
            const address = addrParts.length ? addrParts.join(', ') : null;
            el.innerHTML = `
                <p class="mosque-name">${name}</p>
                ${address ? `<p class="mosque-addr">${address}</p>` : ''}
            `;
        } else {
            el.innerHTML = '<p class="error-text">No mosques found nearby.</p>';
        }
    } catch (err) {
        console.error('Mosque teaser error:', err);
        el.innerHTML = '<p class="error-text">Could not load mosque data.</p>';
    }
}
