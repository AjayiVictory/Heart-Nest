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

// Debug info - show what's happening
window.DEBUG_INFO = {
    apiUrl: API,
    userId: currentUserId,
    timestamp: new Date().toLocaleTimeString()
};
console.log('🔧 Profile Debug:', window.DEBUG_INFO);

// Listen for profile picture updates from other tabs/pages via BroadcastChannel
if (window.BroadcastChannel) {
    const channel = new BroadcastChannel('profile-pic-update');
    channel.onmessage = (event) => {
        if (event.data.profilePic) {
            localStorage.setItem('userProfilePic', event.data.profilePic);
            const picEl = document.getElementById('profilePicImg');
            if (picEl) picEl.src = event.data.profilePic;
            console.log('✓ Profile picture synced from other page');
        }
    };
}

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
            const res = await fetch(`${API}/api/users/me?t=${Date.now()}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to load profile');
            data = await res.json();

            if (editBtn) editBtn.style.display = 'inline-block';
            if (followBtn) followBtn.style.display = 'none';

            document.getElementById('profileEmail').textContent = data.bio || '';
            if (data.email) localStorage.setItem('userEmail', data.email);
        } else {
            const res = await fetch(`${API}/api/users/${queryUserId}?t=${Date.now()}`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to load profile');
            data = await res.json();

            if (editBtn) editBtn.style.display = 'none';
            if (followBtn) {
                followBtn.style.display = 'inline-block';
                followBtn.textContent = data.isFollowing ? 'Unfollow' : 'Follow';
            }

            document.getElementById('profileEmail').textContent = data.bio || '';
        }

        document.getElementById('profileName').textContent = data.username || '';
        if (isOwnProfile && data.username) localStorage.setItem('username', data.username);
        
        // Load bio for both own and other profiles
        const bioInputEl = document.getElementById('bioInput');
        if (bioInputEl) {
            // Load the actual bio from backend (empty string by default for new users)
            bioInputEl.value = data.bio || '';
            console.log('✓ Bio loaded:', data.bio || '(empty)');
        } else {
            console.error('❌ bioInput element not found!');
        }

        const picEl = document.getElementById('profilePicImg');
        if (picEl) {
            if (data.profilePic) {
                picEl.src = data.profilePic;
                // Always update localStorage with the latest profile pic from server
                localStorage.setItem('userProfilePic', data.profilePic);
                localStorage.setItem('lastProfilePicUpdate', new Date().toISOString());
            } else {
                // Use localStorage fallback if server doesn't have one
                const storedPic = localStorage.getItem('userProfilePic');
                if (storedPic) {
                    picEl.src = storedPic;
                }
            }
        }

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
    loadSettings(isOwnProfile);
    
    // Final verification
    console.log('=== Page Load Complete ===');
    console.log('isOwnProfile:', isOwnProfile);
    const bioInput = document.getElementById('bioInput');
    console.log('bioInput value:', bioInput ? bioInput.value : 'NOT FOUND');
    console.log('bioInput placeholder:', bioInput ? bioInput.placeholder : 'NOT FOUND');
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

function loadSettings(isOwnProfile) {
    // Only show settings for own profile
    const settingsCard = document.querySelector('.detail-card:has(h3:contains("Account Settings"))');
    const settingsContainer = document.getElementById('settingsContainer');
    
    if (!isOwnProfile) {
        console.log('Settings hidden (viewing other profile)');
        // Hide settings card for other users
        if (settingsContainer) {
            settingsContainer.style.display = 'none';
        }
        return;
    }
    
    // Show settings for own profile
    if (settingsContainer) {
        settingsContainer.style.display = 'block';
    }
    
    try {
        // Load from localStorage as default
        const emailNotif = localStorage.getItem('emailNotif') !== 'false';
        const profileVis = localStorage.getItem('profileVis') !== 'false';
        const communityUpdates = localStorage.getItem('communityUpdates') !== 'false';

        const emailNotifCbx = document.getElementById('emailNotif');
        const profileVisCbx = document.getElementById('profileVis');
        const matchAlertsCbx = document.getElementById('matchAlerts');

        if (!emailNotifCbx || !profileVisCbx || !matchAlertsCbx) {
            console.warn('Settings checkboxes not found in HTML');
            return;
        }

        emailNotifCbx.checked = emailNotif;
        profileVisCbx.checked = profileVis;
        matchAlertsCbx.checked = communityUpdates;

        console.log('✓ Settings loaded:', { emailNotif, profileVis, communityUpdates });

        // Setup change handlers
        emailNotifCbx.onchange = () => saveSettings();
        profileVisCbx.onchange = () => saveSettings();
        matchAlertsCbx.onchange = () => saveSettings();

        console.log('✓ Settings change handlers attached');
    } catch (err) {
        console.error('Error loading settings:', err);
    }
}

function saveSettings() {
    try {
        const settings = {
            emailNotif: document.getElementById('emailNotif').checked,
            profileVis: document.getElementById('profileVis').checked,
            communityUpdates: document.getElementById('matchAlerts').checked
        };
        
        localStorage.setItem('emailNotif', settings.emailNotif);
        localStorage.setItem('profileVis', settings.profileVis);
        localStorage.setItem('communityUpdates', settings.communityUpdates);

        console.log('✓ Settings saved to localStorage:', settings);

        // Also persist to backend
        fetch(`${API}/api/users/me/settings`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(settings)
        })
        .then(res => res.json())
        .then(data => console.log('✓ Settings synced to backend:', data))
        .catch(err => console.warn('Settings sync to backend failed (using localStorage):', err));
    } catch (err) {
        console.error('Error saving settings:', err);
    }
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
            // Store in localStorage for persistence across reloads and all pages
            localStorage.setItem('userProfilePic', profilePic);
            localStorage.setItem('lastProfilePicUpdate', new Date().toISOString());
            // Broadcast update to all open tabs/windows
            if (window.BroadcastChannel) {
                const channel = new BroadcastChannel('profile-pic-update');
                channel.postMessage({ profilePic: profilePic });
            }
            // Show success message without alert
            console.log('✓ Profile picture updated successfully!');
        } else {
            const error = await res.json();
            console.error('Upload error:', error);
            alert('Upload failed: ' + (error.message || 'Please try again.'));
        }
    } catch (err) {
        console.error('Upload error:', err);
        alert('Upload failed: Network error. Please check your connection.');
    } finally {
        // Reset input so same file can be selected again
        input.value = '';
    }
}

async function toggleEdit() {
    if (!ownProfileView) return;

    const bioInput = document.getElementById('bioInput');
    const nameEl = document.getElementById('profileName');
    const btn = document.querySelector('.btn-edit[onclick="toggleEdit()"]');

    if (bioInput.readOnly) {
        bioInput.readOnly = false;
        bioInput.style.cursor = 'text';
        if (nameEl) {
            nameEl.contentEditable = 'true';
            nameEl.focus();
        }
        bioInput.focus();
        if (btn) {
            btn.textContent = 'Save Profile';
            btn.style.background = 'var(--primary-color)';
            btn.style.border = '1px solid var(--primary-color)';
            btn.style.color = 'var(--surface)';
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
        bioInput.style.cursor = 'default';
        if (nameEl) nameEl.contentEditable = 'false';
        if (btn) {
            btn.textContent = 'Edit Profile';
            btn.style.background = 'var(--primary-color)';
            btn.style.border = '1px solid var(--primary-color)';
            btn.style.color = 'var(--surface)';
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
