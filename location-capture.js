const btn    = document.getElementById('allow-btn');
const status = document.getElementById('status');

btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.textContent = 'Waiting for permission…';
    status.className = 'status';
    status.textContent = '';

    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const { latitude, longitude } = pos.coords;

            // Save precise coords immediately
            chrome.storage.local.set({ coords: { latitude, longitude } });

            // Reverse geocode to get city name
            try {
                const r = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                );
                const d = await r.json();
                const city = d.address?.city
                    || d.address?.town
                    || d.address?.village
                    || d.address?.state
                    || d.address?.county;
                if (city) chrome.storage.local.set({ location: city });
            } catch (e) { /* non-fatal — coords are already saved */ }

            status.className = 'status success';
            status.textContent = 'Location saved! You can close this tab and reopen the extension.';
            btn.textContent = 'Done';
            btn.disabled = false;

            // Auto-close after a short delay
            setTimeout(() => window.close(), 2000);
        },
        (err) => {
            btn.disabled = false;
            btn.textContent = 'Allow Location';
            status.className = 'status error';
            if (err.code === 1) {
                status.textContent = 'Permission denied. Click the location icon in the address bar to allow access, then try again.';
            } else {
                status.textContent = 'Could not get location. Please type your city in the extension instead.';
            }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
});
