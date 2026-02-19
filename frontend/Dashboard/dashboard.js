let currentUser = localStorage.getItem('currentUser') || 'Guest User';
let allPosts = JSON.parse(localStorage.getItem('allPosts')) || [];
let userPosts = [];
let likedPosts = [];
let savedPosts = [];

function getCurrentUser() {
    return currentUser;
}

function setCurrentUser(name) {
    currentUser = name;
    localStorage.setItem('currentUser', name);
    updateProfileDisplay();
}

function updateProfileDisplay() {
    const profileName = document.getElementById('userName');
    if (profileName) {
        profileName.textContent = currentUser;
    }
    updateDashboardStats();
}

function updateDashboardStats() {
    const userPosts = getUserPosts();
    const likedIds = JSON.parse(localStorage.getItem(`likedPosts_${currentUser}`)) || [];
    const savedIds = JSON.parse(localStorage.getItem(`savedPosts_${currentUser}`)) || [];
    const connections = parseInt(localStorage.getItem(`connections_${currentUser}`)) || 0;
    
    const postCount = document.getElementById('dashPostCount');
    const likeCount = document.getElementById('dashLikeCount');
    const savedCount = document.getElementById('dashSavedCount');
    const connectionCount = document.getElementById('dashConnectionCount');
    
    if (postCount) postCount.textContent = userPosts.length;
    if (likeCount) likeCount.textContent = likedIds.length;
    if (savedCount) savedCount.textContent = savedIds.length;
    if (connectionCount) connectionCount.textContent = connections;
}

function incrementConnections(postUser) {
    if (postUser === currentUser) return;
    
    const connections = parseInt(localStorage.getItem(`connections_${currentUser}`)) || 0;
    localStorage.setItem(`connections_${currentUser}`, connections + 1);
    updateDashboardStats();
}

function createPost(content) {
    const post = {
        id: Date.now(),
        user: currentUser,
        time: 'Just now',
        content: content,
        likes: 0,
        comments: 0,
        likedBy: [],
        timestamp: new Date().toISOString()
    };
    
    allPosts.unshift(post);
    userPosts.unshift(post);
    localStorage.setItem('allPosts', JSON.stringify(allPosts));
    
    return post;
}

function publishPost() {
    const textarea = document.getElementById('postContent');
    const content = textarea.value.trim();
    
    if (!content) {
        alert('Please write something before posting');
        return;
    }
    
    createPost(content);
    textarea.value = '';
    switchTab('posts');
    updateDashboardStats();
}

function getAllPosts() {
    return allPosts.filter(post => post.user !== currentUser);
}

function getUserPosts() {
    return allPosts.filter(post => post.user === currentUser);
}

function buildPostHTML(post) {
    const isLiked = post.likedBy && post.likedBy.includes(currentUser);
    const isSaved = post.savedBy && post.savedBy.includes(currentUser);
    const likeClass = isLiked ? 'liked' : '';
    const saveClass = isSaved ? 'saved' : '';
    
    return `
        <div class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <img src="https://via.placeholder.com/40" alt="${post.user}" class="post-avatar">
                <div class="post-user-info">
                    <h4>${post.user}</h4>
                    <span class="post-time">${post.time}</span>
                </div>
            </div>
            <p class="post-content">${post.content}</p>
            <div class="post-actions">
                <button class="post-action-btn ${likeClass}" onclick="toggleLike(${post.id})">
                    <span>👍</span>
                    <span>${post.likes}</span>
                </button>
                <button class="post-action-btn" onclick="showComments(${post.id})">
                    <span>💬</span>
                    <span>${post.comments}</span>
                </button>
                <button class="post-action-btn ${saveClass}" onclick="toggleSave(${post.id})">
                    <span>🔖</span>
                </button>
            </div>
        </div>
    `;
}

function renderPosts(posts) {
    const feed = document.querySelector('.posts-feed');
    if (!feed) return;
    
    if (posts.length === 0) {
        feed.innerHTML = '<p style="text-align: center; opacity: 0.7;">No posts yet</p>';
        return;
    }
    
    feed.innerHTML = posts.map(buildPostHTML).join('');
}

function toggleLike(postId) {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    
    if (!post.likedBy) post.likedBy = [];
    
    const index = post.likedBy.indexOf(currentUser);
    if (index > -1) {
        post.likedBy.splice(index, 1);
        post.likes--;
        const likedIndex = likedPosts.findIndex(p => p.id === postId);
        if (likedIndex > -1) {
            likedPosts.splice(likedIndex, 1);
        }
    } else {
        post.likedBy.push(currentUser);
        post.likes++;
        if (!likedPosts.find(p => p.id === postId)) {
            likedPosts.push(post);
        }
        incrementConnections(post.user);
    }
    
    localStorage.setItem('allPosts', JSON.stringify(allPosts));
    saveLikedPosts();
    refreshCurrentView();
    updateDashboardStats();
}

function toggleSave(postId) {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;
    
    if (!post.savedBy) post.savedBy = [];
    
    const isSaved = post.savedBy.includes(currentUser);
    const index = savedPosts.findIndex(p => p.id === postId);
    
    if (isSaved) {
        post.savedBy.splice(post.savedBy.indexOf(currentUser), 1);
        if (index > -1) {
            savedPosts.splice(index, 1);
        }
    } else {
        post.savedBy.push(currentUser);
        if (index === -1) {
            savedPosts.push(post);
        }
    }
    
    localStorage.setItem('allPosts', JSON.stringify(allPosts));
    saveSavedPosts();
    refreshCurrentView();
    updateDashboardStats();
}

function saveLikedPosts() {
    const likedIds = likedPosts.map(p => p.id);
    localStorage.setItem(`likedPosts_${currentUser}`, JSON.stringify(likedIds));
}

function saveSavedPosts() {
    const savedIds = savedPosts.map(p => p.id);
    localStorage.setItem(`savedPosts_${currentUser}`, JSON.stringify(savedIds));
}

function loadUserLikesAndSaves() {
    const likedIds = JSON.parse(localStorage.getItem(`likedPosts_${currentUser}`)) || [];
    const savedIds = JSON.parse(localStorage.getItem(`savedPosts_${currentUser}`)) || [];
    
    likedPosts = allPosts.filter(post => likedIds.includes(post.id));
    savedPosts = allPosts.filter(post => savedIds.includes(post.id));
}

function showComments(postId) {
    console.log('Comments for post:', postId);
}

function switchTab(tabType) {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    
    const postCreateBox = document.querySelector('.post-create-box');
    
    let posts = [];
    if (tabType === 'posts') {
        posts = getUserPosts();
        tabs[0].classList.add('active');
        if (postCreateBox) postCreateBox.style.display = 'block';
    } else if (tabType === 'liked') {
        loadUserLikesAndSaves();
        posts = likedPosts;
        tabs[1].classList.add('active');
        if (postCreateBox) postCreateBox.style.display = 'none';
    } else if (tabType === 'saved') {
        loadUserLikesAndSaves();
        posts = savedPosts;
        tabs[2].classList.add('active');
        if (postCreateBox) postCreateBox.style.display = 'none';
    }
    
    renderPosts(posts);
}

function refreshCurrentView() {
    const activeTab = document.querySelector('.tab-btn.active');
    const tabIndex = Array.from(document.querySelectorAll('.tab-btn')).indexOf(activeTab);
    const tabTypes = ['posts', 'liked', 'saved'];
    switchTab(tabTypes[tabIndex] || 'posts');
}

const samplePostTemplates = [
    "Taking time for self-reflection today. Setting healthy boundaries has transformed my emotional wellbeing. Grateful for this journey! 🙏",
    "Morning devotional was exactly what my soul needed. There's something powerful about starting the day with intention and gratitude. ✨",
    "Sharing my testimony: Learning to trust God through difficult seasons has strengthened my faith. Remember, you're never alone on this journey. 💙",
    "Prayer changes everything. Feeling blessed by God's faithfulness in my life today. 🙌",
    "Working on forgiving myself and others. It's a journey, but healing is happening! 💜",
    "Just finished reading my Bible plan for today. God's word never fails to speak to my heart. 📖",
    "Grateful for this community of believers who support and encourage each other. We're stronger together! 💪",
    "Practicing mindfulness and staying present. Mental health matters and God cares about our wholeness. 🧘‍♀️",
    "Reminder: You are loved, you are worthy, and you are never alone. God is with you always. ❤️",
    "Celebrating small victories today! Every step forward in emotional healing counts. 🌟"
];

const userNames = ['Alex Johnson', 'Emma Davis', 'Michael Chen', 'Sarah Williams', 'David Martinez', 'Lisa Anderson', 'James Taylor', 'Maria Garcia', 'John Smith', 'Rachel Brown'];

const allUsers = [
    { name: 'Alex Johnson', bio: 'Believer seeking emotional growth', posts: 45 },
    { name: 'Emma Davis', bio: 'Faith and wellness advocate', posts: 32 },
    { name: 'Michael Chen', bio: 'Walking by faith, not by sight', posts: 28 },
    { name: 'Sarah Williams', bio: 'Grateful heart, positive mind', posts: 51 },
    { name: 'David Martinez', bio: 'Living intentionally with purpose', posts: 19 },
    { name: 'Lisa Anderson', bio: 'Prayer warrior and encourager', posts: 67 },
    { name: 'James Taylor', bio: 'Finding peace in God\'s presence', posts: 23 },
    { name: 'Maria Garcia', bio: 'Spreading love and light', posts: 38 },
    { name: 'John Smith', bio: 'Journey of faith and healing', posts: 41 },
    { name: 'Rachel Brown', bio: 'Believer in emotional wellbeing', posts: 29 }
];

function searchUsers() {
    const searchInput = document.getElementById('userSearch');
    const searchResults = document.getElementById('searchResults');
    const query = searchInput.value.trim().toLowerCase();
    
    if (query.length === 0) {
        searchResults.classList.remove('active');
        return;
    }
    
    const filteredUsers = allUsers.filter(user => 
        user.name.toLowerCase().includes(query) ||
        user.bio.toLowerCase().includes(query)
    );
    
    if (filteredUsers.length === 0) {
        searchResults.innerHTML = '<div class="search-no-results">No users found</div>';
        searchResults.classList.add('active');
        return;
    }
    
    searchResults.innerHTML = filteredUsers.map(user => {
        const initials = user.name.split(' ').map(n => n[0]).join('');
        return `
            <div class="search-result-item" onclick="viewUserProfile('${user.name}')">
                <div class="search-result-avatar">${initials}</div>
                <div class="search-result-info">
                    <h4 class="search-result-name">${user.name}</h4>
                    <p class="search-result-meta">${user.bio} · ${user.posts} posts</p>
                </div>
            </div>
        `;
    }).join('');
    
    searchResults.classList.add('active');
}

function viewUserProfile(userName) {
    document.getElementById('searchResults').classList.remove('active');
    document.getElementById('userSearch').value = '';
    
    alert(`Viewing profile of ${userName}\n\nThis feature will show their full profile with posts and bio.`);
}

document.addEventListener('click', function(event) {
    const searchContainer = document.querySelector('.search-container');
    const searchResults = document.getElementById('searchResults');
    
    if (searchContainer && !searchContainer.contains(event.target)) {
        searchResults.classList.remove('active');
    }
});

function generateRandomPost() {
    const randomUser = userNames[Math.floor(Math.random() * userNames.length)];
    const randomContent = samplePostTemplates[Math.floor(Math.random() * samplePostTemplates.length)];
    const randomTime = ['Just now', '5 minutes ago', '15 minutes ago', '1 hour ago', '2 hours ago', '5 hours ago'][Math.floor(Math.random() * 6)];
    
    return {
        id: Date.now() + Math.random(),
        user: randomUser,
        time: randomTime,
        content: randomContent,
        likes: Math.floor(Math.random() * 500),
        comments: Math.floor(Math.random() * 50),
        likedBy: [],
        timestamp: new Date().toISOString()
    };
}

function loadSampleData() {
    if (allPosts.length === 0) {
        for (let i = 0; i < 5; i++) {
            allPosts.push(generateRandomPost());
        }
        localStorage.setItem('allPosts', JSON.stringify(allPosts));
    }
}

function loadMorePosts() {
    for (let i = 0; i < 3; i++) {
        allPosts.push(generateRandomPost());
    }
    localStorage.setItem('allPosts', JSON.stringify(allPosts));
    switchTab('posts');
}

let isLoadingMore = false;
window.addEventListener('scroll', () => {
    if (isLoadingMore) return;
    
    const scrollPosition = window.innerHeight + window.scrollY;
    const pageHeight = document.documentElement.scrollHeight;
    
    if (scrollPosition >= pageHeight - 200) {
        isLoadingMore = true;
        setTimeout(() => {
            loadMorePosts();
            isLoadingMore = false;
        }, 500);
    }
});

function init() {
    const savedUser = localStorage.getItem('currentUser');
    const userName = localStorage.getItem('userName');
    
    if (savedUser) {
        currentUser = savedUser;
    } else if (userName) {
        currentUser = userName;
        localStorage.setItem('currentUser', userName);
    }
    
    loadSampleData();
    loadUserLikesAndSaves();
    updateProfileDisplay();
    
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach((tab, index) => {
        tab.onclick = () => switchTab(['posts', 'liked', 'saved'][index]);
    });
    
    switchTab('posts');
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        window.location.href = '../index.html';
    }
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function openEditProfile() {
    const bio = localStorage.getItem('userBio') || '';
    const interests = JSON.parse(localStorage.getItem('userInterests')) || [];
    
    document.getElementById('editName').value = currentUser;
    document.getElementById('editBio').value = bio;
    document.getElementById('editInterests').value = interests.join(', ');
    
    openModal('editProfileModal');
}

function saveProfile() {
    const name = document.getElementById('editName').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    const interestsInput = document.getElementById('editInterests').value.trim();
    
    if (!name) {
        alert('Name cannot be empty!');
        return;
    }
    
    const interests = interestsInput ? interestsInput.split(',').map(i => i.trim()).filter(i => i) : [];
    
    currentUser = name;
    localStorage.setItem('currentUser', name);
    localStorage.setItem('userName', name);
    updateProfileDisplay();
    
    localStorage.setItem('userBio', bio);
    localStorage.setItem('userInterests', JSON.stringify(interests));
    
    closeModal('editProfileModal');
    alert('Profile updated successfully!');
}

function openNotifications(event) {
    event.preventDefault();
    loadNotifications();
    openModal('notificationsModal');
}

function loadNotifications() {
    const notifications = JSON.parse(localStorage.getItem(`notifications_${currentUser}`)) || [];
    const container = document.getElementById('notificationsList');
    
    if (notifications.length === 0) {
        container.innerHTML = '<p style="text-align: center; opacity: 0.7;">No notifications yet</p>';
        return;
    }
    
    container.innerHTML = notifications.map(notif => `
        <div class="notification-item">
            <h4>${notif.title}</h4>
            <p>${notif.message}</p>
            <span class="notification-time">${notif.time}</span>
        </div>
    `).join('');
    
    document.getElementById('notifBadge').textContent = '0';
    document.getElementById('notifBadge').style.display = 'none';
}

function addNotification(title, message) {
    const notifications = JSON.parse(localStorage.getItem(`notifications_${currentUser}`)) || [];
    notifications.unshift({
        title,
        message,
        time: new Date().toLocaleString(),
        id: Date.now()
    });
    
    if (notifications.length > 50) {
        notifications.pop();
    }
    
    localStorage.setItem(`notifications_${currentUser}`, JSON.stringify(notifications));
    updateNotificationBadge();
}

function updateNotificationBadge() {
    const notifications = JSON.parse(localStorage.getItem(`notifications_${currentUser}`)) || [];
    const badge = document.getElementById('notifBadge');
    if (badge) {
        const count = notifications.length;
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }
}

function clearNotifications() {
    if (confirm('Clear all notifications?')) {
        localStorage.setItem(`notifications_${currentUser}`, JSON.stringify([]));
        loadNotifications();
        updateNotificationBadge();
    }
}

function openAppearance(event) {
    event.preventDefault();
    loadAppearanceSettings();
    openModal('appearanceModal');
}

function loadAppearanceSettings() {
    const theme = localStorage.getItem('theme') || 'purple';
    const fontSize = localStorage.getItem('fontSize') || 'medium';
    const animations = localStorage.getItem('animations') !== 'false';
    
    document.getElementById('themeSelect').value = theme;
    document.getElementById('fontSelect').value = fontSize;
    document.getElementById('animToggle').checked = animations;
}

function changeTheme() {
    const theme = document.getElementById('themeSelect').value;
    localStorage.setItem('theme', theme);
    
    document.body.classList.remove('theme-blue', 'theme-pink', 'theme-dark');
    if (theme !== 'purple') {
        document.body.classList.add(`theme-${theme}`);
    }
}

function changeFontSize() {
    const size = document.getElementById('fontSelect').value;
    localStorage.setItem('fontSize', size);
    
    document.body.classList.remove('font-small', 'font-large');
    if (size !== 'medium') {
        document.body.classList.add(`font-${size}`);
    }
}

function toggleAnimations() {
    const enabled = document.getElementById('animToggle').checked;
    localStorage.setItem('animations', enabled);
    
    if (!enabled) {
        document.body.classList.add('no-animations');
    } else {
        document.body.classList.remove('no-animations');
    }
}

function openPrivacy(event) {
    event.preventDefault();
    loadPrivacySettings();
    openModal('privacyModal');
}

function loadPrivacySettings() {
    const profileVis = localStorage.getItem('profileVisibility') !== 'false';
    const online = localStorage.getItem('onlineStatus') !== 'false';
    const activity = localStorage.getItem('activityVisibility') !== 'false';
    
    document.getElementById('profileVisToggle').checked = profileVis;
    document.getElementById('onlineToggle').checked = online;
    document.getElementById('activityToggle').checked = activity;
}

function savePrivacy() {
    const profileVis = document.getElementById('profileVisToggle').checked;
    const online = document.getElementById('onlineToggle').checked;
    const activity = document.getElementById('activityToggle').checked;
    
    localStorage.setItem('profileVisibility', profileVis);
    localStorage.setItem('onlineStatus', online);
    localStorage.setItem('activityVisibility', activity);
}

function applyAppearanceSettings() {
    const theme = localStorage.getItem('theme') || 'purple';
    const fontSize = localStorage.getItem('fontSize') || 'medium';
    const animations = localStorage.getItem('animations') !== 'false';
    
    if (theme !== 'purple') {
        document.body.classList.add(`theme-${theme}`);
    }
    if (fontSize !== 'medium') {
        document.body.classList.add(`font-${fontSize}`);
    }
    if (!animations) {
        document.body.classList.add('no-animations');
    }
}

window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

function openSettings(event) {
    event.preventDefault();
    loadAllSettings();
    openModal('settingsModal');
}

function loadAllSettings() {
    const email = localStorage.getItem('userEmail') || 'Not set';
    document.getElementById('settingsEmail').textContent = email;
    
    const theme = localStorage.getItem('theme') || 'purple';
    const fontSize = localStorage.getItem('fontSize') || 'medium';
    const animations = localStorage.getItem('animations') !== 'false';
    
    document.getElementById('themeSelectMain').value = theme;
    document.getElementById('fontSelectMain').value = fontSize;
    document.getElementById('animToggleMain').checked = animations;
    
    document.getElementById('pushNotifToggle').checked = localStorage.getItem('pushNotif') !== 'false';
    document.getElementById('emailNotifToggle').checked = localStorage.getItem('emailNotif') !== 'false';
    document.getElementById('communityNotifToggle').checked = localStorage.getItem('communityNotif') !== 'false';
    document.getElementById('replyNotifToggle').checked = localStorage.getItem('replyNotif') !== 'false';
    
    document.getElementById('twoFactorToggle').checked = localStorage.getItem('twoFactor') === 'true';
    document.getElementById('loginAlertsToggle').checked = localStorage.getItem('loginAlerts') !== 'false';
    
    document.getElementById('autoplayToggle').checked = localStorage.getItem('autoplay') !== 'false';
    document.getElementById('timestampsToggle').checked = localStorage.getItem('timestamps') !== 'false';
    document.getElementById('reduceMotionToggle').checked = localStorage.getItem('reduceMotion') === 'true';
    document.getElementById('languageSelect').value = localStorage.getItem('language') || 'en';
}

function saveAllSettings() {
    localStorage.setItem('pushNotif', document.getElementById('pushNotifToggle').checked);
    localStorage.setItem('emailNotif', document.getElementById('emailNotifToggle').checked);
    localStorage.setItem('communityNotif', document.getElementById('communityNotifToggle').checked);
    localStorage.setItem('replyNotif', document.getElementById('replyNotifToggle').checked);
    
    localStorage.setItem('twoFactor', document.getElementById('twoFactorToggle').checked);
    localStorage.setItem('loginAlerts', document.getElementById('loginAlertsToggle').checked);
    
    localStorage.setItem('autoplay', document.getElementById('autoplayToggle').checked);
    localStorage.setItem('timestamps', document.getElementById('timestampsToggle').checked);
    localStorage.setItem('reduceMotion', document.getElementById('reduceMotionToggle').checked);
    localStorage.setItem('language', document.getElementById('languageSelect').value);
}

function changeThemeFromSettings() {
    const theme = document.getElementById('themeSelectMain').value;
    localStorage.setItem('theme', theme);
    
    document.body.classList.remove('theme-blue', 'theme-pink', 'theme-dark');
    if (theme !== 'purple') {
        document.body.classList.add(`theme-${theme}`);
    }
}

function changeFontSizeFromSettings() {
    const size = document.getElementById('fontSelectMain').value;
    localStorage.setItem('fontSize', size);
    
    document.body.classList.remove('font-small', 'font-large');
    if (size !== 'medium') {
        document.body.classList.add(`font-${size}`);
    }
}

function toggleAnimationsFromSettings() {
    const enabled = document.getElementById('animToggleMain').checked;
    localStorage.setItem('animations', enabled);
    
    if (!enabled) {
        document.body.classList.add('no-animations');
    } else {
        document.body.classList.remove('no-animations');
    }
}

function openChangePassword() {
    closeModal('settingsModal');
    const newPassword = prompt('Enter your new password (minimum 8 characters):');
    if (newPassword && newPassword.length >= 8) {
        localStorage.setItem('userPassword', newPassword);
        alert('Password changed successfully!');
    } else if (newPassword) {
        alert('Password must be at least 8 characters long.');
    }
}

function openChangeEmail() {
    closeModal('settingsModal');
    const newEmail = prompt('Enter your new email address:');
    if (newEmail && newEmail.includes('@')) {
        localStorage.setItem('userEmail', newEmail);
        alert('Email updated successfully!');
        openSettings({preventDefault: () => {}});
    } else if (newEmail) {
        alert('Please enter a valid email address.');
    }
}

function downloadData() {
    const userData = {
        user: currentUser,
        email: localStorage.getItem('userEmail'),
        bio: localStorage.getItem('userBio'),
        interests: JSON.parse(localStorage.getItem('userInterests') || '[]'),
        posts: allPosts.filter(post => post.user === currentUser),
        likedPosts: JSON.parse(localStorage.getItem(`likedPosts_${currentUser}`) || '[]'),
        savedPosts: JSON.parse(localStorage.getItem(`savedPosts_${currentUser}`) || '[]'),
        connections: localStorage.getItem(`connections_${currentUser}`) || 0
    };
    
    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `heartnest-data-${currentUser}-${Date.now()}.json`;
    link.click();
    
    alert('Your data has been downloaded!');
}

function clearCache() {
    if (confirm('Are you sure you want to clear cache? This will not delete your posts or account data.')) {
        const essentialData = {
            currentUser: localStorage.getItem('currentUser'),
            userName: localStorage.getItem('userName'),
            userEmail: localStorage.getItem('userEmail'),
            allPosts: localStorage.getItem('allPosts')
        };
        
        localStorage.clear();
        
        Object.keys(essentialData).forEach(key => {
            if (essentialData[key]) {
                localStorage.setItem(key, essentialData[key]);
            }
        });
        
        alert('Cache cleared successfully!');
        location.reload();
    }
}

function openFeedback() {
    closeModal('settingsModal');
    const feedback = prompt('Share your feedback with us:');
    if (feedback) {
        console.log('Feedback submitted:', feedback);
        alert('Thank you for your feedback!');
    }
}

function openReport() {
    closeModal('settingsModal');
    const report = prompt('Please describe the problem you\'re experiencing:');
    if (report) {
        console.log('Problem reported:', report);
        alert('Your report has been submitted. We\'ll look into it!');
    }
}

function deleteAccount() {
    const confirmation = prompt('Are you sure you want to delete your account? Type "DELETE" to confirm:');
    if (confirmation === 'DELETE') {
        localStorage.clear();
        alert('Your account has been deleted. We\'re sorry to see you go.');
        window.location.href = '../index.html';
    } else if (confirmation) {
        alert('Account deletion cancelled. Please type "DELETE" to confirm.');
    }
}

window.onload = function() {
    init();
    applyAppearanceSettings();
    updateNotificationBadge();
};
