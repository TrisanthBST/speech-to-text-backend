import mongoose from 'mongoose';

const transcriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true, // Index for faster user-specific queries
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: false // Make this optional since we're using memory storage
  },
  transcription: {
    type: String,
    default: ''
  },
  confidence: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  duration: {
    type: Number,
    default: 0,
    min: 0
  },
  fileSize: {
    type: Number,
    default: 0
  },
  mimeType: {
    type: String,
    default: null
  },
  language: {
    type: String,
    default: 'en-US'
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'completed'
  },
  metadata: {
    source: {
      type: String,
      enum: ['upload', 'recording'],
      default: 'upload'
    },
    processingTime: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Index for user-specific queries with timestamp sorting
transcriptionSchema.index({ user: 1, createdAt: -1 });

// Static method to find transcriptions by user
transcriptionSchema.statics.findByUser = function(userId, options = {}) {
  const { limit = 20, skip = 0, sort = { createdAt: -1 } } = options;
  return this.find({ user: userId })
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .populate('user', 'name email');
};

// Instance method to check if user owns this transcription
transcriptionSchema.methods.isOwnedBy = function(userId) {
  return this.user.toString() === userId.toString();
};

const Transcription = mongoose.model('Transcription', transcriptionSchema);

export default Transcription;
