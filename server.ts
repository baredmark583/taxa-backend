// FIX: Use `express` default import and qualify types (e.g., `express.Request`) to resolve conflicts with global DOM types.
// FIX: Using named type imports to resolve persistent type resolution issues.
// FIX: Switched to default express import and qualified types to resolve overload and property access errors.
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Added imports for path and url to serve static files.
import path from 'path';
import { fileURLToPath } from 'url';
// Added http and ws imports for WebSocket server setup.
import http from 'http';
import { WebSocketServer } from 'ws';
// Import fs to handle file system operations.
import fs from 'fs';
// Added .js extension to local imports for ES module resolution.
import { initializeDatabase } from './src/db-init.js';
import { handleConnection } from './src/services/websocketService.js';


import authRoutes from './src/routes/auth.js';
import adRoutes from './src/routes/ads.js';
import geminiRoutes from './src/routes/gemini.js';
import adminRoutes from './src/routes/admin.js';
import userRoutes from './src/routes/user.js';
import chatRoutes from './src/routes/chat.js';


dotenv.config();

// FIX: Removed redundant type, `express()` correctly infers the Express app type.
const app = express();
const PORT = process.env.PORT || 3001;

// Enable trusting proxy headers for accurate IP address detection in production
app.set('trust proxy', true);

// Helper constants for file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create an HTTP server from the Express app to share with the WebSocket server.
const server = http.createServer(app);
// Create a WebSocket server and attach it to the HTTP server.
const wss = new WebSocketServer({ server });

// Set up a listener for new WebSocket connections.
wss.on('connection', handleConnection);

const startServer = async () => {
  try {
    // Initialize the database schema before starting the server
    await initializeDatabase();
      
    // A more flexible CORS configuration to handle different environments.
    const allowedOrigins = [
        'https://taxa-5ky4.onrender.com', // The production frontend URL from the logs
        process.env.FRONTEND_URL,       // The configured frontend URL from environment variables
        'http://localhost:5173',        // For local development (Vite)
        'http://127.0.0.1:5173',
    ].filter(Boolean) as string[]; // Removes any falsy values (like undefined process.env.FRONTEND_URL)

    const corsOptions = {
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            // Allow requests with no origin (like mobile apps, curl, Postman)
            // or if the origin is in our whitelist.
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                console.error(`CORS Blocked: Origin ${origin} not in allowedOrigins`);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    };

    app.use(cors(corsOptions));

    // FIX: This call is now correctly typed, resolving the overload error on line 59.
    app.use(express.json({ limit: '10mb' })); // Keep for JSON routes, but file uploads will be handled separately.

    // API routes must be registered before the static file handlers
    app.use('/api/auth', authRoutes);
    app.use('/api/ads', adRoutes);
    app.use('/api/gemini', geminiRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/chat', chatRoutes);

    // --- Static File Serving ---
    // This logic handles serving the frontend application.
    // User uploads are now handled by an external service (Cloudinary).

    // 1. Serve the built frontend application.
    // The frontend build output is expected to be in a `dist` folder at the project root.
    const frontendDistPath = path.join(__dirname, '..', '..', 'dist');
    app.use(express.static(frontendDistPath));

    // 2. SPA Fallback.
    // For any request that doesn't match an API route or a static file,
    // serve the `index.html` file. This is crucial for client-side routing.
    // FIX: Correctly typed handler resolves overload error on line 91 and property access errors within the handler.
    app.get('*', (req: express.Request, res: express.Response) => {
        // Prevent API 404s from being served index.html
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ message: 'API endpoint not found.' });
        }
        const indexPath = path.join(frontendDistPath, 'index.html');
        // Check if index.html exists before sending
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).send('Frontend application not found. Have you run the build script?');
        }
    });
    
    // Start the combined HTTP/WebSocket server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    // FIX: Cast process to `any` to access the `exit` method, avoiding a TypeScript error on line 117.
    (process as any).exit(1);
  }
};

startServer();