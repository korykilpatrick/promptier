/**
 * @description
 * This module is the entry point for the Promptier server. It sets up an Express.js
 * application, configures middleware, defines public and protected routes, and
 * starts the server on a specified port. The server handles API requests for
 * managing prompt templates and chains, integrating Clerk for authentication.
 * 
 * Key features:
 * - Middleware: JSON parsing for request bodies and Clerk authentication for protected routes.
 * - Routes: Public health check and protected API endpoints for templates and chains.
 * - Configuration: Uses environment variables for port flexibility.
 * 
 * @dependencies
 * - express: Web framework for Node.js, used to create the server and handle HTTP requests.
 * - @clerk/express: Provides `requireAuth` middleware for authentication.
 * - Local modules: `templates.ts` and `chains.ts` routers for API endpoints.
 * 
 * @notes
 * - The `authMiddleware` is exported for reuse in route definitions, ensuring consistency.
 * - The health check endpoint is public for monitoring purposes; all other routes require authentication.
 * - Assumes Clerk configuration (e.g., secret key) is handled via environment variables as set up in Step 4.
 * - Error handling for server startup is minimal; consider adding in Step 18 if needed.
 */

import expressModule from 'express';
const express = expressModule;
import type { Request, Response } from 'express';
import cors from 'cors';
import templatesRouter from './routes/templates.js';
import chainsRouter from './routes/chains.js';
import { requireAuth } from '@clerk/express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Configure CORS to allow requests from your extension
app.use(cors({
  origin: `chrome-extension://${process.env.EXTENSION_ID}`,
  credentials: true
}));

// Enable JSON body parsing for all requests
app.use(express.json());

// Define authentication middleware using Clerk's requireAuth
export const authMiddleware = requireAuth();

/**
 * GET /health
 * Public endpoint to check server status.
 * 
 * @returns {object} { status: 'ok' } - Indicates the server is running.
 */
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Mount protected routes with authentication middleware
app.use('/templates', authMiddleware, templatesRouter);
app.use('/chains', authMiddleware, chainsRouter);

// Start the server on the specified port (default 3000)
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});