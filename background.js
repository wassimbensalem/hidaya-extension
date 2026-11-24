// Ensure alarms survive service worker restarts (top-level guard)
chrome.alarms.get('checkPrayerTimes', (alarm) => {
    if (!alarm) initializeAlarms();
});

// Islamic quotes and reminders - This array will be removed
// const islamicQuotes = [ ... ];

// Dua suggestions for each prayer
const prayerDuas = {
    Fajr: "اللَّهُمَّ بَارِكْ لِي فِي يَوْمِي هَذَا",
    Dhuhr: "اللَّهُمَّ أَنْتَ السَّلاَمُ وَمِنْكَ السَّلاَمُ تَبَارَكْتَ يَا ذَا الْجَلاَلِ وَالإِكْرَامِ",
    Asr: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ",
    Maghrib: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا وَرِزْقًا طَيِّبًا وَعَمَلاً مُتَقَبَّلاً",
    Isha: "اللَّهُمَّ أَسْلَمْتُ نَفْسِي إِلَيْكَ وَفَوَّضْتُ أَمْرِي إِلَيْكَ"
};

// Function to create notification
function createNotification(title, message, prayerName = null) {
    const notificationId = 'islamic-reminder-' + Date.now();
    
    chrome.storage.local.get(['settings'], function(result) {
        const settings = result.settings || {
            showDua: true // Default if not set
        };

        let finalMessage = message;
        if (prayerName && settings.showDua && prayerDuas[prayerName]) {
            finalMessage += `\n\nDua: ${prayerDuas[prayerName]}`;
        }

        chrome.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('png_icons/icon128.png'), // Updated path
            title: title,
            message: finalMessage,
            priority: 2,
            requireInteraction: true,
            silent: true, // Set to false to enable sound for notifications
            eventTime: Date.now()
        }, function(createdId) {
            if (chrome.runtime.lastError) {
                console.error('Error creating notification:', chrome.runtime.lastError.message);
            }
        });
    });
}

// Function to check prayer times and send notifications
function checkPrayerTimes() {
    chrome.storage.local.get(['prayerTimes'], function(result) {
        if (result.prayerTimes) {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            
            Object.entries(result.prayerTimes).forEach(([prayer, time]) => {
                const [hours, minutes] = time.split(':').map(Number);
                const prayerTime = hours * 60 + minutes;
                
                // Notify if it's prayer time (within a 1-minute window)
                if (Math.abs(currentTime - prayerTime) <= 1) {
                    createNotification(
                        `Time for ${prayer}`,
                        `It's time for ${prayer} prayer. May Allah accept your prayers.`,
                        prayer
                    );
                }
            });
        }
    });
}

// Shared helper: fetch a random item from a dua-dhikr.vercel.app category.
// API v2 structure: GET /categories/{slug} → {data:[{id,title,...}]}
//                   GET /categories/{slug}/{id} → {data:{arabic,translation,...}}
// The category list is cached for 24 hours to avoid 429 rate-limit errors.
const DHIKR_LIST_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

async function fetchRandomDhikrItem(category) {
    const headers = { 'Accept-Language': 'en' };
    const cacheKey = `dhikrList_${category}`;
    const cacheTs  = `dhikrListTs_${category}`;

    // Use cached list if fresh
    const stored = await chrome.storage.local.get([cacheKey, cacheTs]);
    let items = stored[cacheKey];
    const cachedAt = stored[cacheTs] || 0;

    if (!Array.isArray(items) || items.length === 0 || Date.now() - cachedAt > DHIKR_LIST_TTL) {
        const listRes = await fetch(`https://dua-dhikr.vercel.app/categories/${category}`, { headers });
        if (!listRes.ok) throw new Error(`List fetch failed: ${listRes.status}`);
        const listJson = await listRes.json();
        items = listJson.data;
        if (!Array.isArray(items) || items.length === 0) throw new Error('Empty list');
        await chrome.storage.local.set({ [cacheKey]: items, [cacheTs]: Date.now() });
    }

    const pick = items[Math.floor(Math.random() * items.length)];
    const itemRes = await fetch(`https://dua-dhikr.vercel.app/categories/${category}/${pick.id}`, { headers });
    if (!itemRes.ok) throw new Error(`Item fetch failed: ${itemRes.status}`);
    const itemJson = await itemRes.json();
    return itemJson.data;
}

// Function to show random morning/evening Dhikr notification
async function showIslamicQuote() {
    try {
        // Alternate between morning-dhikr and evening-dhikr
        const category = Math.random() < 0.5 ? 'morning-dhikr' : 'evening-dhikr';
        const dhikr = await fetchRandomDhikrItem(category);
        let message = '';
        if (dhikr.arabic) message += dhikr.arabic;
        if (dhikr.translation) message += `\n\n${dhikr.translation}`;
        if (dhikr.notes) message += `\n\nNotes: ${dhikr.notes}`;
        if (message) {
            createNotification(dhikr.title || 'Dhikr Reminder', message.trim());
        }
    } catch (error) {
        console.error('Error fetching Dhikr:', error);
    }
}

// Function to get a random dua from API (for notifications)
async function getRandomDua() {
    try {
        const dua = await fetchRandomDhikrItem('daily-dua');
        return {
            arabic: dua.arabic || '',
            translation: dua.translation || ''
        };
    } catch (error) {
        console.error('Error fetching random dua:', error);
        return null;
    }
}

// Function to show dua notification
async function showDuaNotification() {
    const dua = await getRandomDua();
    if (dua && dua.arabic) {
        createNotification('Daily Dua Reminder', `${dua.arabic}\n\n${dua.translation}`);
    } else {
        console.warn('Failed to get a Dua from API for notification.');
    }
}

// Function to fetch random ayah
async function fetchRandomAyah() {
    try {
        const surahNumber = Math.floor(Math.random() * 114) + 1;
        const surahInfoResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}`);
        if (!surahInfoResponse.ok) {
            throw new Error(`Failed to fetch Surah info: ${surahInfoResponse.status}`);
        }
        const surahInfo = await surahInfoResponse.json();
        if (!surahInfo.data || !surahInfo.data.numberOfAyahs) {
            throw new Error('Invalid surah data from Al Quran Cloud API');
        }
        const ayahNumber = Math.floor(Math.random() * surahInfo.data.numberOfAyahs) + 1;
        // Fetches English translation by Sahih International
        const response = await fetch(`https://api.alquran.cloud/v1/ayah/${surahNumber}:${ayahNumber}/en.sahih`);
        if (!response.ok) {
            throw new Error(`Failed to fetch Ayah: ${response.status}`);
        }
        const data = await response.json();
        if (!data.data || !data.data.text) {
            throw new Error('Invalid ayah data from Al Quran Cloud API');
        }
        return {
            text: data.data.text,
            // Attempt to get specific translation, fallback to main text if structured differently
            translation: data.data.ayahs ? data.data.ayahs[0].text : (data.data.edition ? data.data.edition.englishName : data.data.text),
            surahName: surahInfo.data.name, // Arabic name of Surah
            surahNameEn: surahInfo.data.englishName,
            surahNumber: surahNumber,
            ayahNumber: ayahNumber
        };
    } catch (error) {
        console.error('Error fetching random ayah from Al Quran Cloud API:', error);
        return null;
    }
}

// Function to clear non-favorite notifications (renamed for clarity)
function removeUnfavoritedNotifications() {
    chrome.storage.local.get(['notifications', 'favorites'], function(result) {
        const notifications = result.notifications || [];
        const favorites = result.favorites || [];
        const favoriteIds = favorites.map(f => f.id);
        const newNotifications = notifications.filter(n => favoriteIds.includes(n.id));
        chrome.storage.local.set({ notifications: newNotifications });
    });
}

// Function to store notification
function storeNotification(notification) {
    chrome.storage.local.get(['notifications'], function(result) {
        let notifications = result.notifications || [];
        notification.timestamp = Date.now();
        notification.id = `notification-${notification.timestamp}`;
        notifications = [notification, ...notifications].slice(0, 100);
        chrome.storage.local.set({ notifications: notifications });
    });
}

// Function to show ayah notification
async function showAyahNotification() {
    try {
        const ayah = await fetchRandomAyah();
        if (ayah && ayah.text) {
            const notificationId = `ayah-${Date.now()}`;
            const notificationOptions = {
                type: 'basic',
                iconUrl: chrome.runtime.getURL('png_icons/icon128.png'),
                title: 'Quran Ayah of the Moment',
                message: ayah.text, 
                contextMessage: `Surah ${ayah.surahNameEn} (${ayah.surahNumber}:${ayah.ayahNumber})`,
                buttons: [
                    { title: 'View Details' } // Button to open ayah.html
                ],
                requireInteraction: true
            };
            // Store notification details for history/favorites
            const notificationData = {
                id: notificationId,
                timestamp: Date.now(),
                type: 'ayah',
                content: ayah 
            };
            const { notifications = [] } = await chrome.storage.local.get('notifications');
            notifications.push(notificationData);
            await chrome.storage.local.set({ notifications });
            await chrome.storage.local.set({ lastAyah: notificationData.content }); // Store for "View Details"
            await chrome.notifications.create(notificationId, notificationOptions);
        } else {
            console.warn('Failed to get an Ayah from API for notification.');
        }
    } catch (error) {
        console.error('Error in showAyahNotification system:', error);
    }
}

// Function to get next midnight timestamp
function getNextMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime();
}

// Function to initialize all alarms
function initializeAlarms() {
    chrome.alarms.clearAll(() => {
        chrome.alarms.create('checkPrayerTimes', { periodInMinutes: 1 });
        chrome.alarms.create('showIslamicQuote', { periodInMinutes: 120 }); // Dhikr/Quote every 2 hours
        chrome.alarms.create('randomContentReminder', { periodInMinutes: 120 }); // Ayah/Dua every 2 hours
        chrome.alarms.create('dailyCleanup', { periodInMinutes: 1440, when: getNextMidnight() }); // Daily at midnight
    });
    updatePrayerBadge(); // Sync badge on startup
}

// Listen for alarms - MERGED
chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name === 'checkPrayerTimes') {
        checkPrayerTimes();
    } else if (alarm.name === 'showIslamicQuote') {
        chrome.storage.local.get(['settings'], function(result) {
            if (!result.settings || result.settings.showAyah !== false) {
                showIslamicQuote();
            }
        });
    } else if (alarm.name === 'randomContentReminder') {
        const shouldShowAyah = Math.random() < 0.5; // 50% chance
        if (shouldShowAyah) {
            chrome.storage.local.get(['settings'], function(result) {
                if (result.settings && result.settings.showAyah !== false) { // Default true
                    showAyahNotification();
                }
            });
        } else {
            chrome.storage.local.get(['settings'], function(result) {
                if (result.settings && result.settings.showDua !== false) { // Default true
                    showDuaNotification();
                }
            });
        }
    } else if (alarm.name === 'dailyCleanup') {
        removeUnfavoritedNotifications();
    }
});

// Handle notification click
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    if (buttonIndex === 0) { // "View Details" button on ayah notifications
        chrome.tabs.create({
            url: chrome.runtime.getURL('history.html')
        });
    }
});

// REVERT THE onMessage listener to its state before dashboard changes
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchRandomAyah') {
        fetchRandomAyah().then(sendResponse);
        return true; // Indicates asynchronous response
    } else if (request.action === 'fetchRandomDhikr') {
        // Similar to fetchRandomAyah, but for Dhikr. Need a function that returns Dhikr content.
        // For now, let's assume you might add a function like fetchRandomDhikrForPopup
        // that is tailored for on-demand requests from the popup.
        // This part needs to be implemented if the popup needs to pull Dhikr directly.
        // showIslamicQuote(); // This shows a notification, not what popup wants.
        // For now, returning null or an empty object as a placeholder.
        // Placeholder: You'll need a function that fetches and returns Dhikr data for the popup.
        fetchRandomDhikrItem('morning-dhikr').then(sendResponse).catch(() => sendResponse(null));
        return true; // Indicates asynchronous response
    }
    // Return false for synchronous responses or if action is not handled here.
    return false; 
});

// Update the extension badge with today's prayer count
function updatePrayerBadge() {
    const todayKey = new Date().toISOString().split('T')[0];
    chrome.storage.local.get({ prayerLog: {} }, ({ prayerLog }) => {
        const todayLog = prayerLog[todayKey] || {};
        const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        const count = prayers.filter(p => todayLog[p]).length;
        if (count === 0) {
            chrome.action.setBadgeText({ text: '' });
        } else {
            chrome.action.setBadgeText({ text: `${count}/5` });
            chrome.action.setBadgeBackgroundColor({
                color: count === 5 ? '#28a745' : '#007bff'
            });
        }
    });
}

// Keep badge in sync whenever prayer log changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.prayerLog) {
        updatePrayerBadge();
    }
});

// On extension install/update - MERGED
chrome.runtime.onInstalled.addListener((details) => {
    // Initialize default settings on first install or update
    chrome.storage.local.get(['settings'], function(result) {
        const currentSettings = result.settings || {};
        const defaultSettings = {
            showAyah: true,
            showDua: true
        };
        const newSettings = {...defaultSettings, ...currentSettings};
        if (!result.settings || result.settings.showAyah === undefined || result.settings.showDua === undefined) {
            chrome.storage.local.set({ settings: newSettings });
        }
    });
    
    // Initialize notifications and favorites arrays if they don't exist
    chrome.storage.local.get(['notifications', 'favorites'], function(result) {
        if (!result.notifications) {
            chrome.storage.local.set({ notifications: [] });
        }
        if (!result.favorites) {
            chrome.storage.local.set({ favorites: [] });
        }
    });

    // Check and request notification permission if not already granted.
    if (chrome.notifications && chrome.notifications.getPermissionLevel) {
        chrome.notifications.getPermissionLevel((level) => {
            if (level === 'denied') {
                // Consider guiding user to enable notifications via a popup or options page.
                console.warn('Notifications are blocked. Please enable them in Chrome settings.');
            }
        });
    }
    
    initializeAlarms(); // Setup all necessary alarms
});

// Service worker listeners should be at the top level.
// The call to initializeAlarms() at the very end of the script is removed.
// Alarms are now initialized via onInstalled and will persist. 