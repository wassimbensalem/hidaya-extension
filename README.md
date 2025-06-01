# Hidaya - Your Islamic Companion Chrome Extension

Hidaya is a Chrome extension designed to be your daily companion for Islamic practices. It provides easy access to prayer times, helps you find the nearest mosque, offers random Quran Ayahs and Dhikr/Duas, and sends timely notifications.

## Features

*   **Prayer Times**:
    *   Displays daily prayer times (Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha).
    *   Automatically detects location using browser geolocation (with permission).
    *   Manual city input for prayer times.
    *   Calculates and shows the time remaining until the next prayer.
*   **Nearest Mosque Finder**:
    *   Quickly shows the nearest mosque in the popup based on your current location.
    *   Dedicated "Nearby Mosques" page (`mosque.html`) listing multiple mosques sorted by distance.
    *   Provides mosque names, addresses (if available in OpenStreetMap data), and distance.
    *   Direct links to get directions using OpenStreetMap.
*   **Quran Ayahs**:
    *   Displays random Quran Ayahs with English translation through notifications.
    *   Stores a history of notifications.
*   **Dhikr & Duas**:
    *   Sends notifications with random Dhikr (Islamic remembrances/quotes) with English translation.
    *   Sends notifications with random Duas (supplications) with English translation.
    *   Includes specific Duas for each prayer time in the prayer notifications.
*   **Notifications**:
    *   Timely notifications for prayer times.
    *   Regular notifications for random Quran Ayahs, Duas, and Dhikr (configurable interval).
    *   Option to favorite notifications.
    *   Notification history page (`history.html`) to review past and favorited notifications.
*   **User Interface**:
    *   Modern and simple UI for `popup.html`, `mosque.html`, and `history.html`.
    *   Easy navigation between sections.

## Installation

1.  **Download/Clone**: Download the extension files to your local machine. If you have git, you can clone the repository.
2.  **Open Chrome Extensions**: Open Google Chrome, navigate to `chrome://extensions/`.
3.  **Enable Developer Mode**: Turn on the "Developer mode" toggle, usually found in the top right corner.
4.  **Load Unpacked**: Click on "Load unpacked" and select the directory where you saved/cloned the extension files (the directory containing `manifest.json`).
5.  The "Hidaya" extension icon should now appear in your Chrome toolbar.

## How to Use

*   **Popup**: Click the Hidaya icon in your Chrome toolbar to open the main popup.
    *   **Prayer Times**: View today's prayer times and the countdown to the next prayer.
        *   If no location is set, allow geolocation when prompted, or enter your city name in the input field and click "Set Location".
    *   **Nearest Mosque Teaser**: See a snippet of the nearest mosque. Click "View more & get directions" to open the full list.
    *   **Navigation**: Links to "Find Nearest Mosques" (`mosque.html`) and "Notification History" (`history.html`) are at the bottom.
*   **Settings**: (Currently minimal - e.g., show Ayah on new tab - this might be outdated based on current dev, adjust if needed)
*   **Mosque Page (`mosque.html`)**: Accessed from the popup, this page lists nearby mosques, their addresses, distances, and provides links for directions.
*   **History Page (`history.html`)**: Accessed from the popup, this page shows past notifications. You can filter by "All" or "Favorites". You can favorite/unfavorite, copy, or delete notifications from here.
*   **Notifications**: Notifications for prayers, Ayahs, and Dhikr will appear automatically based on the schedule set in `background.js`.

## APIs Used

This extension utilizes the following free-to-use APIs (no keys required for current usage):

*   **Prayer Times**: [Aladhan Prayer Times API](https://aladhan.com/prayer-times-api)
*   **Geocoding (City to Coordinates & Reverse)**: [Nominatim (OpenStreetMap)](https://nominatim.org/release-docs/develop/api/Search/)
*   **Mosque Data**: [Overpass API (OpenStreetMap)](https://overpass-api.de/)
*   **Quran Ayahs**: [Alquran.cloud API](https://alquran.cloud/api)
*   **Duas & Dhikr**: [Dua & Dhikr API by removeif](https://github.com/removeif/dua-dhikr-api) (dua-dhikr.vercel.app)

## Privacy

Please refer to the [Privacy Policy](PRIVACY_POLICY.md) for details on data collection and usage. (You will need to create this file).

## Contributing (Optional)

If you plan to make this open source:
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License (Optional)

Choose a license if you're making it open source, e.g., [MIT](LICENSE.md). (You would need to create this file).

---
*This extension was developed with the assistance of Cursor and the Gemini 2.5 Pro - Vibe Coding AI pair programmer.* 