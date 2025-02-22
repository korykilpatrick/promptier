/**
 * @description
 * Main entry point for the Promptier server, built with Express.js.
 * Integrates Clerk for authentication using `clerkMiddleware` to attach auth
 * data to requests. Provides a public health check and a protected `/api/me`
 * route to test user authentication.
 * 
 * Key features:
 * - Express.js Setup: Handles routing and middleware.
 * - Clerk Authentication: Uses `@clerk/express` for user auth via `clerkMiddleware`.
 * - Health Check: Public endpoint at `/health`.
 * - Protected Route: `/api/me` returns the authenticated user’s ID.
 * 
 * @dependencies
 * - express: Web framework for Node.js.
 * - @clerk/express: Clerk SDK for Express, providing `clerkMiddleware` and `getAuth`.
 * - dotenv: Loads environment variables like `CLERK_SECRET_KEY`.
 * 
 * @notes
 * - Runs on port 3000 or `PORT` env var if set.
 * - Requires `CLERK_SECRET_KEY` in `.env` for Clerk auth.
 * - `req.auth` is typed inline with `SignedInAuthObject` from `@clerk/types`.
 * - Error handling catches auth-related issues with a 401 response.
 */

import 'dotenv/config'; // Must be first import for env vars to load before Clerk
import express, { Request, Response, NextFunction } from 'express';
import { clerkMiddleware, requireAuth, getAuth } from '@clerk/express';


// Initialize Express app
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Apply Clerk middleware to attach auth to all routes
app.use(clerkMiddleware());

// Protected route to test authentication
app.get('/api/me', (req: Request, res: Response) => {
  const { userId } = getAuth(req); // Safely access auth data
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }
  res.json({ userId });
});

// Public health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.send('OK');
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  if (err.message.includes('authentication')) {
    res.status(401).send('Unauthorized');
  } else {
    res.status(500).send('Internal Server Error');
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});