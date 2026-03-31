const API = window.APP_CONFIG?.API_BASE_URL || 'https://heart-nest.onrender.com';

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
    };
}

const currentUserId = localStorage.getItem('userId');
let viewedUserId = null;
let ownProfileView = false;

async function loadProfile() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../SignIn/signin.html';
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const queryUserId = params.get('userId');
    const isOwnProfile = !queryUserId || queryUserId === currentUserId;
    ownProfileView = isOwnProfile;
    viewedUserId = isOwnProfile ? currentUserId : queryUserId;

    const editBtn = document.querySelector('.btn-edit[onclick="toggleEdit()"]');
    const followBtn = document.getElementById('followBtn');

    try {
        let data;
        if (isOwnProfile) {
            const res = await fetch(`${API}/api/users/me`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to load profile');
            data = await res.json();

            if (editBtn) editBtn.style.display = 'inline-block';
            if (followBtn) followBtn.style.display = 'none';

            document.getElementById('profileEmail').textContent = data.email || '';
            if (data.email) localStorage.setItem('userEmail', data.email);
        } else {
            const res = await fetch(`${API}/api/users/${queryUserId}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to load profile');
            data = await res.json();

            if (editBtn) editBtn.style.display = 'none';
            if (followBtn) {
                followBtn.style.display = 'inline-block';
                followBtn.textContent = data.isFollowing ? 'Unfollow' : 'Follow';
            }

            document.getElementById('profileEmail').textContent = '';
        }

        document.getElementById('profileName').textContent = data.username || '';
    if (isOwnProfile && data.username) localStorage.setItem('username', data.username);
        document.getElementById('bioInput').value = data.bio || '';

        const picEl = document.getElementById('profilePicImg');
        if (picEl && data.profilePic) picEl.src = data.profilePic;

        const picInput = document.getElementById('profilePicInput');
        if (picInput && isOwnProfile) {
            picInput.disabled = false;
            const picLabel = document.getElementById('profilePicLabel');
            if (picLabel) {
                picLabel.style.cursor = 'pointer';
                picLabel.title = 'Click to change your profile picture';
            }
            const cameraIcon = document.getElementById('profilePicCameraIcon');
            if (cameraIcon) cameraIcon.style.display = 'flex';
        }

        document.getElementById('postCount').textContent = data.postsCount || 0;
        document.getElementById('followerCount').textContent = data.followersCount || 0;
        document.getElementById('followingCount').textContent = data.followingCount || 0;
    } catch (err) {
        console.error(err);
    }

    loadInterests(isOwnProfile);
    loadSettings();
}

function loadInterests(isOwnProfile) {
    const interests = JSON.parse(localStorage.getItem('userInterests')) || [];
    const container = document.getElementById('interestsList');
    if (!container) return;

    if (!isOwnProfile) {
        container.innerHTML = '<span style="opacity:0.6">Interests are available on owner profile only.</span>';
        return;
    }

    container.innerHTML = interests.length
        ? interests.map(i => `<span class="interest-tag">${i}</span>`).join('')
        : '<span style="opacity:0.6">No interests added yet</span>';
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

async function uploadAvatarImmediate(input, previewId) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        const el = document.getElementById(previewId);
        if (el) el.src = e.target.result;
    };
    reader.readAsDataURL(file);

    try {
        const formData = new FormData();
        formData.append('avatar', file);
        const res = await fetch(`${API}/api/users/me/avatar`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') },
            body: formData
        });
        
        if (res.ok) {
            const data = await res.json();
            // Update profile pic URL everywhere on the page
            const profilePic = data.profilePic;
            document.querySelectorAll('[id="dashProfilePic"], [id="profilePicImg"]').forEach(el => {
                if (el) el.src = profilePic;
            });
            // Store in localStorage for persistence
            localStorage.setItem('userProfilePic', profilePic);
            alert('✓ Profile picture updated successfully!');
        } else {
            const error = await res.json();
            alert('Upload failed: ' + (error.message || 'Please try again.'));
        }
    } catch (err) {
        console.error(err);
        alert('Upload failed: Network error. Please check your connection.');
    }
}

async function toggleEdit() {
    if (!ownProfileView) return;

    const bioInput = document.getElementById('bioInput');
    const nameEl = document.getElementById('profileName');
    const btn = document.querySelector('.btn-edit[onclick="toggleEdit()"]');

    if (bioInput.readOnly) {
        bioInput.readOnly = false;
        if (nameEl) {
            nameEl.contentEditable = 'true';
            nameEl.focus();
        }
        bioInput.focus();
        if (btn) {
            btn.textContent = 'Save Profile';
            btn.style.background = 'rgba(100, 200, 100, 0.3)';
        }
    } else {
        const username = (nameEl ? nameEl.textContent : '').trim();
        const bio = bioInput.value.trim();

        if (!username) {
            alert('Username cannot be empty');
            return;
        }

        try {
            const res = await fetch(`${API}/api/users/me`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ username, bio })
            });
            if (!res.ok) {
                const d = await res.json();
                alert('Failed to save profile: ' + d.message);
            } else {
                const updated = await res.json();
                if (updated.username) {
                    localStorage.setItem('username', updated.username);
                    if (nameEl) nameEl.textContent = updated.username;
                }
                if (updated.email) localStorage.setItem('userEmail', updated.email);
                alert('Profile saved!');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to save profile: ' + err.message);
        }

        bioInput.readOnly = true;
        if (nameEl) nameEl.contentEditable = 'false';
        if (btn) {
            btn.textContent = 'Edit Profile';
            btn.style.background = 'rgba(255, 255, 255, 0.25)';
        }
    }
}

async function handleFollow() {
    const btn = document.getElementById('followBtn');
    if (!viewedUserId) return;
    try {
        const res = await fetch(`${API}/api/users/${viewedUserId}/follow`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        if (!res.ok) return;
        const data = await res.json();
        btn.textContent = data.following ? 'Unfollow' : 'Follow';

        const followerEl = document.getElementById('followerCount');
        if (followerEl) {
            const current = parseInt(followerEl.textContent) || 0;
            followerEl.textContent = data.following ? current + 1 : Math.max(0, current - 1);
        }
    } catch (err) {
        console.error(err);
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        window.location.href = '../index.html';
    }
}

window.onload = loadProfile;
