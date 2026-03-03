const express = require('express');
const router = express.Router();
const Post = require('../models/post');
const auth = require('../middleware/auth');

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
            .populate('comments.author', 'username profilePic');
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
            .populate('comments.author', 'username profilePic');
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
            .populate('comments.author', 'username profilePic');
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
        res.json({ message: 'Comment deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
