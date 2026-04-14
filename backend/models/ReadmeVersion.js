const mongoose = require('mongoose');

const readmeVersionSchema = new mongoose.Schema({
    UserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    StoredRepoId: { type: mongoose.Schema.Types.ObjectId, ref: 'StoredRepo', required: true, index: true },
    RepoName: { type: String, required: true, trim: true },
    RepoFullName: { type: String, required: true, trim: true },
    VersionNumber: { type: Number, required: true, min: 1 },
    Source: { type: String, default: 'unknown', trim: true },
    Readme: { type: String, required: true, default: '' },
    Sha: { type: String, default: '' },
    BaseSha: { type: String, default: '' },
    Branch: { type: String, default: '' },
    Metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    CreatedAt: { type: Date, default: Date.now },
}, {
    timestamps: false
});

readmeVersionSchema.index({ StoredRepoId: 1, VersionNumber: -1 }, { unique: true });
readmeVersionSchema.index({ UserId: 1, RepoFullName: 1, CreatedAt: -1 });

module.exports = mongoose.model('ReadmeVersion', readmeVersionSchema);
