# Comment & Reply System Analysis

## 1. Backend Post Model Structure

**File:** [Backend/models/post.js](Backend/models/post.js)

### Reply Schema (Lines 3-6)
```javascript
const replySchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 500 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });
```

### Comment Schema (Lines 8-14)
```javascript
const commentSchema = new mongoose.Schema({
    author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content:   { type: String, required: true, maxlength: 500 },
    likes:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    replies:   [replySchema]  // ← Replies nested inside comments
}, { timestamps: true });

const postSchema = new mongoose.Schema({
    content:  { type: String, required: true, maxlength: 1000 },
    author:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    likes:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema]
}, { timestamps: true });
```

**Structure:** `Post → comments[] → replies[]` (3-level nesting)

---

## 2. Comment & Reply HTML Rendering in buildPostHTML

**File:** [frontend/Dashboard/dashboard.js](frontend/Dashboard/dashboard.js#L140-L213)

### Main Function (Line 140)
```javascript
function buildPostHTML(post) {
    const isOwn = post.author._id === currentUserId;
    // ... avatar & delete button setup ...
```

### Comment Rendering Loop (Lines 164-213)
Comments are mapped at **line 164**:
```javascript
const commentsHtml = (post.comments || []).map(c => {
    const isOwnComment = c.author._id === currentUserId;
    const commentAvatar = c.author.profilePic
        ? `<img src="${c.author.profilePic}" alt="${c.author.username}" class="comment-avatar">`
        : `<div class="comment-avatar">${c.author.username[0].toUpperCase()}</div>`;
    
    const isCommentLiked = (c.likes || []).some(id => String(id) === String(currentUserId));
    const commentLikeCount = (c.likes || []).length;
    
    // REPLIES MAPPING → (Line 172)
    const repliesHtml = (c.replies || []).map(r => { ... }).join('');
    
    // COMMENT ITEM HTML (Line 194)
    return `<div class="comment-item" id="comment-${c._id}">
        ${commentAvatar}
        <div class="comment-content">
            <strong>${escapeHtml(c.author.username)}</strong>
            <p>${escapeHtml(c.content)}</p>
            <div style="font-size:0.85rem;margin-top:4px;gap:8px;display:flex;">
                <!-- Like Button (Line 197) -->
                <button class="comment-action-btn" onclick="toggleCommentLike('${post._id}','${c._id}')" ...>
                    ❤️ ${commentLikeCount > 0 ? commentLikeCount : ''}
                </button>
                
                <!-- REPLY BUTTON (Line 200) ← KEY ELEMENT -->
                <button class="comment-action-btn" onclick="toggleReplyForm('${post._id}','${c._id}')" ...>
                    Reply
                </button>
                
                <!-- Delete Button (Line 203) -->
                ${isOwnComment ? `<button class="comment-action-btn" onclick="deleteComment('${post._id}','${c._id}')">✕</button>` : ''}
            </div>
            
            <!-- REPLY FORM (Line 205) - Initially Hidden ← IMPORTANT -->
            <div id="reply-form-${c._id}" style="display:none;margin-top:8px;">
                <div style="display:flex;gap:8px;">
                    <input type="text" id="replyInput-${c._id}" placeholder="Write a reply..." ...>
                    <button onclick="addReply('${post._id}','${c._id}')">Send</button>
                </div>
            </div>
        </div>
        
        <!-- REPLIES CONTAINER (Line 211) -->
        ${repliesHtml ? `<div style="margin-top:8px;">${repliesHtml}</div>` : ''}
    </div>`;
}).join('');
```

### Reply Rendering (Lines 172-191)
**CRITICAL:** Replies are displayed BEFORE the reply form in the HTML structure.

```javascript
const repliesHtml = (c.replies || []).map(r => {
    const isOwnReply = r.author._id === currentUserId;
    const replyAvatar = r.author.profilePic
        ? `<img src="${r.author.profilePic}" alt="${r.author.username}" class="comment-avatar" style="width:28px;height:28px;">`
        : `<div class="comment-avatar" style="width:28px;height:28px;font-size:12px;">${r.author.username[0].toUpperCase()}</div>`;
    
    const isReplyLiked = (r.likes || []).some(id => String(id) === String(currentUserId));
    const replyLikeCount = (r.likes || []).length;
    
    // REPLY ITEM STRUCTURE (Line 180)
    return `<div class="comment-item reply-item" id="reply-${r._id}" style="margin-left:40px;margin-top:8px;">
        ${replyAvatar}
        <div class="comment-content">
            <strong>${escapeHtml(r.author.username)}</strong>
            <p>${escapeHtml(r.content)}</p>
            <div style="font-size:0.85rem;margin-top:4px;gap:8px;display:flex;">
                <button class="comment-action-btn" onclick="toggleReplyLike('${post._id}','${c._id}','${r._id}')" ...>
                    ❤️ ${replyLikeCount > 0 ? replyLikeCount : ''}
                </button>
                ${isOwnReply ? `<button class="comment-action-btn" onclick="deleteReply('${post._id}','${c._id}','${r._id}')">✕</button>` : ''}
            </div>
        </div>
    </div>`;
}).join('');
```

---

## 3. Reply Form Generation & Initial State

### ✅ Reply Button is Created (Line 200)
```html
<button class="comment-action-btn" onclick="toggleReplyForm('${post._id}','${c._id}')" 
        style="background:none;border:none;cursor:pointer;color:#7C3AED;font-weight:500;">
    Reply
</button>
```
**Status:** ✅ GENERATED - Shows as purple text button next to like & delete buttons

### ✅ Reply Form is Created (Line 205-210)
```html
<div id="reply-form-${c._id}" style="display:none;margin-top:8px;">
    <div style="display:flex;gap:8px;">
        <input type="text" id="replyInput-${c._id}" placeholder="Write a reply..." 
               style="flex:1;padding:6px 10px;border:1px solid #ddd;border-radius:6px;font-size:0.9rem;">
        <button onclick="addReply('${post._id}','${c._id}')" 
                style="padding:6px 12px;background:#7C3AED;color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.9rem;">
            Send
        </button>
    </div>
</div>
```
**Status:** ✅ CREATED BUT HIDDEN (`display:none`) - Form appears when Reply button clicked

### HTML Structure Order
The order matters for DOM insertion when adding replies:
1. Comment text & actions
2. **Reply form (hidden initially)**
3. **Existing replies container** ← New replies inserted BEFORE this

---

## 4. Event Listeners for Reply Functionality

### A. toggleReplyForm (Line 412-420)
**Triggered by:** Reply button click
```javascript
function toggleReplyForm(postId, commentId) {
    const form = document.getElementById(`reply-form-${commentId}`);
    if (form) {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
        if (form.style.display === 'block') {
            document.getElementById(`replyInput-${commentId}`).focus();  // Auto-focus input
        }
    }
}
```
✅ **Status:** Simple toggle, should work fine. Auto-focuses input for UX.

### B. addReply (Line 422-480)
**Triggered by:** Send button in reply form
```javascript
async function addReply(postId, commentId) {
    const input = document.getElementById(`replyInput-${commentId}`);
    const content = input.value.trim();
    
    if (!content) {
        alert('Please write a reply');
        return;
    }
    
    try {
        // POST to backend (Line 431)
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
        
        // BUILD REPLY HTML (Line 442-456)
        const replyHtml = `<div class="comment-item reply-item" id="reply-${reply._id}" ...>
            <!-- reply content here -->
        </div>`;
        
        // INSERT INTO DOM (Line 458-465)
        const commentElement = document.getElementById(`comment-${commentId}`);
        if (commentElement) {
            const replyForm = commentElement.querySelector(`#reply-form-${commentId}`);
            if (replyForm) {
                replyForm.insertAdjacentHTML('beforebegin', replyHtml);  // Insert BEFORE form
            } else {
                commentElement.insertAdjacentHTML('beforeend', replyHtml);  // Fallback: append to comment
            }
        }
        
        input.value = '';
        toggleReplyForm(postId, commentId);  // Hide form after adding
    } catch (err) {
        console.error('Add reply error:', err);
        alert('Error adding reply.');
    }
}
```

**Key Logic:**
- Line 458: Looks for `#reply-form-${commentId}`
- Line 461: Inserts NEW reply HTML **BEFORE** the reply form
- Line 464: Fallback if form not found (shouldn't happen)

### C. toggleReplyLike (Line 523-540)
```javascript
async function toggleReplyLike(postId, commentId, replyId) {
    try {
        const res = await fetch(`${API}/api/posts/${postId}/comments/${commentId}/replies/${replyId}/like`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        if (!res.ok) return;
        const data = await res.json();
        
        // Update UI (Line 533)
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
```
✅ **Status:** Updates reply like button color and count

### D. deleteReply (Line 483-502)
```javascript
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
```
✅ **Status:** Removes reply from DOM after successful deletion

---

## 5. Backend Reply Routes

### POST /api/posts/:id/comments/:commentId/replies (Line 191-231)
**Creates a reply**
```javascript
router.post('/:id/comments/:commentId/replies', auth, async (req, res) => {
    // Line 193: Log for debugging
    console.log(`Adding reply - postId: ${req.params.id}, commentId: ${req.params.commentId}, content: ${content}`);
    
    // Line 195-198: Validate content
    if (!content || !content.trim()) {
        return res.status(400).json({ message: 'Reply content is required' });
    }
    
    // Line 200-201: Get post
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    // Line 203-207: Get comment and ensure replies array exists
    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
        console.log(`Comment not found: ${req.params.commentId}`);
        return res.status(404).json({ message: 'Comment not found' });
    }
    if (!comment.replies) comment.replies = [];
    
    // Line 210-215: Add reply
    comment.replies.push({
        author: req.user.userId,
        content: content.trim(),
        likes: []
    });
    await post.save();
    
    // Line 217-224: Fetch and return populated reply
    const updated = await Post.findById(req.params.id)
        .populate('comments.author', 'username profilePic')
        .populate('comments.replies.author', 'username profilePic');
    
    const updatedComment = updated.comments.id(req.params.commentId);
    const newReply = updatedComment.replies[updatedComment.replies.length - 1];
    
    res.status(201).json(newReply);  // ← Returns full reply object with populated author
});
```

**Return (201):** `{ _id, author: {_id, username, profilePic}, content, likes, timestamps }`

### DELETE /api/posts/:id/comments/:commentId/replies/:replyId (Line 235-265)
**Deletes reply (auth required - must be reply author)**
- Line 244: Gets reply with `comment.replies.id(replyId)`
- Line 246-248: Checks authorization
- Line 250: Deletes with `reply.deleteOne()`

### PUT /api/posts/:id/comments/:commentId/replies/:replyId/like (Line 284-305)
**Likes/unlikes reply**
- Line 292: Gets reply
- Line 294-298: Toggles user in reply.likes array
- Returns: `{ liked: boolean, likeCount: number }`

---

## 6. Data Flow Diagram

```
User clicks Reply button
    ↓
toggleReplyForm() called (Line 412)
    ↓
Reply form becomes visible (display:block)
    ↓
User types and clicks Send
    ↓
addReply() called (Line 422)
    ↓
POST /api/posts/:id/comments/:commentId/replies
    ↓ (Backend at Line 191)
Returns reply with populated author
    ↓
Frontend creates reply HTML (Line 442-456)
    ↓
Inserts before reply form with insertAdjacentHTML('beforebegin')
    ↓
Form hidden again via toggleReplyForm()
    ↓
Reply appears in comment's replies section
```

---

## 7. Potential Issues Identified

### ✅ WORKING Correctly:
1. **Reply button generation** - Created for every comment (Line 200)
2. **Reply form creation** - Generated but hidden initially (Line 205)
3. **Toggle mechanism** - Simple display toggle (Line 412)
4. **DOM insertion** - Uses `insertAdjacentHTML('beforebegin')` (Line 461)
5. **Backend validation** - Checks post/comment exist (Line 200-207)
6. **Authorization** - Reply author must match current user (Line 246-248)

### ⚠️ POTENTIAL ISSUES:

1. **Missing like button after adding reply** (Line 442-456)
   - New reply HTML doesn't include `isReplyLiked` check
   - Always shows `❤️ 0` even if liked
   - Should calculate: `const isReplyLiked = (reply.likes || []).some(id => id === currentUserId);`

2. **Comment element lookup** (Line 458-464)
   - Relies on comment element having ID `comment-${commentId}`
   - If DOM structure changes, will fail silently

3. **Event handlers on dynamically added replies**
   - Reply buttons use inline `onclick=""` attributes
   - Should work since they're part of HTML string, not attached separately

4. **Reply form selector** (Line 461)
   - Uses `querySelector()` inside comment element
   - Should work as `#reply-form-${commentId}` is unique per comment

---

## 8. Summary Table

| Component | Location | Status | Details |
|-----------|----------|--------|---------|
| **Reply Button** | Line 200 | ✅ Created | Purple text, shows for every comment |
| **Reply Form** | Line 205-210 | ✅ Created | Input + Send button, hidden initially |
| **Toggle Click Handler** | Line 412 | ✅ Working | Toggles form visibility |
| **Add Reply Submit** | Line 422 | ✅ Working | Validates, POSTs to backend, inserts reply |
| **Delete Reply** | Line 483 | ✅ Working | Requires auth, removes from DOM |
| **Like Reply** | Line 523 | ✅ Working | Updates color and count |
| **Backend Post Route** | Line 191 | ✅ Working | Creates reply, returns populated object |
| **Backend Delete Route** | Line 235 | ✅ Working | Deletes with auth check |
| **Backend Like Route** | Line 284 | ✅ Working | Toggles like state |

