
// FIX: Use default express import to resolve type errors.
// FIX: Reverted to using qualified express types (e.g., express.Request) to resolve widespread property access errors caused by potential type conflicts.
// FIX: Import Request, Response, and NextFunction directly from express to fix type errors.
import express, { type Request, type Response, type NextFunction } from 'express';
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
import { log } from './src/utils/logger.js';


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

// --- Middleware for Request Logging ---
// FIX: Using express.Request and express.Response to resolve type conflicts
// FIX: Use express.Request, express.Response, and express.NextFunction to resolve type errors.
// FIX: Use qualified express types to resolve property access errors.
// FIX: Use direct Request, Response, and NextFunction types.
app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const { method, url, ip } = req;
    log.info('Request', `--> ${method} ${url}`, { ip, headers: req.headers });

    res.on('finish', () => {
        const duration = Date.now() - start;
        log.info('Request', `<-- ${method} ${url} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});


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
                log.info('CORS', `Blocked origin: ${origin}`);
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
    
    // --- Serve Frontend Static Files ---
    // Path is relative from `backend/dist/server.js` to the frontend build output `frontend/dist`.
    // In a typical monorepo setup, you'd adjust your build scripts to place this output correctly.
    // We assume the frontend is built into a directory that becomes `../public` relative to the running server script.
    const publicPath = path.join(__dirname, '..', 'public');

    if (fs.existsSync(publicPath)) {
        log.info('Server', `Serving static files from: ${publicPath}`);
        app.use(express.static(publicPath));

        // --- Handle Client-Side Routing ---
        // This catch-all route must be defined *after* API routes and static middleware.
        // FIX: Use express.Request, express.Response, and express.NextFunction to resolve type errors.
        // FIX: Use qualified express types to resolve property access errors.
        // FIX: Use direct Request, Response, and NextFunction types.
        app.get('*', (req: Request, res: Response, next: NextFunction) => {
            // Safeguard to ensure API calls are not caught here
            if (req.path.startsWith('/api/')) {
                return next();
            }
            
            // If the request path is for the admin panel, serve its dedicated HTML file.
            // Vite builds this from admin.html to taxaadmin.html.
            if (req.path.startsWith('/taxaadmin')) {
                res.sendFile(path.join(publicPath, 'taxaadmin.html'));
            } else {
                // For all other client-side routes, serve the main application's HTML file.
                res.sendFile(path.join(publicPath, 'index.html'));
            }
        });
    } else {
        log.info('Server', `Static frontend directory not found at ${publicPath}. Running in API-only mode.`);
    }


    // --- Global Error Handling Middleware ---
    // This MUST be the last `app.use()` call.
    // FIX: Use qualified express types to resolve property access errors.
    // FIX: Using express.Request and express.Response to resolve type conflicts
    // FIX: Use express.Request, express.Response, and express.NextFunction to resolve type errors.
    // FIX: Use qualified express types to resolve property access errors.
    // FIX: Use direct Request, Response, and NextFunction types.
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      log.error('UnhandledError', `An error occurred for request ${req.method} ${req.originalUrl}`, err);
      // Avoid sending stack trace to client in production
      const errorMessage = process.env.NODE_ENV === 'production' 
          ? 'An internal server error occurred.' 
          : err.stack;
      res.status(500).json({ message: 'Something broke!', error: errorMessage });
    });


    // Use the http server to listen, not the express app, to support WebSockets.
    server.listen(PORT, () => {
      log.info('Server', `Server is running and listening on port ${PORT}`);
    });
    
  } catch (error) {
    log.error("Server Startup", "Failed to start server:", error);
    // FIX: Cast process to any to access exit method, avoiding a type error.
    (process as any).exit(1);
  }
};

startServer();