import express from 'express';
import Transcription from '../models/Transcription.js';
import { transcribeAudioFromBuffer } from '../services/speechToText.js';
import { authenticate } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Configure multer for file uploads (scoped to this router)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/webm', 'audio/webm;codecs=opus'];
    // Also allow generic audio type
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

// POST /api/transcriptions - Upload audio and transcribe (authenticated)
router.post('/', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No audio file provided' 
      });
    }

    const { filename, originalname, path: filePath, size, mimetype } = req.file;
    const { source = 'upload', language = 'en-US' } = req.body;
    
    // Validate that the file exists and is accessible
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Uploaded file not found on server'
      });
    }
    
    // Get actual file stats
    const fileStats = fs.statSync(filePath);
    if (fileStats.size === 0) {
      return res.status(400).json({
        success: false,
        message: 'Uploaded file is empty'
      });
    }
    
    // Read file content into memory immediately
    let fileBuffer;
    try {
      fileBuffer = fs.readFileSync(filePath);
    } catch (readError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to read uploaded file'
      });
    }
    
    // Clean up the uploaded file immediately after reading into memory
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupError) {
      console.warn('Failed to clean up uploaded file:', cleanupError.message);
    }
    
    // Set processing status initially
    const transcription = new Transcription({
      user: req.user._id,
      filename,
      originalName: originalname,
      filePath, // We'll keep this for reference but the file is gone
      transcription: '', // Will be updated after processing
      fileSize: size,
      mimeType: mimetype,
      language,
      status: 'processing',
      metadata: {
        source: ['upload', 'recording'].includes(source) ? source : 'upload',
        processingTime: 0
      }
    });

    await transcription.save();
    
    // Process transcription using in-memory file buffer
    const startTime = Date.now();
    const transcriptionResult = await transcribeAudioFromBuffer(fileBuffer, originalname);
    const processingTime = Date.now() - startTime;
    
    if (!transcriptionResult.success) {
      // Update status to failed
      transcription.status = 'failed';
      await transcription.save();
      
      return res.status(500).json({ 
        success: false,
        message: transcriptionResult.error || 'Transcription failed' 
      });
    }

    // Update transcription with results
    transcription.transcription = transcriptionResult.transcription;
    transcription.confidence = transcriptionResult.confidence || 0;
    transcription.duration = transcriptionResult.duration || 0;
    transcription.status = 'completed';
    transcription.metadata.processingTime = processingTime;
    
    await transcription.save();

    res.json({
      success: true,
      data: {
        id: transcription._id,
        transcription: transcriptionResult.transcription,
        confidence: transcriptionResult.confidence,
        duration: transcriptionResult.duration,
        status: 'completed',
        processingTime,
        createdAt: transcription.createdAt
      }
    });

  } catch (error) {
    console.error('Transcription error:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        success: false,
        message: 'File too large. Maximum size is 10MB.' 
      });
    }
    
    // Handle specific error types
    if (error.message && error.message.includes('API key')) {
      return res.status(401).json({ 
        success: false,
        message: 'Speech-to-text service authentication failed. Please contact administrator.' 
      });
    }
    
    if (error.message && (error.message.includes('not found') || error.code === 'ENOENT')) {
      return res.status(404).json({ 
        success: false,
        message: 'Audio file not found. Please try uploading again.' 
      });
    }
    
    // Handle multer errors
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ 
        success: false,
        message: `File upload error: ${error.message}`
      });
    }
    
    // Handle detailed transcription errors
    if (error.name === 'TranscriptionError') {
      return res.status(500).json({ 
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to process audio file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/transcriptions - Get user's transcriptions with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Get user-specific transcriptions
    const transcriptions = await Transcription.findByUser(req.user._id, {
      limit,
      skip,
      sort: { createdAt: -1 }
    }).select('-filePath -user'); // Exclude sensitive fields

    // Get total count for pagination
    const total = await Transcription.countDocuments({ user: req.user._id });
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        transcriptions,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching transcriptions:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch transcriptions' 
    });
  }
});

// GET /api/transcriptions/:id - Get specific transcription (user must own it)
router.get('/:id', async (req, res) => {
  try {
    const transcription = await Transcription.findById(req.params.id)
      .select('-filePath'); // Exclude filePath for security

    if (!transcription) {
      return res.status(404).json({ 
        success: false,
        message: 'Transcription not found' 
      });
    }

    // Check ownership
    if (!transcription.isOwnedBy(req.user._id)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. You can only view your own transcriptions.' 
      });
    }

    res.json({
      success: true,
      data: transcription
    });
  } catch (error) {
    console.error('Error fetching transcription:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch transcription' 
    });
  }
});

// DELETE /api/transcriptions/:id - Delete transcription (user must own it)
router.delete('/:id', async (req, res) => {
  try {
    const transcription = await Transcription.findById(req.params.id);
    
    if (!transcription) {
      return res.status(404).json({ 
        success: false,
        message: 'Transcription not found' 
      });
    }

    // Check ownership
    if (!transcription.isOwnedBy(req.user._id)) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. You can only delete your own transcriptions.' 
      });
    }

    // Delete the file from filesystem if it exists
    if (transcription.filePath && fs.existsSync(transcription.filePath)) {
      try {
        fs.unlinkSync(transcription.filePath);
      } catch (fileError) {
        console.warn('Could not delete file:', fileError.message);
      }
    }

    await Transcription.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true, 
      message: 'Transcription deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting transcription:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete transcription' 
    });
  }
});

export default router;
