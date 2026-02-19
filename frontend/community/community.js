function loadCommunityFeed() {
    const allPosts = JSON.parse(localStorage.getItem('allPosts')) || [];
    const currentUser = localStorage.getItem('currentUser') || 'Guest';
    const feed = document.getElementById('communityFeed');
    
    if (allPosts.length === 0) {
        feed.innerHTML = '<p style="text-align: center; opacity: 0.7;">No posts in the community yet</p>';
        return;
    }
    
    feed.innerHTML = allPosts.map(post => buildPostCard(post, currentUser)).join('');
}

function buildPostCard(post, currentUser) {
    const isLiked = post.likedBy && post.likedBy.includes(currentUser);
    const likeClass = isLiked ? 'liked' : '';
    
    return `
        <div class="post-card">
            <div class="post-header">
                <img src="https://via.placeholder.com/50" alt="${post.user}" class="post-avatar">
                <div class="post-user-info">
                    <h4>${post.user}</h4>
                    <span class="post-time">${post.time}</span>
                </div>
            </div>
            <p class="post-content">${post.content}</p>
            <div class="post-actions">
                <button class="post-action-btn ${likeClass}" onclick="likePost(${post.id})">
                    <span>👍</span>
                    <span>${post.likes}</span>
                </button>
                <button class="post-action-btn">
                    <span>💬</span>
                    <span>${post.comments}</span>
                </button>
                <button class="post-action-btn">
                    <span>🔗</span>
                </button>
            </div>
        </div>
    `;
}

function likePost(postId) {
    const allPosts = JSON.parse(localStorage.getItem('allPosts')) || [];
    const currentUser = localStorage.getItem('currentUser') || 'Guest';
    const post = allPosts.find(p => p.id === postId);
    
    if (!post) return;
    
    if (!post.likedBy) post.likedBy = [];
    
    const index = post.likedBy.indexOf(currentUser);
    if (index > -1) {
        post.likedBy.splice(index, 1);
        post.likes--;
    } else {
        post.likedBy.push(currentUser);
        post.likes++;
    }
    
    localStorage.setItem('allPosts', JSON.stringify(allPosts));
    loadCommunityFeed();
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        window.location.href = '../index.html';
    }
}

window.onload = loadCommunityFeed;
