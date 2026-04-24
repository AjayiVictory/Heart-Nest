# Heart-Nest Codebase Analysis

## 1. NOTIFICATIONS IMPLEMENTATION

### 1.1 Backend Socket.io Setup
**File:** [Backend/index.js](Backend/index.js#L58-L75)

Socket.io is initialized on the Express server with CORS enabled for cross-origin connections:
```javascript
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});
app.set('io', io);

io.on('connection', (socket) => {
    console.log(`socket connected: ${socket.id}`);
    socket.on('disconnect', () => {
        console.log(`socket disconnected: ${socket.id}`);
    });
});
```

### 1.2 Backend Event Emissions
**File:** [Backend/routes/postRoutes.js](Backend/routes/postRoutes.js)

Four main notification types are emitted via Socket.io:

1. **Post Liked** (Lines 105-125)
   - Event: `feed:update` with type `post_liked`
   - Payload includes: `postOwnerId`, `likerUsername`, `liked` status
   - Helper function: `emitFeedUpdate(req, payload)`

2. **Comment Added** (Lines 154-176)
   - Event: `feed:update` with type `comment_added`
   - Payload includes: `postOwnerId`, `commentId`, `commenterUsername`

3. **Follow Event** (Lines 232-249 in userRoutes.js - 🔴 Note: emits to 'notification' event, not 'feed:update')
   - Event: `notification` with type `user_followed`
   - Payload includes: `followedUserId`, `followerUsername`, `followerId`

#### ⚠️ INCONSISTENCY FOUND:
- **Likes & Comments** use: `io.emit('feed:update', ...)`
- **Follows** use: `io.emit('notification', ...)` 
- Frontend only listens for `feed:update` events, so follow notifications may not work!

### 1.3 Frontend Notification System
**File:** [frontend/Dashboard/dashboard.js](frontend/Dashboard/dashboard.js#L1150-1177)

#### Socket.io Connection (Lines 1150-1154)
```javascript
socket = io(API, {
    transports: ['websocket', 'polling']
});
```

#### Feed Update Listener (Lines 1157-1180)
```javascript
socket.on('feed:update', (data) => {
    if (!document.hidden) {
        // Handle post likes
        if (data.type === 'post_liked' && data.postOwnerId === currentUserId && data.likerUsername) {
            addNotification('❤️ New Like', `${data.likerUsername} liked your post`);
        }
        
        // Handle comments
        if (data.type === 'comment_added' && data.postOwnerId === currentUserId && data.commenterUsername) {
            addNotification('💬 New Comment', `${data.commenterUsername} commented on your post`);
        }
        
        // Handle follows - 🔴 THIS WON'T WORK (wrong event name)
        if (data.type === 'user_followed' && data.followedUserId === currentUserId && data.followerUsername) {
            addNotification('👥 New Follower', `${data.followerUsername} started following you`);
        }
    }
});
```

#### Notification Display (Lines 1118-1131)
```javascript
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
}
```

**Storage Method:** Notifications stored in `localStorage` with key: `notifications_${currentUser}`

#### Add Notification Function (Lines 1133-1145)
```javascript
function addNotification(title, message) {
    const notifications = JSON.parse(localStorage.getItem(`notifications_${currentUser}`)) || [];
    notifications.unshift({
        title,
        message,
        time: new Date().toLocaleString(),
        // ... continues
    });
}
```

---

## 2. NESTED REPLIES/COMMENTS IMPLEMENTATION

### 2.1 Data Model
**File:** [Backend/models/post.js](Backend/models/post.js)

**Structure:**
```
Post
├── comments (array of Comment objects)
    ├── _id (ObjectId)
    ├── author (User ref)
    ├── content (String, max 500)
    ├── likes (array of User IDs)
    └── replies (array of Reply objects)
        ├── _id (ObjectId)
        ├── author (User ref)
        ├── content (String, max 500)
        ├── likes (array of User IDs)
        └── timestamps
```

### 2.2 Backend Endpoints

#### Add Reply Endpoint
**File:** [Backend/routes/postRoutes.js](Backend/routes/postRoutes.js#L177-217)

**Route:** `POST /api/posts/:id/comments/:commentId/replies`
**Authentication:** Required (Bearer token)

```javascript
router.post('/:id/comments/:commentId/replies', auth, async (req, res) => {
    try {
        const { content } = req.body;
        console.log(`Adding reply - postId: ${req.params.id}, commentId: ${req.params.commentId}, content: ${content}`);
        
        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Reply content is required' });
        }

        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const comment = post.comments.id(req.params.commentId);
        if (!comment) {
            console.log(`Comment not found: ${req.params.commentId}`);
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Ensure replies array exists
        if (!comment.replies) {
            comment.replies = [];
        }

        comment.replies.push({
            author: req.user.userId,
            content: content.trim(),
            likes: []
        });
        await post.save();

        const updated = await Post.findById(req.params.id)
            .populate('comments.author', 'username profilePic')
            .populate('comments.replies.author', 'username profilePic');

        const updatedComment = updated.comments.id(req.params.commentId);
        const newReply = updatedComment.replies[updatedComment.replies.length - 1];

        res.status(201).json(newReply);
    } catch (err) {
        console.error('Error adding reply:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});
```

#### Possible Error Causes for "Failed to Add Reply"

| Error | Cause | HTTP Status | Fix |
|-------|-------|-------------|-----|
| "Post not found" | Invalid postId or post was deleted | 404 | Verify postId is correct |
| "Comment not found" | Invalid commentId or comment was deleted | 404 | Verify commentId is correct |
| "Reply content is required" | Empty or whitespace-only content | 400 | Trim input, validate non-empty |
| "Server error" | Database error or auth failure | 500 | Check auth token, DB connection |
| "Unauthorized (401/403)" | Invalid/expired token | 401/403 | Re-authenticate user |

### 2.3 Frontend Add Reply Function
**File:** [frontend/Dashboard/dashboard.js](frontend/Dashboard/dashboard.js#L614-674)

```javascript
async function addReply(postId, commentId) {
    const input = document.getElementById(`replyInput-${commentId}`);
    const content = input.value.trim();
    if (!content) {
        alert('Please write a reply');
        return;
    }
    try {
        const res = await fetch(`${API}/api/posts/${postId}/comments/${commentId}/replies`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ content })
        });
        if (!res.ok) {
            const err = await res.json();
            alert('Failed to add reply: ' + (err.message || 'Try again'));
            return;  // 🔴 Early return prevents DOM insertion
        }
        const reply = await res.json();
        
        // DOM insertion logic...
        const commentElement = document.getElementById(`comment-${commentId}`);
        if (commentElement) {
            const replyForm = commentElement.querySelector(`#reply-form-${commentId}`);
            if (replyForm) {
                replyForm.insertAdjacentHTML('beforebegin', replyHtml);
            } else {
                commentElement.insertAdjacentHTML('beforeend', replyHtml);
            }
        }
        
        input.value = '';
        toggleReplyForm(postId, commentId);
    } catch (err) {
        console.error('Add reply error:', err);
        alert('Error adding reply.');
    }
}
```

#### Debugging Steps for "Failed to Add Reply"
1. **Check Browser Console:** Look for error message from backend
2. **Verify Token:** Check if auth token exists in localStorage
3. **Check Network Tab:** See actual response from `/api/posts/:id/comments/:commentId/replies`
4. **Verify Comment ID:** Ensure commentId exists and wasn't deleted
5. **Check Input:** Ensure reply content isn't empty

---

## 3. PROFILE PICTURE UPLOAD & STORAGE

### 3.1 Backend Upload Endpoint
**File:** [Backend/routes/userRoutes.js](Backend/routes/userRoutes.js#L104-132)

**Route:** `POST /api/users/me/avatar`
**Authentication:** Required
**Storage:** Cloudinary (not localStorage)

```javascript
// Multer configuration
const upload = multer({
    storage: multer.memoryStorage(),  // 🔑 Files held in memory
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    }
});

// Upload endpoint
router.post('/me/avatar', auth, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { folder: 'heartnest/avatars', transformation: [{ width: 200, height: 200, crop: 'fill' }] },
                (error, result) => error ? reject(error) : resolve(result)
            ).end(req.file.buffer);
        });

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { profilePic: result.secure_url },  // 🔑 Store Cloudinary URL in DB
            { new: true, select: '-password' }
        );
        res.json({ profilePic: user.profilePic });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Upload failed' });
    }
});
```

**Key Points:**
- **Upload Flow:** Browser → Express (memory) → Cloudinary → DB stores URL
- **File Processing:** Images resized to 200×200 in Cloudinary
- **Return Value:** `{ profilePic: "https://res.cloudinary.com/..." }`
- **Folder Structure:** All avatars stored in `heartnest/avatars/` folder in Cloudinary

### 3.2 Frontend Upload Implementation
**File:** [frontend/profile/profile.js](frontend/profile/profile.js#L217-257)

```javascript
async function uploadAvatarImmediate(input, previewId) {
    const file = input.files[0];
    if (!file) return;

    // Instant local preview
    const reader = new FileReader();
    reader.onload = e => {
        const el = document.getElementById(previewId);
        if (el) el.src = e.target.result;  // 🔑 Local preview (data URL)
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
            const profilePic = data.profilePic;  // 🔑 Cloudinary URL
            
            // Update all profile pic elements
            document.querySelectorAll('[id="dashProfilePic"], [id="profilePicImg"]').forEach(el => {
                if (el) el.src = profilePic;
            });
            
            // Persist to localStorage for instant loading on next page load
            localStorage.setItem('userProfilePic', profilePic);
            localStorage.setItem('lastProfilePicUpdate', new Date().toISOString());
            console.log('✓ Profile picture updated successfully!');
        } else {
            const error = await res.json();
            alert('Upload failed: ' + (error.message || 'Please try again.'));
        }
    } catch (err) {
        console.error('Upload error:', err);
        alert('Upload failed: Network error.');
    } finally {
        input.value = '';  // Allow same file to be selected again
    }
}
```

**Also in dashboard.js (Lines 1120-1153):**
```javascript
async function uploadAvatarImmediate(input, previewId) {
    // Same implementation as profile.js
    // Updates both '[id="dashProfilePic"]' and '[id="profilePicImg"]'
    localStorage.setItem('userProfilePic', profilePic);
}
```

### 3.3 Profile Picture Storage Strategy

| Storage Layer | Purpose | Data |
|--|--|--|
| **Cloudinary** | Primary storage | Original file + resized versions |
| **MongoDB** | Reference storage | URL string in `User.profilePic` field |
| **localStorage** | Client-side cache | Cloudinary URL for instant loading on page refresh |

**File Loading Flow:**
1. **Page Load:** Check `localStorage.userProfilePic` → display immediately
2. **API Call:** Fetch `/api/users/me` → get latest URL from DB
3. **Image Display:** `<img src="https://res.cloudinary.com/.../profilePic" />`

### 3.4 Model Definition
**File:** [Backend/models/user.js](Backend/models/user.js#L11)

```javascript
const userSchema = new mongoose.Schema({
    // ...
    profilePic: { type: String, default: '' }  // 🔑 Stores Cloudinary URL
    // ...
});
```

---

## SUMMARY TABLE: Key Contact Points

| Feature | Backend File | Route | Frontend File | Function |
|---------|---|---|---|---|
| **Like Notification** | postRoutes.js | PUT /api/posts/:id/like | dashboard.js | toggleLike() |
| **Comment Notification** | postRoutes.js | POST /api/posts/:id/comments | dashboard.js | addComment() |
| **Follow Notification** | userRoutes.js | PUT /api/users/:userId/follow | profile.js | toggleFollow() |
| **Socket.io Setup** | index.js | N/A | dashboard.js line 1150 | setupRealtimeUpdates() |
| **Add Reply** | postRoutes.js line 184 | POST /api/posts/:id/comments/:commentId/replies | dashboard.js line 614 | addReply() |
| **Delete Reply** | postRoutes.js | DELETE /api/posts/:id/comments/:commentId/replies/:replyId | dashboard.js | deleteReply() |
| **Like Reply** | postRoutes.js | PUT /api/posts/:id/comments/:commentId/replies/:replyId/like | dashboard.js | toggleReplyLike() |
| **Avatar Upload** | userRoutes.js line 110 | POST /api/users/me/avatar | profile.js & dashboard.js | uploadAvatarImmediate() |
| **Notifications Display** | N/A (localStorage) | N/A | dashboard.js | openNotifications(), loadNotifications() |

---

## ISSUES IDENTIFIED

### 🔴 Critical Issues

1. **Follow Notifications Not Working**
   - Backend emits to wrong event: `io.emit('notification', ...)` 
   - Frontend listens for: `socket.on('feed:update', ...)`
   - **Fix:** Change line 241 in userRoutes.js to use `io.emit('feed:update', ...)`

### 🟡 Medium Issues

2. **No Reply Notifications**
   - When someone replies to your comment, no notification is sent
   - **Fix:** Add event emitter after `comment.replies.push()` in postRoutes.js

3. **Inconsistent Notification Event Names**
   - Some use 'feed:update', some use 'notification'
   - Should standardize on one event name

### 🟢 Working as Designed

- Profile picture upload goes to Cloudinary ✓
- Reply creation and deletion working ✓
- Nested replies properly stored in MongoDB ✓
- localStorage caching for performance ✓
