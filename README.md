# Speech-to-Text Backend API

A robust Node.js backend API for speech-to-text transcription with user authentication and file management.

## 🚀 Features

- **🔐 JWT Authentication**: Secure user registration and login
- **📁 File Upload**: Handle audio file uploads with validation
- **🎤 Speech Processing**: Integrate with Deepgram API or fallback to mock service
- **👤 User Management**: Profile management with secure data isolation
- **📊 Transcription History**: Store and manage user transcriptions
- **🛡️ Security**: Rate limiting, password hashing, account lockout protection

## 🛠 Technology Stack

- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database with Mongoose ODM
- **JWT** - JSON Web Tokens for authentication
- **Multer** - File upload handling
- **bcryptjs** - Password hashing
- **Deepgram API** - Speech recognition service

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/speech-to-text-backend.git
cd speech-to-text-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Configuration**

Create a `.env` file in the root directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/speech-to-text

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Speech-to-Text API
DEEPGRAM_API_KEY=your-deepgram-api-key

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

4. **Start the server**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/me` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Transcriptions
- `POST /api/transcriptions` - Upload and transcribe audio
- `GET /api/transcriptions` - Get user's transcriptions (paginated)
- `GET /api/transcriptions/:id` - Get specific transcription
- `DELETE /api/transcriptions/:id` - Delete transcription

## 📁 Project Structure

```
speech-to-text-backend/
├── models/
│   ├── User.js              # User schema and methods
│   └── Transcription.js     # Transcription schema
├── routes/
│   ├── auth.js              # Authentication routes
│   └── transcriptions.js    # Transcription routes
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── services/
│   └── speechToText.js      # Speech-to-text service integration
├── utils/
│   └── jwt.js               # JWT utility functions
├── uploads/                 # Uploaded audio files (gitignored)
├── .env                     # Environment variables (create this)
├── .gitignore               # Git ignore file
├── package.json             # Dependencies and scripts
├── server.js                # Main server file
└── README.md                # This file
```

## 🔧 Configuration

### Speech-to-Text Services

The API supports multiple speech-to-text providers:

1. **Deepgram** (Primary)
   - Add `DEEPGRAM_API_KEY` to your `.env` file
   - Sign up at [deepgram.com](https://deepgram.com)

2. **Mock Service** (Fallback)
   - Used automatically when no API key is provided
   - Perfect for development and testing

### File Upload Settings

- **Maximum file size**: 10MB
- **Supported formats**: WAV, MP3, OGG, WebM
- **Storage**: Local filesystem (uploads/ directory)

### Security Features

- **Password Requirements**: Minimum 6 characters
- **Account Lockout**: 5 failed attempts = 2-hour lockout
- **Rate Limiting**: 5 requests per 15 minutes for auth endpoints
- **JWT Expiration**: 15 minutes (configurable)
- **Refresh Tokens**: 7 days (configurable)

## 🚀 Deployment

### Using Vercel (Full-Stack)

1. **Database Setup (MongoDB Atlas)**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a free account and cluster
   - Get your connection string
   - Whitelist all IPs (0.0.0.0/0) for Vercel deployment

2. **Prepare for Vercel Deployment**:
   - Create `vercel.json` configuration file
   - Organize API routes for serverless functions
   - Update CORS configuration for single-domain deployment

3. **Deploy Backend to Vercel**:
   - Push your code to GitHub
   - Go to [Vercel](https://vercel.com)
   - Sign up/login with GitHub
   - Click "New Project" → Import your backend repository
   - Vercel will detect it as a Node.js project

4. **Environment Variables on Vercel**:
   - In the import dialog or project settings, add:
   ```
   NODE_ENV=production
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=your_super_secure_jwt_secret_key_here
   JWT_REFRESH_SECRET=your_super_secure_refresh_secret_key_here
   DEEPGRAM_API_KEY=your_deepgram_api_key
   FRONTEND_URL=https://your-app-name.vercel.app
   ```
   
5. **Vercel Configuration**:
   - Vercel automatically handles serverless function deployment
   - API routes will be available at: `https://your-app-name.vercel.app/api/*`
   - Automatic HTTPS and global CDN included

6. **Post-Deployment**:
   - Your API will be available at: `https://your-backend-app.vercel.app/api`
   - Test all endpoints using the Vercel domain
   - Monitor function logs in Vercel dashboard

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run with coverage
npm run test:coverage
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/yourusername/speech-to-text-backend/issues) page
2. Review the troubleshooting section in the main project README
3. Ensure all environment variables are correctly set
4. Verify MongoDB connection and Node.js version compatibility

## 🔗 Related Projects

- [Speech-to-Text Frontend](https://github.com/yourusername/speech-to-text-frontend) - React frontend application

---

**Built with ❤️ for seamless speech-to-text transcription**