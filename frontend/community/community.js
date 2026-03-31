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

    const isLiked = (post.likes || []).includes(currentUserId);
    const likeCount = (post.likes || []).length;
    const likeBtn = `<button class="post-action-btn ${isLiked ? 'liked' : ''}" onclick="likePost('${post._id}')">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="${isLiked ? '#DC2626' : 'none'}" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 17.5C10 17.5 2.5 12.5 2.5 7.5C2.5 5.429 4.179 3.75 6.25 3.75C7.75 3.75 9.0625 4.5 10 5.625C10.9375 4.5 12.25 3.75 13.75 3.75C15.821 3.75 17.5 5.429 17.5 7.5C17.5 12.5 10 17.5 10 17.5Z" stroke="${isLiked ? '#DC2626' : '#6B7280'}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span id="comm-like-count-${post._id}">${likeCount}</span>
    </button>`;

    const commentsHtml = (post.comments || []).map(c => {
        const isOwnComment = c.author._id === currentUserId;
        const commentAvatar = c.author.profilePic
            ? `<img src="${c.author.profilePic}" alt="${c.author.username}" class="comment-avatar">`
            : `<div class="comment-avatar">${c.author.username[0].toUpperCase()}</div>`;
        return `<div class="comment-item" id="comm-comment-${c._id}">
            ${commentAvatar}
            <div class="comment-content">
                <strong>${c.author.username}</strong>
                <p>${c.content}</p>
            </div>
            ${isOwnComment ? `<button class="delete-comment-btn" onclick="deleteComment('${post._id}','${c._id}')">✕</button>` : ''}
        </div>`;
    }).join('');

    return `
        <div class="post-card" id="comm-post-${post._id}">
            <div class="post-header">
                ${avatar}
                <div class="post-user-info">
                    <h4 onclick="window.location.href='../profile/profile.html?userId=${post.author._id}'" style="cursor:pointer;">${post.author.username}</h4>
                    <span class="post-time">${formatTime(post.createdAt)}</span>
                </div>
            </div>
            <p class="post-content">${post.content}</p>
            <div class="post-actions">
                ${likeBtn}
                <button class="post-action-btn" onclick="toggleComments('${post._id}')">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.5 8.75H14.375L15.625 3.125L10 10.625H12.5L11.25 16.875L17.5 8.75Z" stroke="#6B7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M6.25 7.5H2.5V16.25H6.25V7.5Z" stroke="#6B7280" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
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

async function likePost(postId) {
    try {
        const res = await fetch(`${API}/api/posts/${postId}/like`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        if (!res.ok) return;
        const data = await res.json();
        const countEl = document.getElementById(`comm-like-count-${postId}`);
        if (countEl) countEl.textContent = data.likeCount;
        
        // Update the like button appearance
        const postCard = document.getElementById(`comm-post-${postId}`);
        if (postCard) {
            const likeBtn = postCard.querySelector('.post-action-btn.liked, .post-action-btn:not(.liked)');
            if (likeBtn) {
                if (data.liked) {
                    likeBtn.classList.add('liked');
                    likeBtn.querySelector('svg path').setAttribute('fill', '#DC2626');
                    likeBtn.querySelector('svg path').setAttribute('stroke', '#DC2626');
                } else {
                    likeBtn.classList.remove('liked');
                    likeBtn.querySelector('svg path').setAttribute('fill', 'none');
                    likeBtn.querySelector('svg path').setAttribute('stroke', '#6B7280');
                }
            }
        }
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
            const commentAvatar = comment.author.profilePic
                ? `<img src="${comment.author.profilePic}" alt="${comment.author.username}" class="comment-avatar">`
                : `<div class="comment-avatar">${comment.author.username[0].toUpperCase()}</div>`;
            const div = document.createElement('div');
            div.className = 'comment-item';
            div.id = `comm-comment-${comment._id}`;
            div.innerHTML = `${commentAvatar}
                <div class="comment-content">
                    <strong>${comment.author.username}</strong>
                    <p>${comment.content}</p>
                </div>
                ${isOwnComment ? `<button class="delete-comment-btn" onclick="deleteComment('${postId}','${comment._id}')">✕</button>` : ''}`;
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
