const mongoose = require('mongoose');

const emailResultSchema = new mongoose.Schema({
  profile: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  platform: {
    type: String,
    required: true
  },
  searchEngine: {
    type: String,
    required: true,
    enum: ['Google', 'DuckDuckGo', 'Google Dork', 'Yahoo', 'Bing']
  },
  confidence: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  aiEnhanced: {
    type: Boolean,
    default: false
  },
  method: {
    type: String,
    enum: ['pattern-matching', 'ai-enhanced', 'fallback'],
    default: 'pattern-matching'
  },
  sourceUrl: {
    type: String,
    trim: true
  },
  extractedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
emailResultSchema.index({ profile: 1, email: 1 });
emailResultSchema.index({ extractedAt: -1 });

module.exports = mongoose.model('EmailResult', emailResultSchema);

