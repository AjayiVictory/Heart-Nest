function loadProfile() {
    const currentUser = localStorage.getItem('currentUser') || 'Guest User';
    const userEmail = localStorage.getItem('userEmail') || 'user@example.com';
    const userBio = localStorage.getItem('userBio') || '';
    const allPosts = JSON.parse(localStorage.getItem('allPosts')) || [];
    
    document.getElementById('profileName').textContent = currentUser;
    document.getElementById('profileEmail').textContent = userEmail;
    document.getElementById('bioInput').value = userBio;
    
    const userPosts = allPosts.filter(post => post.user === currentUser);
    const userLikes = allPosts.reduce((count, post) => {
        return count + (post.likedBy && post.likedBy.includes(currentUser) ? 1 : 0);
    }, 0);
    
    const connectionCount = parseInt(localStorage.getItem(`connections_${currentUser}`)) || 0;
    
    document.getElementById('postCount').textContent = userPosts.length;
    document.getElementById('likeCount').textContent = userLikes;
    document.getElementById('connectionCount').textContent = connectionCount;
    
    loadInterests();
    loadSettings();
}

function loadInterests() {
    const interests = JSON.parse(localStorage.getItem('userInterests')) || ['Travel', 'Coffee', 'Books', 'Music'];
    const container = document.getElementById('interestsList');
    
    container.innerHTML = interests.map(interest => 
        `<span class="interest-tag">${interest}</span>`
    ).join('');
}

function loadSettings() {
    const emailNotif = localStorage.getItem('emailNotif') !== 'false';
    const profileVis = localStorage.getItem('profileVis') !== 'false';
    const communityUpdates = localStorage.getItem('communityUpdates') !== 'false';
    
    document.getElementById('emailNotif').checked = emailNotif;
    document.getElementById('profileVis').checked = profileVis;
    document.getElementById('matchAlerts').checked = communityUpdates;
    
    document.getElementById('emailNotif').onchange = () => saveSettings();
    document.getElementById('profileVis').onchange = () => saveSettings();
    document.getElementById('matchAlerts').onchange = () => saveSettings();
}

function saveSettings() {
    localStorage.setItem('emailNotif', document.getElementById('emailNotif').checked);
    localStorage.setItem('profileVis', document.getElementById('profileVis').checked);
    localStorage.setItem('communityUpdates', document.getElementById('matchAlerts').checked);
}

function toggleEdit() {
    const bioInput = document.getElementById('bioInput');
    const btn = event.target;
    
    if (bioInput.readOnly) {
        bioInput.readOnly = false;
        bioInput.focus();
        btn.textContent = 'Save Profile';
        btn.style.background = 'rgba(100, 200, 100, 0.3)';
    } else {
        bioInput.readOnly = true;
        localStorage.setItem('userBio', bioInput.value);
        btn.textContent = 'Edit Profile';
        btn.style.background = 'rgba(255, 255, 255, 0.25)';
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        window.location.href = '../index.html';
    }
}

window.onload = loadProfile;
