// Function to create notification item HTML
function createNotificationItem(notification, isFavorite = false) {
    const item = document.createElement('div');
    item.className = 'notification-item';
    item.dataset.id = notification.id;
    
    // Convert numbers to Arabic numerals
    const arabicNumerals = {
        '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
        '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
    };
    
    const convertToArabicNumerals = (num) => {
        return num.toString().replace(/[0-9]/g, digit => arabicNumerals[digit]);
    };
    
    const ayahNumber = convertToArabicNumerals(notification.content.ayahNumber || '');
    
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
    container.innerHTML = '';
    
    if (notifications.length === 0) {
        if (containerId === 'history-list') {
            container.innerHTML = `
                <div class="empty-state">
                    No notifications found. Non-favorite notifications are cleared daily at midnight.
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    No favorite notifications found. Add some by clicking the "Favorite" button on any notification.
                </div>
            `;
        }
        return;
    }
    
    notifications.forEach(notification => {
        const item = createNotificationItem(notification, isFavorite);
        container.appendChild(item);
    });
    
    // Add event listeners to buttons
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

// Function to get notification by ID
function getNotificationById(notificationId) {
    return new Promise((resolve) => {
        chrome.storage.local.get(['notifications', 'favorites'], function(result) {
            const notifications = result.notifications || [];
            const favorites = result.favorites || [];
            const notification = notifications.find(n => n.id === notificationId) || 
                               favorites.find(f => f.id === notificationId);
            resolve(notification);
        });
    });
}

// Function to toggle favorite status
function toggleFavorite(notificationId) {
    chrome.storage.local.get(['notifications', 'favorites'], function(result) {
        const notifications = result.notifications || [];
        const favorites = result.favorites || [];
        
        const notification = notifications.find(n => n.id === notificationId);
        if (!notification) return;
        
        const isFavorite = favorites.some(f => f.id === notificationId);
        
        if (isFavorite) {
            // Remove from favorites
            const newFavorites = favorites.filter(f => f.id !== notificationId);
            chrome.storage.local.set({ favorites: newFavorites });
        } else {
            // Add to favorites
            chrome.storage.local.set({ favorites: [...favorites, notification] });
        }
        
        // Update display
        loadNotifications();
    });
}

// Function to copy notification to clipboard
function copyToClipboard(item) {
    const arabic = item.querySelector('.arabic').textContent;
    const translation = item.querySelector('.translation').textContent;
    const info = item.querySelector('.info').textContent;
    
    const text = `${arabic}\n\n${translation}\n\n${info}`;
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
}

// Function to delete notification
function deleteNotification(notificationId, isFavorite) {
    chrome.storage.local.get(['notifications', 'favorites'], function(result) {
        const notifications = result.notifications || [];
        const favorites = result.favorites || [];
        
        if (isFavorite) {
            // Remove from favorites
            const newFavorites = favorites.filter(f => f.id !== notificationId);
            chrome.storage.local.set({ favorites: newFavorites });
        } else {
            // Remove from notifications
            const newNotifications = notifications.filter(n => n.id !== notificationId);
            chrome.storage.local.set({ notifications: newNotifications });
        }
        
        // Update display
        loadNotifications();
    });
}

// Function to load notifications
function loadNotifications() {
    chrome.storage.local.get(['notifications', 'favorites'], function(result) {
        const notifications = result.notifications || [];
        const favorites = result.favorites || [];
        
        displayNotifications(notifications, 'history-list');
        displayNotifications(favorites, 'favorites-list', true);
    });
}

// Function to handle tab switching
function handleTabs() {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const contentId = tab.dataset.tab;
            document.getElementById(contentId).classList.add('active');
        });
    });
}

// Function to handle back button
function handleBackButton() {
    document.getElementById('back-btn').addEventListener('click', () => {
        window.location.href = 'popup.html';
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