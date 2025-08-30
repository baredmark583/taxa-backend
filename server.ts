



// Added http and ws imports for WebSocket server setup.
import http from 'http';
import { WebSocketServer } from 'ws';

// Added .js extension to local imports for ES module resolution.
import { initializeDatabase } from './src/db-init.js';
import { handleConnection } from './src/services/websocketService.js';
import { log } from './src/utils/logger.js';
// FIX: Use a single default import for express to avoid type conflicts.
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

// Create an HTTP server from the Express app to share with the WebSocket server.
const server = http.createServer(app);
// Create a WebSocket server and attach it to the HTTP server.
const wss = new WebSocketServer({ server });

// Set up a listener for new WebSocket connections.
wss.on('connection', handleConnection);

// --- Middleware for Request Logging ---
// FIX: Use qualified express types to resolve property access errors.
// FIX: Use qualified express types (express.Request, express.Response) to resolve property access errors.
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
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
    // FIX: Simplified to a direct array for better reliability in proxy environments like Render.
    const allowedOrigins = [
        'https://taxa-5ky4.onrender.com', // The production frontend URL from the logs
        'http://localhost:5173',        // For local development (Vite)
        'http://127.0.0.1:5173'         // For local development (Vite)
    ];

    app.use(cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl) and requests from allowed origins.
            // This is more robust for environments like Render that might use health checks without an origin header.
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                log.error('CORS', `Request from origin ${origin} was blocked by CORS policy.`);
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
    
    // --- Global Error Handling Middleware ---
    // This MUST be the last `app.use()` call.
    // FIX: Use qualified express types to resolve property access errors.
    // FIX: Use qualified express types (express.Request, express.Response) to resolve property access errors.
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
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