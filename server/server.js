import express, { Router } from "express"
import cors from "cors"
import "dotenv/config"
import { clerkMiddleware, requireAuth } from "@clerk/express"
import aiRouter from "./routes/aiRoutes.js"
import connectCloudinary from "./configs/cloudinary.js"
import userRouter from "./routes/userRoutes.js"
import communityRouter from "./routes/communityRoutes.js"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

// Create uploads directory if it doesn't exist
import fs from "fs"
const uploadsDir = path.join(__dirname, 'uploads')
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
}

// Initialize Cloudinary with error handling
try {
    await connectCloudinary()
    console.log('✅ Cloudinary connected successfully')
} catch (error) {
    console.warn('⚠️ Cloudinary connection failed:', error.message)
    console.warn('⚠️ Image processing features may not work without proper Cloudinary configuration')
}

// Middleware
app.use(cors({
    origin: process.env.CLIENT_URL || "https://quick-ai-client-xi.vercel.app",
    credentials: true
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
app.use(clerkMiddleware())

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.get('/', (req, res) => res.send("Server is live!"))

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'not configured',
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'not configured'
    })
})

// Protected routes
app.use(requireAuth())
app.use('/api/ai', aiRouter)
app.use('/api/user', userRouter)
app.use('/api/community', communityRouter)

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err)
    res.status(500).json({ 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`)
    console.log(`🌐 Health check: http://localhost:${PORT}/health`)
    console.log(`📝 API Documentation: http://localhost:${PORT}/health`)
})
