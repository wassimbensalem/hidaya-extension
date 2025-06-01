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
    // console.log('Attempting to create notification:', title, message);
    
    // Generate a unique ID for each notification
    const notificationId = 'islamic-reminder-' + Date.now();
    
    chrome.storage.local.get(['settings'], function(result) {
        const settings = result.settings || {
            showDua: true
        };

        // Add dua to message if it's a prayer notification and duas are enabled
        let finalMessage = message;
        if (prayerName && settings.showDua && prayerDuas[prayerName]) {
            finalMessage += `\n\nDua: ${prayerDuas[prayerName]}`;
        }

        chrome.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('images/icon128.png'),
            title: title,
            message: finalMessage,
            priority: 2,
            requireInteraction: true,
            silent: true, // Set to false to enable sound
            eventTime: Date.now()
        }, function(createdId) {
            // console.log('Notification created with ID:', createdId);
            if (chrome.runtime.lastError) {
                console.error('Error creating notification:', chrome.runtime.lastError);
            }
        });
    });
}

// Function to check prayer times and send notifications
function checkPrayerTimes() {
    // console.log('Checking prayer times...');
    chrome.storage.local.get(['prayerTimes'], function(result) {
        if (result.prayerTimes) {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            
            Object.entries(result.prayerTimes).forEach(([prayer, time]) => {
                const [hours, minutes] = time.split(':').map(Number);
                const prayerTime = hours * 60 + minutes;
                
                // Check if it's time for prayer (within 1 minute)
                if (Math.abs(currentTime - prayerTime) <= 1) {
                    createNotification(
                        `Time for ${prayer}`,
                        `It's time for ${prayer} prayer. May Allah accept your prayers.`,
                        prayer
                    );
                }
            });
        } else {
            // console.log('No prayer times found in storage');
        }
    });
}

// Function to show random Islamic quote/Dhikr from API (shows notification)
async function showIslamicQuote() { 
    try {
        // Example: Fetching from 'zikir-pagi-petang' category
        // You can explore other categories: https://dua-dhikr.vercel.app/categories
        const response = await fetch('https://dua-dhikr.vercel.app/categories/zikir-pagi-petang', {
            headers: {
                'Accept-Language': 'en' // Request English translation
            }
        });
        if (!response.ok) {
            console.error(`Failed to fetch Dhikr from API: ${response.status}`);
            return; // Exit if API error
        }
        const dhikrArray = await response.json();

        if (dhikrArray && dhikrArray.length > 0) {
            const randomDhikr = dhikrArray[Math.floor(Math.random() * dhikrArray.length)];
            let message = '';
            if (randomDhikr.arabic) message += randomDhikr.arabic;
            if (randomDhikr.translation) message += `\n\n${randomDhikr.translation}`;
            if (randomDhikr.notes) message += `\n\nNotes: ${randomDhikr.notes}`;
            if (randomDhikr.fawaid) message += `\n\nBenefits: ${randomDhikr.fawaid}`;
            
            if (message) {
                createNotification(randomDhikr.title || 'Islamic Reminder', message.trim());
            } else {
                 console.warn('Selected Dhikr from API has no content to display.');
            }
        } else {
            console.warn('Dhikr API returned no items from the category.');
        }
    } catch (error) {
        console.error('Error fetching random Dhikr from API:', error);
    }
}

// Function to get a random dua from API (for notifications)
async function getRandomDua() {
    try {
        const response = await fetch('https://dua-dhikr.vercel.app/categories/daily-dua', {
            headers: {
                'Accept-Language': 'en'
            }
        });
        if (!response.ok) {
            console.error(`Failed to fetch duas from API: ${response.status}`);
            return null; // Return null on API error
        }
        const duasArray = await response.json();
        if (duasArray && duasArray.length > 0) {
            const randomDua = duasArray[Math.floor(Math.random() * duasArray.length)];
            return {
                arabic: randomDua.arabic || '',
                translation: randomDua.translation || ''
            };
        } else {
            console.warn('API returned no duas or empty array.');
            return null; // Return null if no duas are found
        }
    } catch (error) {
        console.error('Error fetching random dua from API:', error);
        return null; // Return null on any other error
    }
}

// Function to show dua notification
async function showDuaNotification() {
    const dua = await getRandomDua();
    if (dua && dua.arabic) {
        // The prayerName parameter in createNotification is for prayer-specific duas from prayerDuas array.
        // For general duas from API, we might not need it, or we pass null.
        // The createNotification function itself adds a generic "Dua:" prefix if prayerName is provided and found in prayerDuas.
        // We can call createNotification with a generic title for API-sourced duas.
        createNotification('Daily Dua Reminder', `${dua.arabic}\n\n${dua.translation}`);
    } else {
        console.error('Failed to get a Dua from API for notification. No notification will be shown.');
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
            throw new Error('Invalid surah data from API');
        }
        const ayahNumber = Math.floor(Math.random() * surahInfo.data.numberOfAyahs) + 1;
        const response = await fetch(`https://api.alquran.cloud/v1/ayah/${surahNumber}:${ayahNumber}/en.sahih`);
        if (!response.ok) {
            throw new Error(`Failed to fetch Ayah: ${response.status}`);
        }
        const data = await response.json();
        if (!data.data || !data.data.text) {
            throw new Error('Invalid ayah data from API');
        }
        return {
            text: data.data.text,
            translation: data.data.ayahs ? data.data.ayahs[0].text : (data.data.edition ? data.data.edition.englishName : data.data.text), // Adjusted to handle different possible API response structures for translation
            surahName: surahInfo.data.name,
            surahNameEn: surahInfo.data.englishName,
            surahNumber: surahNumber,
            ayahNumber: ayahNumber
        };
    } catch (error) {
        console.error('Error fetching random ayah from API:', error);
        return null; // Return null if any error occurs
    }
}

// Function to clear non-favorite notifications (renamed for clarity)
function removeUnfavoritedNotifications() {
    chrome.storage.local.get(['notifications', 'favorites'], function(result) {
        const notifications = result.notifications || [];
        const favorites = result.favorites || [];
        
        // Get IDs of favorite notifications
        const favoriteIds = favorites.map(f => f.id);
        
        // Keep only notifications that are in favorites
        const newNotifications = notifications.filter(n => favoriteIds.includes(n.id));
        
        // Update storage
        chrome.storage.local.set({ notifications: newNotifications });
    });
}

// Function to store notification
function storeNotification(notification) {
    chrome.storage.local.get(['notifications'], function(result) {
        const notifications = result.notifications || [];
        // Add timestamp and unique ID
        notification.timestamp = Date.now();
        notification.id = `notification-${notification.timestamp}`;
        // Store only the last 100 notifications
        const newNotifications = [notification, ...notifications].slice(0, 100);
        chrome.storage.local.set({ notifications: newNotifications });
    });
}

// Function to show ayah notification
async function showAyahNotification() {
    try {
        const ayah = await fetchRandomAyah();
        if (ayah && ayah.text) { // Check if a valid ayah object was returned
            const notificationId = `ayah-${Date.now()}`;
            const notificationOptions = {
                type: 'basic',
                iconUrl: 'images/icon128.png',
                title: 'Quran Ayah of the Moment', // Changed title slightly
                message: ayah.text, 
                contextMessage: `Surah ${ayah.surahNameEn} (${ayah.surahNumber}:${ayah.ayahNumber})`, // Using English Surah name for consistency
                buttons: [
                    { title: 'View Details' }
                ],
                requireInteraction: true
            };
            const notificationData = {
                id: notificationId,
                timestamp: Date.now(),
                type: 'ayah',
                content: ayah // Store the whole ayah object fetched
            };
            const { notifications = [] } = await chrome.storage.local.get('notifications');
            notifications.push(notificationData);
            await chrome.storage.local.set({ notifications });
            await chrome.storage.local.set({ lastAyah: notificationData.content });
            await chrome.notifications.create(notificationId, notificationOptions);
        } else {
            console.error('Failed to get an Ayah from API for notification.');
            // No notification will be shown if API fails
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
        // console.log('All alarms cleared');
        chrome.alarms.create('checkPrayerTimes', { periodInMinutes: 1 }); // Checks every minute for prayer times
        
        // Changed to 2 hours (120 minutes) for Dhikr/Islamic Quote notifications
        chrome.alarms.create('showIslamicQuote', { periodInMinutes: 120 }); 
        
        // Changed to 2 hours (120 minutes) for random Ayah/Dua notifications
        chrome.alarms.create('randomContentReminder', { periodInMinutes: 120 }); 
        
        chrome.alarms.create('dailyCleanup', { periodInMinutes: 1440, when: getNextMidnight() });
        // console.log('All alarms created/recreated with updated intervals');
    });
}

// Listen for alarms - MERGED
chrome.alarms.onAlarm.addListener(function(alarm) {
    // console.log('Alarm triggered:', alarm.name);
    if (alarm.name === 'checkPrayerTimes') {
        checkPrayerTimes();
    } else if (alarm.name === 'showIslamicQuote') {
        showIslamicQuote();
    } else if (alarm.name === 'randomContentReminder') {
        // Randomly choose between showing an Ayah or a Dua
        const shouldShowAyah = Math.random() < 0.5; // 50% chance for Ayah

        if (shouldShowAyah) {
            chrome.storage.local.get(['settings'], function(result) {
                const settings = result.settings || { showAyah: true }; // Default to true if not set
                if (settings.showAyah) {
                    showAyahNotification();
                }
            });
        } else {
            chrome.storage.local.get(['settings'], function(result) {
                const settings = result.settings || { showDua: true }; // Default to true if not set
                if (settings.showDua) {
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
    if (buttonIndex === 0) { // "View Details" button for Ayah notifications
        chrome.storage.local.get(['lastAyah'], function(result) {
            if (result.lastAyah) {
                chrome.tabs.create({
                    url: `ayah.html?surah=${result.lastAyah.surahNumber}&ayah=${result.lastAyah.ayahNumber}`
                });
            }
        });
    }
});

// REVERT THE onMessage listener to its state before dashboard changes
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // This listener was previously very simple or might not have handled many messages
    // If there were other relevant message handlers here before the dashboard, they should be restored.
    // For now, making it a simple logger and returning false.
    console.log("Message received in background.js (reverted state):", request);
    return false; // Default for synchronous responses or if action is not handled here
});

// On extension install/update - MERGED
chrome.runtime.onInstalled.addListener((details) => {
    // console.log('Extension installed/updated. Reason:', details.reason);

    // Initialize settings
    chrome.storage.local.get(['settings'], function(result) {
        if (!result.settings) {
            chrome.storage.local.set({
                settings: {
                    showAyah: true,
                    showDua: true // Assuming default for showDua is also true
                }
            });
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

    // Request notification permission (good place to do it on install)
    if (chrome.notifications && chrome.notifications.getPermissionLevel) {
        chrome.notifications.getPermissionLevel((level) => {
            // console.log('Notification permission level:', level);
            if (level === 'denied') {
                // console.log('Notifications are blocked. Please enable them in Chrome settings.');
                // Optionally, create a notification to guide the user to enable them.
            } else if (level === 'granted') {
                // console.log('Notifications are permitted.');
            }
        });
    }
    
    // Initialize alarms
    initializeAlarms();
});

// Service worker listeners should be at the top level.
// The call to initializeAlarms() at the very end of the script is removed.
// Alarms are now initialized via onInstalled and will persist. 