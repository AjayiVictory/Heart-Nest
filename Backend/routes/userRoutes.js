const express = require('express');
const router = express.Router();
const multer = require('multer');
const User = require('../models/user');
const Post = require('../models/post');
const auth = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    }
});

// GET /api/users/me — own full profile (MUST be before /:userId)
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const postsCount = await Post.countDocuments({ author: req.user.userId });
        res.json({
            ...user.toObject(),
            postsCount,
            followersCount: user.followers.length,
            followingCount: user.following.length
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/users/me — update own profile fields
router.put('/me', auth, async (req, res) => {
    try {
        const { username, email, bio, profilePic } = req.body;
        const updates = {};

        if (username !== undefined) {
            const trimmedUsername = String(username).trim();
            if (!trimmedUsername) {
                return res.status(400).json({ message: 'Username cannot be empty' });
            }

            const existingUsername = await User.findOne({
                username: trimmedUsername,
                _id: { $ne: req.user.userId }
            });
            if (existingUsername) {
                return res.status(400).json({ message: 'Username already taken' });
            }

            updates.username = trimmedUsername;
        }

        if (email !== undefined) {
            const trimmedEmail = String(email).trim().toLowerCase();
            if (!trimmedEmail) {
                return res.status(400).json({ message: 'Email cannot be empty' });
            }

            const existingEmail = await User.findOne({
                email: trimmedEmail,
                _id: { $ne: req.user.userId }
            });
            if (existingEmail) {
                return res.status(400).json({ message: 'Email already in use' });
            }

            updates.email = trimmedEmail;
        }

        if (bio !== undefined) updates.bio = bio;
        if (profilePic !== undefined) updates.profilePic = profilePic;

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { $set: updates },
            { new: true, select: '-password' }
        );
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/users/me/avatar — upload profile picture to Cloudinary (MUST be before /:userId)
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
            { profilePic: result.secure_url },
            { new: true, select: '-password' }
        );
        res.json({ profilePic: user.profilePic });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Upload failed' });
    }
});

// GET /api/users/search?q= — search users by username (MUST be before /:userId)
router.get('/search', auth, async (req, res) => {
    try {
        const q = req.query.q || '';
        if (!q.trim()) return res.json([]);

        const users = await User.find({
            username: { $regex: q, $options: 'i' },
            _id: { $ne: req.user.userId }
        }).select('username bio profilePic').limit(10);

        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/users/:userId — public profile
router.get('/:userId', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password -email');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const postsCount = await Post.countDocuments({ author: req.params.userId });
        const isFollowing = user.followers.some(id => id.toString() === req.user.userId);

        res.json({
            _id: user._id,
            username: user.username,
            bio: user.bio,
            profilePic: user.profilePic,
            postsCount,
            followersCount: user.followers.length,
            followingCount: user.following.length,
            isFollowing
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/users/:userId/follow — toggle follow/unfollow
router.put('/:userId/follow', auth, async (req, res) => {
    try {
        if (req.params.userId === req.user.userId) {
            return res.status(400).json({ message: 'You cannot follow yourself' });
        }
        const target = await User.findById(req.params.userId);
        const me = await User.findById(req.user.userId);
        if (!target || !me) return res.status(404).json({ message: 'User not found' });

        const isFollowing = me.following.some(id => id.toString() === req.params.userId);
        if (isFollowing) {
            me.following.pull(req.params.userId);
            target.followers.pull(req.user.userId);
        } else {
            me.following.push(req.params.userId);
            target.followers.push(req.user.userId);
        }
        await Promise.all([me.save(), target.save()]);
        res.json({ following: !isFollowing });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
