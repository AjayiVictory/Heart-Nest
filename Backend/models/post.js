const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    author:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 500 }
}, { timestamps: true });

const postSchema = new mongoose.Schema({
    content:  { type: String, required: true, maxlength: 1000 },
    author:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    likes:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema]
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
