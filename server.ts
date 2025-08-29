
// FIX: Use default express import to enable qualified type usage (e.g., express.Response) which resolves type errors.
// FIX: Import explicit Request and Response types to resolve type errors.
import express, { type Request, type Response } from 'express';
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
        'http://127.0.0.1:5173'         // For local development (Vite)
    ].filter(Boolean); // Filter out undefined/null values from process.env

    app.use(cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);
            if (allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                console.warn(`CORS blocked for origin: ${origin}`);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
    }));

    // Increase payload size limit for base64 image uploads in JSON bodies
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // API routes
    app.use('/api/auth', authRoutes);
    app.use('/api/ads', adRoutes);
    app.use('/api/gemini', geminiRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/chat', chatRoutes);

    // Serve static files from the React app build directory in production
    // FIX: Changed path resolution to be based on __dirname, which is more reliable.
    // The compiled server.js will be in `backend/dist`, so we go up two levels
    // to the project root and then into the frontend's `dist` folder.
    const frontendBuildPath = path.resolve(__dirname, '../../dist');

    // Check if the build directory exists
    if (fs.existsSync(frontendBuildPath)) {
        console.log("Serving frontend files from:", frontendBuildPath);
        // Handler for the admin panel route must come BEFORE express.static
        // to ensure it's not overridden by the static file server.
        // FIX: Use imported express types to resolve property access errors.
        app.get('/taxaadmin*', (req: Request, res: Response) => {
            res.sendFile(path.resolve(frontendBuildPath, 'admin.html'));
        });

        app.use(express.static(frontendBuildPath));
        
        // The "catchall" handler: for any request that doesn't match one of the above,
        // send back the main index.html file. This is crucial for client-side routing.
        // FIX: Use imported express types to resolve property access errors.
        app.get('*', (req: Request, res: Response) => {
            res.sendFile(path.resolve(frontendBuildPath, 'index.html'));
        });
    } else {
        console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        console.warn("!!! __dirname:", __dirname);
        console.warn("!!! Frontend build directory not found at:", frontendBuildPath);
        console.warn("!!! Make sure you have built the frontend part of the application.");
        console.warn("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    }


    // Use the http server to listen, not the express app, to support WebSockets.
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
    
  } catch (error) {
    console.error("Failed to start server:", error);
    // FIX: Cast process to any to access exit method, avoiding a type error.
    (process as any).exit(1);
  }
};

startServer();
