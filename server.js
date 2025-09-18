import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import transcriptionRoutes from "./routes/transcriptions.js";
import authRoutes from "./routes/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Configure Express to trust proxy headers (required for Vercel)
// This should be set before any middleware that relies on IP addresses
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy
}

// Middleware
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost')) return callback(null, true);
    
    // Allow Vercel frontend deployments (with dynamic subdomain)
    if (origin.includes('speech-to-text-frontend') && origin.includes('vercel.app')) {
      return callback(null, true);
    }
    
    // Allow specific frontend URL from environment
    if (origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static("uploads"));

// Basic health check route
app.get("/", (req, res) => {
  res.json({ 
    message: "Speech-to-Text Backend API", 
    status: "running",
    timestamp: new Date().toISOString()
  });
});

// Health check with dependencies
app.get("/health", async (req, res) => {
  try {
    // Check MongoDB connection
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : dbState === 0 ? 'disconnected' : dbState === 2 ? 'connecting' : 'disconnecting';
    
    // Check uploads directory
    const uploadsDir = fs.existsSync('./uploads');
    
    // Check environment variables
    const envCheck = {
      DEEPGRAM_API_KEY: !!process.env.DEEPGRAM_API_KEY,
      MONGODB_URI: !!process.env.MONGODB_URI,
      JWT_SECRET: !!process.env.JWT_SECRET,
      FRONTEND_URL: !!process.env.FRONTEND_URL,
      NODE_ENV: process.env.NODE_ENV || 'not set'
    };
    
    // Check if required directories exist
    const directories = {
      uploads: fs.existsSync('./uploads'),
      routes: fs.existsSync('./routes'),
      services: fs.existsSync('./services')
    };
    
    // Check if required modules can be imported
    let modules = {};
    try {
      await import('./models/Transcription.js');
      modules.transcriptionModel = 'loaded';
    } catch (e) {
      modules.transcriptionModel = `error: ${e.message}`;
    }
    
    try {
      await import('./services/speechToText.js');
      modules.speechService = 'loaded';
    } catch (e) {
      modules.speechService = `error: ${e.message}`;
    }
    
    // Check server configuration
    const serverConfig = {
      trustProxy: app.get('trust proxy') || false,
      nodeEnv: process.env.NODE_ENV || 'development'
    };
    
    res.json({ 
      status: "healthy",
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbStatus,
        uploadsDirectory: uploadsDir,
        environment: envCheck,
        directories: directories,
        modules: modules,
        server: serverConfig
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: "unhealthy",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/transcriptions", transcriptionRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  // Handle rate limiting errors
  if (error.code === 'ERR_ERL_UNEXPECTED_X_FORWARDED_FOR' || error.code === 'ERR_ERL_FORWARDED_HEADER') {
    console.warn('Rate limiting proxy header issue (non-critical in Vercel):', error.message);
    // Continue to next middleware instead of failing
    return next();
  }
  
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ error: "File too large. Maximum size is 10MB." });
    }
  }
  
  // Log detailed error information in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  } else {
    // In production, don't expose stack traces
    console.error('Unhandled error:', error.message);
    res.status(500).json({ 
      error: 'Internal server error'
    });
  }
});

// Connect to MongoDB
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/speech-to-text"
  )
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    // In production, you might want to exit the process if MongoDB connection fails
    if (process.env.NODE_ENV === 'production') {
      console.error("Critical: MongoDB connection failed in production. Exiting process.");
      process.exit(1);
    }
  });

// Log environment information
console.log('Environment variables check:', {
  NODE_ENV: process.env.NODE_ENV,
  MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not set',
  JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
  DEEPGRAM_API_KEY: process.env.DEEPGRAM_API_KEY ? 'Set' : 'Not set',
  FRONTEND_URL: process.env.FRONTEND_URL
});

// For Vercel serverless deployment, we don't need to start the server
// app.listen is only used in local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} else {
  console.log(`Server configured for Vercel deployment on port ${PORT}`);
}

// Export for Vercel serverless functions
export default app;
