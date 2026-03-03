const API = 'https://heart-nest.onrender.com';

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
    };
}

const currentUserId = localStorage.getItem('userId');
let viewedUserId = null;

async function loadProfile() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../SignIn/signin.html';
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const queryUserId = params.get('userId');
    const isOwnProfile = !queryUserId || queryUserId === currentUserId;
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
        document.getElementById('bioInput').value = data.bio || '';

        const picEl = document.getElementById('profilePicImg');
        if (picEl && data.profilePic) picEl.src = data.profilePic;

        const picInput = document.getElementById('profilePicInput');
        if (picInput && isOwnProfile) picInput.value = data.profilePic || '';

        document.getElementById('postCount').textContent = data.postsCount || 0;
        document.getElementById('followerCount').textContent = data.followersCount || 0;
        document.getElementById('followingCount').textContent = data.followingCount || 0;
    } catch (err) {
        console.error(err);
    }

    loadInterests();
    loadSettings();
}

function loadInterests() {
    const interests = JSON.parse(localStorage.getItem('userInterests')) || [];
    const container = document.getElementById('interestsList');
    if (!container) return;
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

function previewAvatar(input, previewId) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const el = document.getElementById(previewId);
        if (el) el.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function toggleEdit() {
    const bioInput = document.getElementById('bioInput');
    const picInput = document.getElementById('profilePicInput');
    const btn = document.querySelector('.btn-edit[onclick="toggleEdit()"]');

    if (bioInput.readOnly) {
        bioInput.readOnly = false;
        bioInput.focus();
        if (picInput) {
            picInput.disabled = false;
            picInput.style.display = 'block';
        }
        if (btn) {
            btn.textContent = 'Save Profile';
            btn.style.background = 'rgba(100, 200, 100, 0.3)';
        }
    } else {
        const bio = bioInput.value.trim();

        // Upload avatar if a file was selected
        if (picInput && picInput.files[0]) {
            try {
                const formData = new FormData();
                formData.append('avatar', picInput.files[0]);
                const token = localStorage.getItem('token');
                const uploadRes = await fetch(`${API}/api/users/me/avatar`, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token },
                    body: formData
                });
                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    const picEl = document.getElementById('profilePicImg');
                    if (picEl) picEl.src = uploadData.profilePic;
                } else {
                    alert('Profile picture upload failed. Saving other changes.');
                }
            } catch (err) {
                console.error(err);
                alert('Profile picture upload failed. Saving other changes.');
            }
        }

        try {
            const res = await fetch(`${API}/api/users/me`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ bio })
            });
            if (!res.ok) {
                const d = await res.json();
                alert('Failed to save profile: ' + d.message);
            } else {
                alert('Profile saved!');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to save profile: ' + err.message);
        }

        bioInput.readOnly = true;
        if (picInput) {
            picInput.disabled = true;
            picInput.style.display = 'none';
        }
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
