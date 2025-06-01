# Privacy Policy for Hidaya Chrome Extension

Last Updated: June 1, 2025

Thank you for using Hidaya, your Islamic Companion Chrome Extension ("Extension"). This Privacy Policy explains how we handle information in connection with your use of the Extension.

## Information We Collect

1.  **Geolocation Data**: If you grant permission, the Extension uses your browser's geolocation service to determine your approximate geographical location (latitude and longitude). This is used solely to:
    *   Fetch prayer times for your current location from the Aladhan API.
    *   Fetch nearby mosque information from the Overpass API for the "Nearest Mosque" feature.
    Your geolocation data is used ephemerally for these requests and is **not stored by the Hidaya extension itself** persistently, except potentially your city name if you manually set it or if it's derived from geolocation and stored for your convenience.

2.  **User Preferences / Settings**: The Extension stores certain preferences locally on your device using `chrome.storage.local`. This may include:
    *   Your manually entered city name (if any).
    *   Prayer time calculation method preferences (if this setting is implemented).
    *   Notification preferences (e.g., whether to show certain types of notifications, favorite notifications).
    This data is stored only on your local browser instance and is not transmitted to any external server by the Hidaya extension, other than what is necessary for API requests (e.g. city name for prayer times).

3.  **Notification History**: Details of notifications shown (like Ayah text, Surah name, Dua content) are stored locally using `chrome.storage.local` to populate the History page. This data remains on your device.

## How We Use Information

*   **To Provide Functionality**: Geolocation is used to provide accurate prayer times and find nearby mosques. Stored settings are used to customize your experience.
*   **API Interactions**: The Extension interacts with third-party APIs to fetch data:
    *   **Aladhan API**: For prayer times (may receive coordinates or city name).
    *   **Nominatim API**: For converting city names to coordinates and vice-versa (may receive city name or coordinates).
    *   **Overpass API**: For mosque data (may receive coordinates).
    *   **Alquran.cloud API**: For Quranic ayah data.
    *   **Dua & Dhikr API (dua-dhikr.vercel.app)**: For Duas and Dhikr content.
    We do not control the data handling practices of these third-party APIs. Please review their respective privacy policies for more information.

## Information Sharing and Disclosure

We do not share your personal information collected by the Hidaya extension with any third parties, except as necessary to interact with the APIs mentioned above to provide the Extension's functionality.

The Hidaya extension does **not** have its own backend server and does **not** collect or store your personal data on any remote servers controlled by the developer(s) of Hidaya.

## Data Security

Locally stored data (settings, notification history) is protected by your browser's security mechanisms. We take reasonable measures to ensure the code of the extension itself is secure, but cannot guarantee the security of your browser or device.

## Your Choices

*   **Geolocation**: You can enable or disable location access for the Extension at any time through your browser's site permission settings for the Extension.
*   **Local Data**: You can clear locally stored data by uninstalling the Extension or by clearing browsing data for extensions in your Chrome settings.

## Children's Privacy

The Extension is not directed to children under the age of 13, and we do not knowingly collect personal information from children.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy within the Extension or on its web store page. You are advised to review this Privacy Policy periodically for any changes.

## Contact Us

If you have any questions about this Privacy Policy, please contact us at: bswassim@gmail.com 