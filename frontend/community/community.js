const API = 'https://heart-nest.onrender.com';

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
    };
}

const currentUserId = localStorage.getItem('userId');

function formatTime(isoString) {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

async function loadCommunityFeed() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../SignIn/signin.html';
        return;
    }

    const feed = document.getElementById('communityFeed');
    feed.innerHTML = '<p style="text-align: center; opacity: 0.7; padding: 20px;">Loading...</p>';

    try {
        const res = await fetch(`${API}/api/posts`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to load feed');
        const posts = await res.json();

        if (posts.length === 0) {
            feed.innerHTML = '<p style="text-align: center; opacity: 0.7; padding: 20px;">No posts in the community yet</p>';
            return;
        }

        feed.innerHTML = posts.map(buildPostCard).join('');
    } catch (err) {
        console.error(err);
        feed.innerHTML = '<p style="text-align: center; opacity: 0.7; padding: 20px;">Failed to load posts</p>';
    }
}

function buildPostCard(post) {
    const avatar = post.author.profilePic
        ? `<img src="${post.author.profilePic}" alt="${post.author.username}" class="post-avatar">`
        : `<img src="https://via.placeholder.com/50" alt="${post.author.username}" class="post-avatar">`;

    const commentsHtml = (post.comments || []).map(c => {
        const isOwnComment = c.author._id === currentUserId;
        return `<div class="comment-item" id="comm-comment-${c._id}">
            <strong>${c.author.username}:</strong> ${c.content}
            ${isOwnComment ? `<button onclick="deleteComment('${post._id}','${c._id}')">✕</button>` : ''}
        </div>`;
    }).join('');

    return `
        <div class="post-card" id="comm-post-${post._id}">
            <div class="post-header">
                ${avatar}
                <div class="post-user-info">
                    <h4>${post.author.username}</h4>
                    <span class="post-time">${formatTime(post.createdAt)}</span>
                </div>
            </div>
            <p class="post-content">${post.content}</p>
            <div class="post-actions">
                <button class="post-action-btn" onclick="likePost('${post._id}', this)">
                    <span>👍</span>
                    <span id="comm-likeCount-${post._id}">${post.likes.length}</span>
                </button>
                <button class="post-action-btn" onclick="toggleComments('${post._id}')">
                    <span>💬</span>
                    <span>${post.comments.length}</span>
                </button>
            </div>
            <div class="comments-section" id="comm-comments-${post._id}" style="display:none">
                <div class="comments-list">${commentsHtml}</div>
                <div class="comment-input">
                    <input type="text" id="comm-commentInput-${post._id}" placeholder="Write a comment...">
                    <button onclick="addComment('${post._id}')">Send</button>
                </div>
            </div>
        </div>
    `;
}

async function likePost(postId, btn) {
    try {
        const res = await fetch(`${API}/api/posts/${postId}/like`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        if (!res.ok) return;
        const data = await res.json();
        const countEl = document.getElementById(`comm-likeCount-${postId}`);
        if (countEl) countEl.textContent = data.likeCount;
        if (btn) btn.classList.toggle('liked', data.liked);
    } catch (err) {
        console.error(err);
    }
}

function toggleComments(postId) {
    const section = document.getElementById(`comm-comments-${postId}`);
    if (section) {
        section.style.display = section.style.display === 'none' ? 'block' : 'none';
    }
}

async function addComment(postId) {
    const input = document.getElementById(`comm-commentInput-${postId}`);
    const content = input.value.trim();
    if (!content) return;
    try {
        const res = await fetch(`${API}/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ content })
        });
        if (!res.ok) return;
        const comment = await res.json();
        const list = document.querySelector(`#comm-comments-${postId} .comments-list`);
        if (list) {
            const isOwnComment = comment.author._id === currentUserId;
            const div = document.createElement('div');
            div.className = 'comment-item';
            div.id = `comm-comment-${comment._id}`;
            div.innerHTML = `<strong>${comment.author.username}:</strong> ${comment.content}
                ${isOwnComment ? `<button onclick="deleteComment('${postId}','${comment._id}')">✕</button>` : ''}`;
            list.appendChild(div);
        }
        input.value = '';
    } catch (err) {
        console.error(err);
    }
}

async function deleteComment(postId, commentId) {
    if (!confirm('Delete this comment?')) return;
    try {
        const res = await fetch(`${API}/api/posts/${postId}/comments/${commentId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            const el = document.getElementById(`comm-comment-${commentId}`);
            if (el) el.remove();
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

window.onload = loadCommunityFeed;
