const mongoose = require('mongoose');

const storedRepoSchema = new mongoose.Schema({
    UserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    Provider: { type: String, default: 'github', trim: true },
    Owner: { type: String, required: true, trim: true },
    Name: { type: String, required: true, trim: true },
    FullName: { type: String, required: true, trim: true },
    RemoteUrl: { type: String, default: '' },
    DefaultBranch: { type: String, default: 'main', trim: true },
    Readme: { type: String, default: '' },
    ReadmePath: { type: String, default: '' },
    Sha: { type: String, required: true, index: true },
    DiffFileApiUrl: { type: String, default: '' },
    Metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    IsPrivate: { type: Boolean, default: false },
    LastIndexedAt: { type: Date, default: Date.now },
    CreatedAt: { type: Date, default: Date.now },
    UpdatedAt: { type: Date, default: Date.now }
});

storedRepoSchema.index({ UserId: 1, FullName: 1 }, { unique: true });

const StoredRepo = mongoose.model("StoredRepo",storedRepoSchema);
module.exports = StoredRepo;