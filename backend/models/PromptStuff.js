const mongoose = require('mongoose');

const promptStuffSchema = new mongoose.Schema({
    UserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    StoredRepoId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoredRepo', default: null, index: true },
    Title: { type: String, required: true, trim: true },
    PromptType: {
        type: String,
        enum: ['system', 'user', 'assistant', 'template', 'analysis', 'repo-summary'],
        default: 'template'
    },
    SystemPrompt: { type: String, default: '' },
    UserPrompt: { type: String, default: '' },
    PromptText: { type: String, required: true },
    Variables: { type: mongoose.Schema.Types.Mixed, default: {} },
    ModelName: { type: String, default: '' },
    Tags: [{ type: String, trim: true }],
    Notes: { type: String, default: '' },
    Version: { type: Number, default: 1 },
    CreatedAt: { type: Date, default: Date.now },
    UpdatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

promptStuffSchema.index({ UserId: 1, Title: 1 }, { unique: true });

module.exports = mongoose.model('PromptStuff', promptStuffSchema);