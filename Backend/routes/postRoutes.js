const express = require('express');
const router = express.Router();
const Post = require('../models/post');
const auth = require('../middleware/auth');

function emitFeedUpdate(req, payload) {
    const io = req.app.get('io');
    if (io) {
        io.emit('feed:update', payload);
    }
}

// POST /api/posts — create a post
router.post('/', auth, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Post content is required' });
        }
        const post = await new Post({
            content: content.trim(),
            author: req.user.userId
        }).save();

        const populated = await Post.findById(post._id)
            .populate('author', 'username profilePic')
            .populate('comments.author', 'username profilePic');

        // Emit real-time update with full post data so clients can immediately display it
        emitFeedUpdate(req, { type: 'post_created', post: populated });

        res.status(201).json(populated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/posts/mine — posts by the current user (MUST be before /:id)
router.get('/mine', auth, async (req, res) => {
    try {
        const posts = await Post.find({ author: req.user.userId })
            .sort({ createdAt: -1 })
            .populate('author', 'username profilePic')
            .populate('comments.author', 'username profilePic')
            .populate('comments.replies.author', 'username profilePic');
        res.json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/posts/liked — posts liked by current user (MUST be before /:id)
router.get('/liked', auth, async (req, res) => {
    try {
        const posts = await Post.find({ likes: req.user.userId })
            .sort({ createdAt: -1 })
            .populate('author', 'username profilePic')
            .populate('comments.author', 'username profilePic')
            .populate('comments.replies.author', 'username profilePic');
        res.json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/posts — all posts newest first
router.get('/', auth, async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .populate('author', 'username profilePic')
            .populate('comments.author', 'username profilePic')
            .populate('comments.replies.author', 'username profilePic');
        res.json(posts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/posts/:id — delete own post
router.delete('/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        if (post.author.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        await post.deleteOne();
        emitFeedUpdate(req, { type: 'post_deleted', postId: req.params.id });
        res.json({ message: 'Post deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/posts/:id/like — toggle like
router.put('/:id/like', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const alreadyLiked = post.likes.some(id => id.toString() === req.user.userId);
        if (alreadyLiked) {
            post.likes.pull(req.user.userId);
        } else {
            post.likes.push(req.user.userId);
        }
        await post.save();

        // Get the liker's username for notification
        const liker = await User.findById(req.user.userId);
        const likerUsername = liker ? liker.username : 'Someone';
        
        emitFeedUpdate(req, {
            type: 'post_liked',
            postId: req.params.id,
            postOwnerId: post.author.toString(),
            likerUsername: likerUsername,
            liked: !alreadyLiked
        });
        res.json({ liked: !alreadyLiked, likeCount: post.likes.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/posts/:id/comments — add a comment
router.post('/:id/comments', auth, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content || !content.trim()) {
            return res.status(400).json({ message: 'Comment content is required' });
        }
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        post.comments.push({ author: req.user.userId, content: content.trim() });
        await post.save();

        const updated = await Post.findById(req.params.id)
            .populate('comments.author', 'username profilePic');
        const newComment = updated.comments[updated.comments.length - 1];

        // Get the commenter's username for notification
        const commenter = await User.findById(req.user.userId);
        const commenterUsername = commenter ? commenter.username : 'Someone';

        emitFeedUpdate(req, {
            type: 'comment_added',
            postId: req.params.id,
            postOwnerId: post.author.toString(),
            commentId: newComment._id.toString(),
            commenterUsername: commenterUsername
        });
        res.status(201).json(newComment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// DELETE /api/posts/:id/comments/:commentId — delete own comment
router.delete('/:id/comments/:commentId', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const comment = post.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });
        if (comment.author.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        comment.deleteOne();
        await post.save();
        emitFeedUpdate(req, { type: 'comment_deleted', postId: req.params.id, commentId: req.params.commentId });
        res.json({ message: 'Comment deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/posts/:id/comments/:commentId/replies — add reply to comment
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

// DELETE /api/posts/:id/comments/:commentId/replies/:replyId — delete own reply
router.delete('/:id/comments/:commentId/replies/:replyId', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const comment = post.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        const reply = comment.replies.id(req.params.replyId);
        if (!reply) return res.status(404).json({ message: 'Reply not found' });

        if (reply.author.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        reply.deleteOne();
        await post.save();
        res.json({ message: 'Reply deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/posts/:id/comments/:commentId/like — like/unlike a comment
router.put('/:id/comments/:commentId/like', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const comment = post.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        const alreadyLiked = comment.likes.some(id => id.toString() === req.user.userId);
        if (alreadyLiked) {
            comment.likes.pull(req.user.userId);
        } else {
            comment.likes.push(req.user.userId);
        }
        await post.save();
        res.json({ liked: !alreadyLiked, likeCount: comment.likes.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/posts/:id/comments/:commentId/replies/:replyId/like — like/unlike a reply
router.put('/:id/comments/:commentId/replies/:replyId/like', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const comment = post.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        const reply = comment.replies.id(req.params.replyId);
        if (!reply) return res.status(404).json({ message: 'Reply not found' });

        const alreadyLiked = reply.likes.some(id => id.toString() === req.user.userId);
        if (alreadyLiked) {
            reply.likes.pull(req.user.userId);
        } else {
            reply.likes.push(req.user.userId);
        }
        await post.save();
        res.json({ liked: !alreadyLiked, likeCount: reply.likes.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
