const API = window.APP_CONFIG?.API_BASE_URL || 'https://heart-nest.onrender.com';

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
    };
}

const currentUserId = localStorage.getItem('userId');
let communityRefreshIntervalId = null;
let communitySocket = null;
let communityRefreshTimeoutId = null;

// Listen for profile picture updates from other tabs/pages via BroadcastChannel
if (window.BroadcastChannel) {
    const channel = new BroadcastChannel('profile-pic-update');
    channel.onmessage = (event) => {
        if (event.data.profilePic) {
            localStorage.setItem('userProfilePic', event.data.profilePic);
            // Update all profile pictures on page
            document.querySelectorAll('[id="dashProfilePic"], [id="profilePicImg"]').forEach(el => {
                if (el) el.src = event.data.profilePic;
            });
            console.log('✓ Profile picture synced from other page');
        }
    };
}

function isPostLikedByCurrentUser(post) {
    return (post.likes || []).some(id => String(id) === String(currentUserId));
}

function formatTime(isoString) {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
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
        ? `<img src="${post.author.profilePic}" alt="${post.author.username}" class="post-avatar" style="cursor:pointer;" onclick="window.location.href='../profile/profile.html?userId=${post.author._id}'">`
        : `<img src="https://via.placeholder.com/50" alt="${post.author.username}" class="post-avatar" style="cursor:pointer;" onclick="window.location.href='../profile/profile.html?userId=${post.author._id}'">`;

    const isLiked = isPostLikedByCurrentUser(post);
    const likeCount = (post.likes || []).length;
    const likeBtn = `<button id="comm-like-btn-${post._id}" class="post-action-btn like-btn ${isLiked ? 'liked' : ''}" onclick="likePost('${post._id}')">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="${isLiked ? 'currentColor' : 'none'}" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 17.5C10 17.5 2.5 12.5 2.5 7.5C2.5 5.429 4.179 3.75 6.25 3.75C7.75 3.75 9.0625 4.5 10 5.625C10.9375 4.5 12.25 3.75 13.75 3.75C15.821 3.75 17.5 5.429 17.5 7.5C17.5 12.5 10 17.5 10 17.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span id="comm-like-count-${post._id}">${likeCount}</span>
    </button>`;

    const commentsHtml = (post.comments || []).map(c => {
        const isOwnComment = c.author._id === currentUserId;
        const commentAvatar = c.author.profilePic
            ? `<img src="${c.author.profilePic}" alt="${c.author.username}" class="comment-avatar">`
            : `<div class="comment-avatar">${c.author.username[0].toUpperCase()}</div>`;
        
        const isCommentLiked = (c.likes || []).some(id => String(id) === String(currentUserId));
        const commentLikeCount = (c.likes || []).length;
        
        const repliesHtml = (c.replies || []).map(r => {
            const isOwnReply = r.author._id === currentUserId;
            const replyAvatar = r.author.profilePic
                ? `<img src="${r.author.profilePic}" alt="${r.author.username}" class="comment-avatar" style="width:28px;height:28px;">`
                : `<div class="comment-avatar" style="width:28px;height:28px;font-size:12px;">${r.author.username[0].toUpperCase()}</div>`;
            
            const isReplyLiked = (r.likes || []).some(id => String(id) === String(currentUserId));
            const replyLikeCount = (r.likes || []).length;
            
            return `<div class="comment-item reply-item" id="comm-reply-${r._id}" style="margin-left:40px;margin-top:8px;">
                ${replyAvatar}
                <div class="comment-content">
                    <strong>${escapeHtml(r.author.username)}</strong>
                    <p>${escapeHtml(r.content)}</p>
                    <div style="font-size:0.85rem;margin-top:4px;gap:8px;display:flex;">
                        <button class="comment-action-btn" onclick="toggleCommReplyLike('${post._id}','${c._id}','${r._id}')" style="background:none;border:none;cursor:pointer;color:${isReplyLiked ? '#DC2626' : '#999'};">
                            ❤️ ${replyLikeCount > 0 ? replyLikeCount : ''}
                        </button>
                        ${isOwnReply ? `<button class="comment-action-btn" onclick="deleteCommReply('${post._id}','${c._id}','${r._id}')" style="background:none;border:none;cursor:pointer;color:#999;">✕</button>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
        
        return `<div class="comment-item" id="comm-comment-${c._id}">
            ${commentAvatar}
            <div class="comment-content">
                <strong>${escapeHtml(c.author.username)}</strong>
                <p>${escapeHtml(c.content)}</p>
                <div style="font-size:0.85rem;margin-top:4px;gap:8px;display:flex;">
                    <button class="comment-action-btn" onclick="toggleCommCommentLike('${post._id}','${c._id}')" style="background:none;border:none;cursor:pointer;color:${isCommentLiked ? '#DC2626' : '#999'};">
                        ❤️ ${commentLikeCount > 0 ? commentLikeCount : ''}
                    </button>
                    <button class="comment-action-btn" onclick="toggleCommReplyForm('${post._id}','${c._id}')" style="background:none;border:none;cursor:pointer;color:#7C3AED;font-weight:500;">
                        Reply
                    </button>
                    ${isOwnComment ? `<button class="comment-action-btn" onclick="deleteComment('${post._id}','${c._id}')" style="background:none;border:none;cursor:pointer;color:#999;">✕</button>` : ''}
                </div>
                <div id="comm-reply-form-${c._id}" style="display:none;margin-top:8px;">
                    <div style="display:flex;gap:8px;">
                        <input type="text" id="comm-replyInput-${c._id}" placeholder="Write a reply..." style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:6px;font-size:0.9rem;">
                        <button onclick="addCommReply('${post._id}','${c._id}')" style="padding:6px 12px;background:#7C3AED;color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.9rem;">Send</button>
                    </div>
                </div>
            </div>
            ${repliesHtml ? `<div style="margin-top:8px;">${repliesHtml}</div>` : ''}
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
                        <path d="M17.5 8.75H14.375L15.625 3.125L10 10.625H12.5L11.25 16.875L17.5 8.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M6.25 7.5H2.5V16.25H6.25V7.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span id="comm-comment-count-${post._id}">${post.comments.length}</span>
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
        const likeBtn = document.getElementById(`comm-like-btn-${postId}`);
        if (likeBtn) {
            const heartPath = likeBtn.querySelector('svg path');
            if (data.liked) {
                likeBtn.classList.add('liked');
                if (heartPath) {
                    heartPath.setAttribute('fill', '#DC2626');
                    heartPath.setAttribute('stroke', '#DC2626');
                }
            } else {
                likeBtn.classList.remove('liked');
                if (heartPath) {
                    heartPath.setAttribute('fill', 'none');
                    heartPath.setAttribute('stroke', '#6B7280');
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

        const countEl = document.getElementById(`comm-comment-count-${postId}`);
        if (countEl) {
            countEl.textContent = String((parseInt(countEl.textContent, 10) || 0) + 1);
        }
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

            const countEl = document.getElementById(`comm-comment-count-${postId}`);
            if (countEl) {
                const currentCount = parseInt(countEl.textContent, 10) || 0;
                countEl.textContent = String(Math.max(0, currentCount - 1));
            }
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

function startCommunityAutoRefresh() {
    // Disabled: Real-time updates via Socket.io handle feed updates
    // Auto-refresh was causing constant page reloads
    if (communityRefreshIntervalId) clearInterval(communityRefreshIntervalId);
    // Don't set up auto-refresh anymore - Socket.io handles updates
}

function scheduleCommunityRefresh() {
    if (communityRefreshTimeoutId) clearTimeout(communityRefreshTimeoutId);
    // Disabled: Avoid triggering reload loops
    // Only manual refresh when truly needed
}

function setupCommunityRealtimeUpdates() {
    if (typeof io !== 'function') return;
    if (communitySocket) return;

    communitySocket = io(API, {
        transports: ['websocket', 'polling']
    });

    communitySocket.on('feed:update', (data) => {
        if (!document.hidden) {
            // Handle new posts immediately
            if (data && data.type === 'post_created' && data.post) {
                const feed = document.getElementById('communityFeed');
                if (feed && feed.textContent.includes('No posts')) {
                    feed.innerHTML = buildPostCard(data.post);
                } else if (feed) {
                    const newPostCard = buildPostCard(data.post);
                    feed.insertAdjacentHTML('afterbegin', newPostCard);
                }
            }
            // Ignore all other updates - they're handled locally or don't need page refresh
        }
    });
}

function toggleCommReplyForm(postId, commentId) {
    const formEl = document.getElementById(`comm-reply-form-${commentId}`);
    if (formEl) {
        formEl.style.display = formEl.style.display === 'none' ? 'flex' : 'none';
        if (formEl.style.display === 'flex') {
            const input = document.getElementById(`comm-replyInput-${commentId}`);
            if (input) input.focus();
        }
    }
}

async function addCommReply(postId, commentId) {
    const input = document.getElementById(`comm-replyInput-${commentId}`);
    const content = input?.value?.trim();
    if (!content) {
        alert('Reply cannot be empty');
        return;
    }

    try {
        console.log(`Sending community reply - postId: ${postId}, commentId: ${commentId}, content: ${content}`);
        const res = await fetch(`${API}/api/posts/${postId}/comments/${commentId}/replies`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ content })
        });
        if (res.ok) {
            const reply = await res.json();
            console.log('✓ Community reply added successfully:', reply);
            const formEl = document.getElementById(`comm-reply-form-${commentId}`);
            if (formEl) formEl.style.display = 'none';
            if (input) input.value = '';
            
            // Reload to show reply
            loadCommunityFeed();
        } else {
            const errData = await res.json().catch(() => ({}));
            console.error('Reply API error:', res.status, errData);
            alert(`Failed to add reply: ${errData.message || res.statusText}`);
        }
    } catch (err) {
        console.error('Reply exception:', err);
        alert('Error adding reply: ' + err.message);
    }
}

async function deleteCommReply(postId, commentId, replyId) {
    if (!confirm('Delete this reply?')) return;
    try {
        const res = await fetch(`${API}/api/posts/${postId}/comments/${commentId}/replies/${replyId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            const el = document.getElementById(`comm-reply-${replyId}`);
            if (el) el.remove();
        }
    } catch (err) {
        console.error(err);
        alert('Error deleting reply');
    }
}

async function toggleCommCommentLike(postId, commentId) {
    try {
        const res = await fetch(`${API}/api/posts/${postId}/comments/${commentId}/like`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            loadCommunityFeed();
        }
    } catch (err) {
        console.error(err);
    }
}

async function toggleCommReplyLike(postId, commentId, replyId) {
    try {
        const res = await fetch(`${API}/api/posts/${postId}/comments/${commentId}/replies/${replyId}/like`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            loadCommunityFeed();
        }
    } catch (err) {
        console.error(err);
    }
}

window.onload = function () {
    loadCommunityFeed();
    startCommunityAutoRefresh();
    setupCommunityRealtimeUpdates();
};
