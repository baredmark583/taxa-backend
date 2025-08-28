// Use the 'process' global from Node.js, do not import it.
// FIX: Switched to a default express import to avoid conflicts with global DOM types.
// FIX: Use fully-qualified types like express.Request and express.Response to resolve conflicts.
// FIX: Import Request, Response, and NextFunction types explicitly from express to resolve type conflicts.
// FIX: Correctly import Request, Response, and NextFunction types from express to fix handler type issues.
// FIX: Reverting to a default express import and using fully qualified types like express.Request to resolve persistent type conflicts.
// FIX: Using explicit named imports for Request, Response, and NextFunction to resolve persistent type conflicts.
// FIX: Switched to combined default and named imports for express types to resolve type resolution issues.
// FIX: Use a default import for express and qualified types (e.g., express.Request) to resolve type errors.
// FIX: Use both default and named imports to resolve global type conflicts and fix property access errors.
// FIX: Use named imports for express types to resolve type conflicts and property access errors.
// FIX: Use default express import and qualified types like express.Request to resolve all type conflicts.
// FIX: Use named imports for express Request, Response, and NextFunction to resolve type conflicts.
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
      
    // FIX: Configured CORS for a separate frontend deployment.
    // The frontend URL must be set in the .env file or environment variables.
    const corsOptions = {
      origin: process.env.FRONTEND_URL, // e.g., 'https://your-frontend-domain.vercel.app'
      credentials: true,
    };
    app.use(cors(corsOptions));
    // FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
    app.use(express.json({ limit: '10mb' })); // Keep for JSON routes, but file uploads will be handled separately.

    // Ensure the 'uploads' directory exists and serve it statically.
    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });
    app.use('/uploads', express.static(uploadsDir));
    
    // API routes.
    app.use('/api/auth', authRoutes);
    app.use('/api/ads', adRoutes);
    app.use('/api/gemini', geminiRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/user', userRoutes);
    app.use('/api/chat', chatRoutes);
    
    // FIX: Serve static files from the frontend build directory
    // It assumes the frontend is built into a 'dist' folder at the project root.
    const frontendBuildPath = path.join(__dirname, '..', '..', 'dist');
    // FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
    app.use(express.static(frontendBuildPath));

    // FIX: Add a catch-all route to serve index.html for client-side routing.
    // This allows direct navigation to routes like /profile in the browser.
    // FIX: Use explicit express types to resolve overload errors.
    // FIX: Use explicit express types to resolve overload errors.
    // FIX: Use fully-qualified express types to resolve overload errors.
    // FIX: Use explicit Request and Response types from express.
    // FIX: Use explicit Request and Response types from express to resolve property access errors.
    // FIX: Using fully qualified express types to resolve property access and overload errors.
    // FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
    // FIX: Use qualified express types to resolve property access errors.
    // FIX: Use qualified express types to resolve property access errors.
    // FIX: Use named express types to resolve property access errors.
    // FIX: Use qualified express types to resolve property access and overload errors.
    app.get('*', (req: express.Request, res: express.Response) => {
        // Check if the request is for an API route, if so, do not serve index.html
        if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/uploads')) {
            return res.status(404).send('Resource not found');
        }
        
        // If the request has a file extension, it's likely for a static asset
        // that was not found by express.static. In this case, send a 404.
        // This prevents the client-side router's index.html from being sent
        // for missing assets, which causes MIME type errors.
        if (path.extname(req.path)) {
            return res.status(404).send('Resource not found');
        }

        res.sendFile(path.join(frontendBuildPath, 'index.html'));
    });
    
    // Global error handler
    // FIX: Used explicit express types to avoid conflicts with global DOM types and resolve property errors.
    // FIX: Used explicit express types to avoid conflicts with global DOM types and resolve property errors.
    // FIX: Use fully-qualified express types to avoid conflicts with global DOM types.
    // FIX: Use explicit Error, Request, Response, and NextFunction types.
    // FIX: Use explicit Request, Response, and NextFunction types from express to resolve property access errors.
    // FIX: Using fully qualified express types to resolve property access errors.
    // FIX: Use `express` namespace for types to avoid conflicts with global DOM types.
    // FIX: Use qualified express types to resolve property access errors.
    // FIX: Use qualified express types to resolve property access errors.
    // FIX: Use named express types to resolve property access errors.
    // FIX: Use qualified express types to resolve property access and overload errors.
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.error(err.stack);
        res.status(500).send('Something broke!');
    });

    // FIX: Listen on '0.0.0.0' to be accessible in containerized environments like Render.
    // Use the http server to listen, which handles both HTTP and WebSocket traffic.
    server.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch(error) {
    console.error("Failed to start server:", error);
    // FIX: Cast process to any to access exit method, avoiding a type error.
    (process as any).exit(1);
  }
};

startServer();