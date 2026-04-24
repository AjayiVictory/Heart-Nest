const API = window.APP_CONFIG?.API_BASE_URL || 'https://heart-nest.onrender.com';

function getAuthHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
    };
}

let currentUser = localStorage.getItem('username') || 'Guest';
let currentUserId = localStorage.getItem('userId');
let activeTab = 'posts';
let refreshIntervalId = null;
let socket = null;
let refreshTimeoutId = null;

// Mobile menu functions
function toggleMobileMenu() {
    const hamburger = document.getElementById('hamburgerBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('active');
}

function closeMobileMenu() {
    const hamburger = document.getElementById('hamburgerBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    
    hamburger.classList.remove('active');
    mobileMenu.classList.remove('active');
}

// Close mobile menu when clicking outside
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenu = document.getElementById('mobileMenu');
    document.addEventListener('click', function(event) {
        const hamburger = document.getElementById('hamburgerBtn');
        if (!hamburger.contains(event.target) && !mobileMenu.contains(event.target)) {
            closeMobileMenu();
        }
    });
});

function isPostLikedByCurrentUser(post) {
    return (post.likes || []).some(id => String(id) === String(currentUserId));
}

async function updateDashboardStats() {
    try {
        const res = await fetch(`${API}/api/users/me`, { headers: getAuthHeaders() });
        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            localStorage.removeItem('username');
            window.location.href = '../SignIn/signin.html';
            return;
        }
        if (!res.ok) return;
        const data = await res.json();

        const postCount = document.getElementById('dashPostCount');
        const likeCount = document.getElementById('dashLikeCount');
        const connectionCount = document.getElementById('dashConnectionCount');
        if (postCount) postCount.textContent = data.postsCount || 0;
        if (likeCount) likeCount.textContent = data.followersCount || 0;
        if (connectionCount) connectionCount.textContent = data.followingCount || 0;

        const nameEl = document.getElementById('userName');
        
        // ALWAYS use the stored username, don't risk overwriting with API data
        let displayUsername = localStorage.getItem('username') || 'Guest';
        
        // Only update from API if it's different and looks valid (not an email)
        if (data.username && !data.username.includes('@')) {
            displayUsername = data.username;
            localStorage.setItem('username', displayUsername);
        }
        
        if (nameEl) nameEl.textContent = displayUsername;

        // Update bio in dashboard profile card
        const bioEl = document.querySelector('.profile-bio');
        if (bioEl) {
            bioEl.textContent = data.bio || 'Tell us about yourself...';
            console.log('✓ Dashboard bio updated:', data.bio);
        }

        currentUser = displayUsername;
        if (data.email) localStorage.setItem('userEmail', data.email);

        // Update profile picture from server and persist to localStorage
        if (data.profilePic) {
            localStorage.setItem('userProfilePic', data.profilePic);
            const picEl = document.getElementById('dashProfilePic');
            if (picEl) picEl.src = data.profilePic;
        }
    } catch (err) {
        console.error('Failed to load stats:', err);
    }
}

async function publishPost() {
    const textarea = document.getElementById('postContent');
    const content = textarea.value.trim();
    if (!content) {
        alert('Please write something before posting');
        return;
    }
    try {
        const res = await fetch(`${API}/api/posts`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ content })
        });
        if (!res.ok) {
            const data = await res.json();
            alert(data.message || 'Failed to post');
            return;
        }
        textarea.value = '';
        await loadPostsFromAPI('posts');
        await updateDashboardStats();
    } catch (err) {
        console.error(err);
        alert('Server error. Please try again.');
    }
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

function buildPostHTML(post) {
    const isOwn = post.author._id === currentUserId;
    const avatar = post.author.profilePic
        ? `<img src="${post.author.profilePic}" alt="${post.author.username}" class="post-avatar" style="cursor:pointer;" onclick="window.location.href='../profile/profile.html?userId=${post.author._id}'">`
        : `<img src="https://via.placeholder.com/40" alt="${post.author.username}" class="post-avatar" style="cursor:pointer;" onclick="window.location.href='../profile/profile.html?userId=${post.author._id}'">`;
    const deleteBtn = isOwn
        ? `<button class="post-action-btn" onclick="deletePost('${post._id}')"><span>🗑️</span></button>`
        : '';
    
    const isLiked = isPostLikedByCurrentUser(post);
    const likeCount = (post.likes || []).length;
    const likeBtn = `<button id="like-btn-${post._id}" class="post-action-btn like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post._id}')">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="${isLiked ? 'currentColor' : 'none'}" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 17.5C10 17.5 2.5 12.5 2.5 7.5C2.5 5.429 4.179 3.75 6.25 3.75C7.75 3.75 9.0625 4.5 10 5.625C10.9375 4.5 12.25 3.75 13.75 3.75C15.821 3.75 17.5 5.429 17.5 7.5C17.5 12.5 10 17.5 10 17.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span id="like-count-${post._id}">${likeCount}</span>
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
            
            return `<div class="comment-item reply-item" id="reply-${r._id}" style="margin-left:40px;margin-top:8px;">
                ${replyAvatar}
                <div class="comment-content">
                    <strong>${escapeHtml(r.author.username)}</strong>
                    <p>${escapeHtml(r.content)}</p>
                    <div style="font-size:0.85rem;margin-top:4px;gap:8px;display:flex;">
                        <button class="comment-action-btn" onclick="toggleReplyLike('${post._id}','${c._id}','${r._id}')" style="background:none;border:none;cursor:pointer;color:${isReplyLiked ? '#DC2626' : '#999'};">
                            ❤️ ${replyLikeCount > 0 ? replyLikeCount : ''}
                        </button>
                        ${isOwnReply ? `<button class="comment-action-btn" onclick="deleteReply('${post._id}','${c._id}','${r._id}')" style="background:none;border:none;cursor:pointer;color:#999;">✕</button>` : ''}
                    </div>
                </div>
            </div>`;
        }).join('');
        
        return `<div class="comment-item" id="comment-${c._id}">
            ${commentAvatar}
            <div class="comment-content">
                <strong>${escapeHtml(c.author.username)}</strong>
                <p>${escapeHtml(c.content)}</p>
                <div style="font-size:0.85rem;margin-top:4px;gap:8px;display:flex;">
                    <button class="comment-action-btn" onclick="toggleCommentLike('${post._id}','${c._id}')" style="background:none;border:none;cursor:pointer;color:${isCommentLiked ? '#DC2626' : '#999'};">
                        ❤️ ${commentLikeCount > 0 ? commentLikeCount : ''}
                    </button>
                    <button class="comment-action-btn" onclick="toggleReplyForm('${post._id}','${c._id}')" style="background:none;border:none;cursor:pointer;color:#7C3AED;font-weight:500;">
                        Reply
                    </button>
                    ${isOwnComment ? `<button class="comment-action-btn" onclick="deleteComment('${post._id}','${c._id}')" style="background:none;border:none;cursor:pointer;color:#999;">✕</button>` : ''}
                </div>
                <div id="reply-form-${c._id}" style="display:none;margin-top:8px;">
                    <div style="display:flex;gap:8px;">
                        <input type="text" id="replyInput-${c._id}" placeholder="Write a reply..." style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:6px;font-size:0.9rem;">
                        <button onclick="addReply('${post._id}','${c._id}')" style="padding:6px 12px;background:#7C3AED;color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.9rem;">Send</button>
                    </div>
                </div>
            </div>
            ${repliesHtml ? `<div style="margin-top:8px;">${repliesHtml}</div>` : ''}
        </div>`;
    }).join('');

    return `
        <div class="post-card" id="post-${post._id}">
            <div class="post-header">
                ${avatar}
                <div class="post-user-info">
                    <h4 style="cursor:pointer;color:#7C3AED;" onclick="window.location.href='../profile/profile.html?userId=${post.author._id}'">${escapeHtml(post.author.username)}</h4>
                    <span class="post-time">${formatTime(post.createdAt)}</span>
                </div>
                ${deleteBtn}
            </div>
            <p class="post-content">${post.content}</p>
            <div class="post-actions">
                ${likeBtn}
                <button class="post-action-btn" onclick="toggleComments('${post._id}')">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.5 8.75H14.375L15.625 3.125L10 10.625H12.5L11.25 16.875L17.5 8.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M6.25 7.5H2.5V16.25H6.25V7.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span id="comment-count-${post._id}">${post.comments.length}</span>
                </button>
            </div>
            <div class="comments-section" id="comments-${post._id}" style="display:none">
                <div class="comments-list">${commentsHtml}</div>
                <div class="comment-input">
                    <input type="text" id="commentInput-${post._id}" placeholder="Write a comment...">
                    <button onclick="addComment('${post._id}')">Send</button>
                </div>
            </div>
        </div>
    `;
}

function renderPosts(posts) {
    const feed = document.querySelector('.posts-feed');
    if (!feed) return;
    if (posts.length === 0) {
        feed.innerHTML = '<p style="text-align: center; opacity: 0.7; padding: 20px;">No posts yet</p>';
        return;
    }
    feed.innerHTML = posts.map(buildPostHTML).join('');
}

async function loadPostsFromAPI(tabType) {
    const endpoints = {
        posts: `${API}/api/posts/mine`,
        liked: `${API}/api/posts/liked`,
        saved: `${API}/api/posts/mine`
    };
    try {
        const res = await fetch(endpoints[tabType] || endpoints.posts, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const posts = await res.json();
        renderPosts(posts);
    } catch (err) {
        console.error('Failed to load posts:', err);
    }
}

async function toggleLike(postId) {
    try {
        const res = await fetch(`${API}/api/posts/${postId}/like`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        if (!res.ok) return;
        const data = await res.json();
        const countEl = document.getElementById(`like-count-${postId}`);
        if (countEl) countEl.textContent = data.likeCount;
        
        // Update the like button appearance
        const likeBtn = document.getElementById(`like-btn-${postId}`);
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

        if (activeTab === 'liked' && !data.liked) {
            const postCard = document.getElementById(`post-${postId}`);
            if (postCard) postCard.remove();
        }
    } catch (err) {
        console.error(err);
    }
}

function toggleComments(postId) {
    const section = document.getElementById(`comments-${postId}`);
    if (section) {
        section.style.display = section.style.display === 'none' ? 'block' : 'none';
    }
}

async function addComment(postId) {
    const input = document.getElementById(`commentInput-${postId}`);
    const content = input.value.trim();
    if (!content) {
        alert('Please write a comment');
        return;
    }
    try {
        const res = await fetch(`${API}/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ content })
        });
        if (!res.ok) {
            const err = await res.json();
            alert('Failed to add comment: ' + (err.message || 'Try again'));
            return;
        }
        const comment = await res.json();
        const list = document.querySelector(`#comments-${postId} .comments-list`);
        if (list) {
            const isOwnComment = comment.author._id === currentUserId;
            const commentAvatar = comment.author.profilePic
                ? `<img src="${comment.author.profilePic}" alt="${comment.author.username}" class="comment-avatar">`
                : `<div class="comment-avatar">${escapeHtml(comment.author.username[0].toUpperCase())}</div>`;
            const div = document.createElement('div');
            div.className = 'comment-item';
            div.id = `comment-${comment._id}`;
            div.innerHTML = `${commentAvatar}
                <div class="comment-content">
                    <strong>${escapeHtml(comment.author.username)}</strong>
                    <p>${escapeHtml(comment.content)}</p>
                </div>
                ${isOwnComment ? `<button class="delete-comment-btn" onclick="deleteComment('${postId}','${comment._id}')">✕</button>` : ''}`;
            list.appendChild(div);
        }
        input.value = '';
        
        // Update comment count & emit real-time update
        const commentCountSpan = document.getElementById(`comment-count-${postId}`);
        if (commentCountSpan) {
            commentCountSpan.textContent = String((parseInt(commentCountSpan.textContent, 10) || 0) + 1);
        }
    } catch (err) {
        console.error('Comment error:', err);
        alert('Error adding comment. Please try again.');
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
            const el = document.getElementById(`comment-${commentId}`);
            if (el) el.remove();

            const commentCountSpan = document.getElementById(`comment-count-${postId}`);
            if (commentCountSpan) {
                const currentCount = parseInt(commentCountSpan.textContent, 10) || 0;
                commentCountSpan.textContent = String(Math.max(0, currentCount - 1));
            }
        } else {
            const err = await res.json();
            alert('Failed to delete comment: ' + (err.message || 'Try again'));
        }
    } catch (err) {
        console.error('Delete comment error:', err);
        alert('Error deleting comment.');
    }
}

async function deletePost(postId) {
    if (!confirm('Delete this post?')) return;
    try {
        const res = await fetch(`${API}/api/posts/${postId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            const el = document.getElementById(`post-${postId}`);
            if (el) el.remove();
            await updateDashboardStats();
        }
    } catch (err) {
        console.error(err);
    }
}

function toggleReplyForm(postId, commentId) {
    const form = document.getElementById(`reply-form-${commentId}`);
    if (form) {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
        if (form.style.display === 'block') {
            document.getElementById(`replyInput-${commentId}`).focus();
        }
    }
}

async function addReply(postId, commentId) {
    const input = document.getElementById(`replyInput-${commentId}`);
    const content = input.value.trim();
    if (!content) {
        alert('Please write a reply');
        return;
    }
    try {
        console.log(`Sending reply - postId: ${postId}, commentId: ${commentId}, content: ${content}`);
        const res = await fetch(`${API}/api/posts/${postId}/comments/${commentId}/replies`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ content })
        });
        if (!res.ok) {
            const err = await res.json();
            console.error('Reply API error:', err);
            alert('Failed to add reply: ' + (err.message || 'Try again'));
            return;
        }
        const reply = await res.json();
        console.log('✓ Reply added successfully:', reply);
        
        // Verify reply has author populated
        if (!reply.author || !reply.author.username) {
            console.error('Reply author not populated:', reply);
            alert('Reply added but author info missing. Refreshing...');
            await loadPostsFromAPI(activeTab);
            return;
        }
        
        // Create reply HTML and add it to the page
        const replyAvatar = reply.author.profilePic
            ? `<img src="${reply.author.profilePic}" alt="${reply.author.username}" class="comment-avatar" style="width:28px;height:28px;">`
            : `<div class="comment-avatar" style="width:28px;height:28px;font-size:12px;">${reply.author.username[0].toUpperCase()}</div>`;
        
        const replyHtml = `<div class="comment-item reply-item" id="reply-${reply._id}" style="margin-left:40px;margin-top:8px;">
            ${replyAvatar}
            <div class="comment-content">
                <strong>${escapeHtml(reply.author.username)}</strong>
                <p>${escapeHtml(reply.content)}</p>
                <div style="font-size:0.85rem;margin-top:4px;gap:8px;display:flex;">
                    <button class="comment-action-btn" onclick="toggleReplyLike('${postId}','${commentId}','${reply._id}')" style="background:none;border:none;cursor:pointer;color:#999;">
                        ❤️ 0
                    </button>
                    <button class="comment-action-btn" onclick="deleteReply('${postId}','${commentId}','${reply._id}')" style="background:none;border:none;cursor:pointer;color:#999;">✕</button>
                </div>
            </div>
        </div>`;
        
        // Find where to insert the reply (after existing replies or before reply form)
        const commentElement = document.getElementById(`comment-${commentId}`);
        if (commentElement) {
            const repliesContainer = commentElement.querySelector('div[style*="margin-top:8px"]');
            if (repliesContainer) {
                // Add to existing replies container
                repliesContainer.insertAdjacentHTML('beforeend', replyHtml);
            } else {
                // Create new replies container and add reply
                const newContainer = document.createElement('div');
                newContainer.style.marginTop = '8px';
                newContainer.innerHTML = replyHtml;
                const replyForm = commentElement.querySelector(`#reply-form-${commentId}`);
                if (replyForm) {
                    replyForm.parentElement.insertBefore(newContainer, replyForm);
                } else {
                    commentElement.appendChild(newContainer);
                }
            }
        }
        
        input.value = '';
        toggleReplyForm(postId, commentId);
        console.log('✓ Reply rendered on page');
    } catch (err) {
        console.error('Add reply error:', err);
        alert('Error adding reply: ' + err.message);
    }
}

async function deleteReply(postId, commentId, replyId) {
    if (!confirm('Delete this reply?')) return;
    try {
        const res = await fetch(`${API}/api/posts/${postId}/comments/${commentId}/replies/${replyId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            const el = document.getElementById(`reply-${replyId}`);
            if (el) el.remove();
        } else {
            const err = await res.json();
            alert('Failed to delete reply: ' + (err.message || 'Try again'));
        }
    } catch (err) {
        console.error('Delete reply error:', err);
        alert('Error deleting reply.');
    }
}

async function toggleCommentLike(postId, commentId) {
    try {
        const res = await fetch(`${API}/api/posts/${postId}/comments/${commentId}/like`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        if (!res.ok) return;
        const data = await res.json();
        
        // Update like button display
        const commentElement = document.getElementById(`comment-${commentId}`);
        if (commentElement) {
            const likeBtn = commentElement.querySelector('button[onclick*="toggleCommentLike"]');
            if (likeBtn) {
                likeBtn.style.color = data.liked ? '#DC2626' : '#999';
                likeBtn.textContent = `❤️ ${data.likeCount > 0 ? data.likeCount : ''}`;
            }
        }
    } catch (err) {
        console.error('Like comment error:', err);
    }
}

async function toggleReplyLike(postId, commentId, replyId) {
    try {
        const res = await fetch(`${API}/api/posts/${postId}/comments/${commentId}/replies/${replyId}/like`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        if (!res.ok) return;
        const data = await res.json();
        
        // Update like button display
        const replyElement = document.getElementById(`reply-${replyId}`);
        if (replyElement) {
            const likeBtn = replyElement.querySelector('button[onclick*="toggleReplyLike"]');
            if (likeBtn) {
                likeBtn.style.color = data.liked ? '#DC2626' : '#999';
                likeBtn.textContent = `❤️ ${data.likeCount > 0 ? data.likeCount : ''}`;
            }
        }
    } catch (err) {
        console.error('Like reply error:', err);
    }
}

function switchTab(tabType) {
    activeTab = tabType;
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => t.classList.remove('active'));
    const postCreateBox = document.querySelector('.post-create-box');
    const tabIndex = { posts: 0, liked: 1, saved: 2 };
    const idx = tabIndex[tabType] ?? 0;
    if (tabs[idx]) tabs[idx].classList.add('active');
    if (postCreateBox) postCreateBox.style.display = tabType === 'posts' ? 'block' : 'none';
    loadPostsFromAPI(tabType);
}

async function searchUsers() {
    const searchInput = document.getElementById('userSearch');
    const searchResults = document.getElementById('searchResults');
    const query = searchInput.value.trim();
    if (!query) {
        searchResults.classList.remove('active');
        return;
    }
    try {
        const res = await fetch(`${API}/api/users/search?q=${encodeURIComponent(query)}`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) return;
        const users = await res.json();
        if (users.length === 0) {
            searchResults.innerHTML = '<div class="search-no-results">No users found</div>';
            searchResults.classList.add('active');
            return;
        }
        searchResults.innerHTML = users.map(user => {
            const pic = user.profilePic
                ? `<img src="${user.profilePic}" class="search-result-avatar" style="width:36px;height:36px;border-radius:50%;object-fit:cover" alt="${escapeHtml(user.username)}">`
                : `<div class="search-result-avatar">${escapeHtml(user.username[0]).toUpperCase()}</div>`;
            return `
                <div class="search-result-item" onclick="viewUserProfile('${user._id}')">
                    ${pic}
                    <div class="search-result-info">
                        <h4 class="search-result-name">${escapeHtml(user.username)}</h4>
                        <p class="search-result-meta">${escapeHtml(user.bio || '')}</p>
                    </div>
                </div>
            `;
        }).join('');
        searchResults.classList.add('active');
    } catch (err) {
        console.error(err);
    }
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

function viewUserProfile(userId) {
    document.getElementById('searchResults').classList.remove('active');
    document.getElementById('userSearch').value = '';
    window.location.href = `../profile/profile.html?userId=${userId}`;
}

document.addEventListener('click', function(event) {
    const searchContainer = document.querySelector('.search-container');
    const searchResults = document.getElementById('searchResults');
    if (searchContainer && !searchContainer.contains(event.target)) {
        searchResults.classList.remove('active');
    }
});

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        window.location.href = '../index.html';
    }
}

function init() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../SignIn/signin.html';
        return;
    }
    currentUser = localStorage.getItem('username') || 'Guest';
    currentUserId = localStorage.getItem('userId');

    // Load profile picture from localStorage if available
    const storedProfilePic = localStorage.getItem('userProfilePic');
    if (storedProfilePic) {
        const picEl = document.getElementById('dashProfilePic');
        if (picEl) picEl.src = storedProfilePic;
    }

    // Listen for profile picture updates from other tabs/pages via BroadcastChannel
    if (window.BroadcastChannel) {
        const channel = new BroadcastChannel('profile-pic-update');
        channel.onmessage = (event) => {
            if (event.data.profilePic) {
                localStorage.setItem('userProfilePic', event.data.profilePic);
                const picEl = document.getElementById('dashProfilePic');
                if (picEl) picEl.src = event.data.profilePic;
                console.log('✓ Profile picture synced from other page');
            }
        };
    }

    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach((tab, index) => {
        tab.onclick = () => switchTab(['posts', 'liked', 'saved'][index]);
    });

    // Check if this is a new user and show welcome message
    const isNewUser = localStorage.getItem('isNewUser');
    if (isNewUser === 'true') {
        localStorage.removeItem('isNewUser');
        setTimeout(() => {
            alert(`👋 Welcome to Heart-Nest, ${currentUser}!\n\nYou can now:\n📝 Create posts to share your thoughts\n❤️ Like and comment on posts\n👥 Follow other users\n💬 Have nested conversations with replies\n\nHappy connecting!`);
        }, 500);
    }

    // Load data in background without blocking UI
    updateDashboardStats();
    switchTab('posts');
}

function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

async function uploadAvatarImmediate(input, previewId) {
    const file = input.files[0];
    if (!file) return;

    // Instant local preview
    const reader = new FileReader();
    reader.onload = e => {
        const el = document.getElementById(previewId);
        if (el) el.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Upload to server
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

async function openEditProfile() {
    try {
        const res = await fetch(`${API}/api/users/me`, { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            // Use stored username to avoid any API issues
            const storedUsername = localStorage.getItem('username') || data.username || '';
            document.getElementById('editName').value = storedUsername;
            document.getElementById('settingsEmail').textContent = data.email || 'Not set';
            document.getElementById('editBio').value = data.bio || '';
            console.log('✓ Edit profile loaded - username:', storedUsername);
        }
    } catch (err) {
        console.error(err);
    }
    const interests = JSON.parse(localStorage.getItem('userInterests')) || [];
    document.getElementById('editInterests').value = interests.join(', ');
    openModal('editProfileModal');
}

async function saveProfile() {
    const username = document.getElementById('editName').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    const interestsInput = document.getElementById('editInterests').value.trim();

    if (!username) {
        alert('Name cannot be empty');
        return;
    }

    try {
        const res = await fetch(`${API}/api/users/me`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ username, bio })
        });
        if (!res.ok) {
            const data = await res.json();
            alert(data.message || 'Failed to save profile');
            return;
        }

        const updated = await res.json();
        currentUser = updated.username || username;
        localStorage.setItem('username', currentUser);
        if (updated.email) localStorage.setItem('userEmail', updated.email);
    } catch (err) {
        console.error(err);
        alert('Server error. Please try again.');
        return;
    }

    const interests = interestsInput ? interestsInput.split(',').map(i => i.trim()).filter(i => i) : [];
    localStorage.setItem('userInterests', JSON.stringify(interests));

    closeModal('editProfileModal');
    alert('Profile updated successfully!');
    await updateDashboardStats();
    if (activeTab) await loadPostsFromAPI(activeTab);
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

async function openChangePassword() {
    closeModal('settingsModal');
    
    // Create a modal for password change with proper fields
    const currentPassword = prompt('Enter your current password:');
    if (!currentPassword) return;
    
    const newPassword = prompt('Enter your new password (minimum 8 characters):');
    if (!newPassword) return;
    
    if (newPassword.length < 8) {
        alert('Password must be at least 8 characters long.');
        return;
    }
    
    const confirmPassword = prompt('Confirm your new password:');
    if (confirmPassword !== newPassword) {
        alert('Passwords do not match.');
        return;
    }
    
    try {
        const res = await fetch(`${API}/api/users/me/password`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ currentPassword, newPassword })
        });
        
        if (!res.ok) {
            const data = await res.json();
            alert('Error: ' + (data.message || 'Failed to change password'));
            return;
        }
        
        alert('✓ Password changed successfully!');
    } catch (err) {
        console.error('Password change error:', err);
        alert('Failed to change password. Please try again.');
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
    const storedPosts = JSON.parse(localStorage.getItem('allPosts') || '[]');
    const userData = {
        user: currentUser,
        email: localStorage.getItem('userEmail'),
        bio: localStorage.getItem('userBio'),
        interests: JSON.parse(localStorage.getItem('userInterests') || '[]'),
        posts: storedPosts.filter(post => post.user === currentUser),
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

function startAutoRefresh() {
    if (refreshIntervalId) clearInterval(refreshIntervalId);
    refreshIntervalId = setInterval(async () => {
        if (document.hidden) return;
        await Promise.all([loadPostsFromAPI(activeTab), updateDashboardStats()]);
    }, 10000);
}

function scheduleDashboardRefresh() {
    if (refreshTimeoutId) clearTimeout(refreshTimeoutId);
    refreshTimeoutId = setTimeout(async () => {
        await Promise.all([loadPostsFromAPI(activeTab), updateDashboardStats()]);
    }, 200);
}

function setupRealtimeUpdates() {
    if (typeof io !== 'function') return;
    if (socket) return;

    socket = io(API, {
        transports: ['websocket', 'polling']
    });

    socket.on('feed:update', (data) => {
        if (!document.hidden) {
            // Handle likes on your posts
            if (data.type === 'post_liked' && data.postOwnerId === currentUserId && data.likerUsername) {
                addNotification('❤️ New Like', `${data.likerUsername} liked your post`);
            }
            
            // Handle comments on your posts
            if (data.type === 'comment_added' && data.postOwnerId === currentUserId && data.commenterUsername) {
                addNotification('💬 New Comment', `${data.commenterUsername} commented on your post`);
            }
            
            // Handle follows
            if (data.type === 'user_followed' && data.followedUserId === currentUserId && data.followerUsername) {
                addNotification('👥 New Follower', `${data.followerUsername} started following you`);
            }

            // For new posts created by current user
            if (data && data.type === 'post_created' && data.post && data.post.author._id === currentUserId && activeTab === 'posts') {
                const feed = document.getElementById('dashFeed');
                if (feed && feed.textContent.includes('No posts')) {
                    feed.innerHTML = buildPostHTML(data.post);
                } else if (feed) {
                    const newPostCard = buildPostHTML(data.post);
                    feed.insertAdjacentHTML('afterbegin', newPostCard);
                    updateDashboardStats();
                }
            } else {
                // For other updates, refresh normally
                scheduleDashboardRefresh();
            }
        }
    });
}

window.onload = function() {
    init();
    applyAppearanceSettings();
    updateNotificationBadge();
    
    // Defer non-critical setup after UI is fully interactive
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            startAutoRefresh();
            setupRealtimeUpdates();
        });
    } else {
        setTimeout(() => {
            startAutoRefresh();
            setupRealtimeUpdates();
        }, 100);
    }
};
