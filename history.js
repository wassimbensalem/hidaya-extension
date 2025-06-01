// Function to create notification item HTML
function createNotificationItem(notification, isFavorite = false) {
    const item = document.createElement('div');
    item.className = 'notification-item';
    item.dataset.id = notification.id;
    
    // Helper to convert numbers to Eastern Arabic numerals for display
    const arabicNumerals = {
        '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
        '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
    };
    const convertToArabicNumerals = (num) => {
        return num.toString().replace(/[0-9]/g, digit => arabicNumerals[digit]);
    };
    
    const ayahNumber = convertToArabicNumerals(notification.content.ayahNumber || '');
    
    // Construct HTML for the notification item
    let content = `
        <div class="arabic">${notification.content.text || notification.content.arabic || notification.content.message}</div>
        <div class="translation">${notification.content.translation || ''}</div>
        <div class="info" style="direction: rtl; text-align: right;">سورة ${notification.content.surahName || ''} - الآية ${ayahNumber}</div>
        <div class="actions">
            <button class="action-btn favorite" data-action="favorite">
                ${isFavorite ? 'Unfavorite' : 'Favorite'}
            </button>
            <button class="action-btn" data-action="copy">Copy</button>
            <button class="action-btn delete" data-action="delete">Delete</button>
        </div>
    `;
    
    item.innerHTML = content;
    return item;
}

// Function to display notifications
function displayNotifications(notifications, containerId, isFavorite = false) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Clear previous content
    
    if (notifications.length === 0) {
        if (containerId === 'history-list') {
            container.innerHTML = `
                <div class="empty-state">
                    No notifications found. Non-favorite notifications are cleared daily.
                </div>
            `;
        } else { // favorites-list
            container.innerHTML = `
                <div class="empty-state">
                    No favorite notifications found. Add some via the "Favorite" button.
                </div>
            `;
        }
        return;
    }
    
    notifications.forEach(notification => {
        const item = createNotificationItem(notification, isFavorite);
        container.appendChild(item);
    });
    
    // Add event listeners to action buttons within the notification items
    container.querySelectorAll('.action-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const action = e.target.dataset.action;
            const item = e.target.closest('.notification-item');
            const notificationId = item.dataset.id;
            
            switch (action) {
                case 'favorite':
                    toggleFavorite(notificationId);
                    break;
                case 'copy':
                    copyToClipboard(item);
                    break;
                case 'delete':
                    deleteNotification(notificationId, isFavorite);
                    break;
            }
        });
    });
}

// Retrieves a notification object by its ID from storage (checks both history and favorites)
function getNotificationById(notificationId) {
    return new Promise((resolve) => {
        chrome.storage.local.get(['notifications', 'favorites'], function(result) {
            const allNotifications = (result.notifications || []).concat(result.favorites || []);
            const notification = allNotifications.find(n => n.id === notificationId);
            resolve(notification);
        });
    });
}

// Function to toggle favorite status
function toggleFavorite(notificationId) {
    chrome.storage.local.get(['notifications', 'favorites'], function(result) {
        let notifications = result.notifications || [];
        let favorites = result.favorites || [];
        let notificationToToggle = favorites.find(f => f.id === notificationId); // Check favorites first
        let isCurrentlyFavorite = true;

        if (!notificationToToggle) { // If not in favorites, check notifications history
            notificationToToggle = notifications.find(n => n.id === notificationId);
            isCurrentlyFavorite = false;
        }

        if (!notificationToToggle) return; // Should not happen if UI is correct
        
        if (isCurrentlyFavorite) {
            favorites = favorites.filter(f => f.id !== notificationId);
        } else {
            // Ensure no duplicates if it somehow exists in both (though unlikely with current logic)
            favorites = favorites.filter(f => f.id !== notificationId);
            favorites.push(notificationToToggle);
        }
        
        chrome.storage.local.set({ favorites: favorites });
        loadNotifications(); // Refresh display
    });
}

function copyToClipboard(itemElement) {
    // Extract content directly from the provided item element
    const arabic = itemElement.querySelector('.arabic').textContent;
    const translation = itemElement.querySelector('.translation').textContent;
    const info = itemElement.querySelector('.info').textContent;
    
    const textToCopy = `${arabic}\n\n${translation}\n\n${info}`.trim();
    navigator.clipboard.writeText(textToCopy).then(() => {
        alert('Copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy.');
    });
}

function deleteNotification(notificationId, isCurrentlyInFavoritesList) {
    chrome.storage.local.get(['notifications', 'favorites'], function(result) {
        let notifications = result.notifications || [];
        let favorites = result.favorites || [];
        
        if (isCurrentlyInFavoritesList) {
            favorites = favorites.filter(f => f.id !== notificationId);
            // Also remove from main notifications list if it exists there, to ensure consistency
            notifications = notifications.filter(n => n.id !== notificationId);
        } else { // Deleting from the history list
            notifications = notifications.filter(n => n.id !== notificationId);
            // If it was also a favorite, remove it from favorites too
            favorites = favorites.filter(f => f.id !== notificationId);
        }
        
        chrome.storage.local.set({ notifications: notifications, favorites: favorites }, () => {
            loadNotifications(); // Refresh display
        });
    });
}

// Function to load notifications
function loadNotifications() {
    chrome.storage.local.get(['notifications', 'favorites'], function(result) {
        const notifications = result.notifications || [];
        const favorites = result.favorites || [];
        
        // Display all non-favorite notifications in the history tab
        // And favorite notifications in the favorites tab
        displayNotifications(notifications, 'history-list', false);
        displayNotifications(favorites, 'favorites-list', true);
    });
}

// Function to handle tab switching
function handleTabs() {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            const contentId = tab.dataset.tab; // e.g., "history-list" or "favorites-list"
            document.getElementById(contentId).classList.add('active');
        });
    });
}

// Function to handle back button
function handleBackButton() {
    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = 'popup.html'; // Navigate back to main popup
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    handleTabs();
    handleBackButton();
    loadNotifications();
});

// Function to create notification card (Removed as it seems to be unused/incomplete)
/*
function createNotificationCard(notification) {
    const card = document.createElement('div');
    card.className = 'notification-card';
    
    const content = document.createElement('div');
    content.className = 'notification-content';
    
    const title = document.createElement('h3');
    title.textContent = notification.type === 'ayah' ? 'Quran Ayah' : 'Islamic Reminder';
    
    const message = document.createElement('p');
    message.textContent = notification.content.text || notification.content.arabic || notification.content.message;
    
    const details = document.createElement('div');
    details.className = 'notification-details';
    
    if (notification.type === 'ayah') {
        const surahInfo = document.createElement('p');
        surahInfo.className = 'surah-info';
        surahInfo.textContent = `سورة ${notification.content.surahName || ''} - ${notification.content.ayahNumber || ''}`;
        
        const translation = document.createElement('p');
        translation.className = 'translation';
        translation.textContent = notification.content.translation || '';
        
        details.appendChild(surahInfo);
        details.appendChild(translation);
    }
    
    const timestamp = document.createElement('p');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date(notification.timestamp).toLocaleString();
    
    const actions = document.createElement('div');
    actions.className = 'notification-actions';
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy';
    copyBtn.onclick = () => copyToClipboard(notification);
    
    const favoriteBtn = document.createElement('button');
    favoriteBtn.className = 'favorite-btn';
    favoriteBtn.innerHTML = isFavorite(notification.id) ? 
        '<i class="fas fa-heart"></i> Remove from Favorites' : 
        '<i class="far fa-heart"></i> Add to Favorites';
    favoriteBtn.onclick = () => toggleFavorite(notification);
    
    actions.appendChild(copyBtn);
    actions.appendChild(favoriteBtn);
    
    content.appendChild(title);
    content.appendChild(message);
    content.appendChild(details);
    content.appendChild(timestamp);
    content.appendChild(actions);
    
    card.appendChild(content);
    
    return card;
}
*/ 