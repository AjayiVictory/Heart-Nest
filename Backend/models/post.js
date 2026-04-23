const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 500 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const commentSchema = new mongoose.Schema({
    author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content:   { type: String, required: true, maxlength: 500 },
    likes:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    replies:   [replySchema]
}, { timestamps: true });

const postSchema = new mongoose.Schema({
    content:  { type: String, required: true, maxlength: 1000 },
    author:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    likes:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema]
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
