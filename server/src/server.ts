// server/src/server.ts
import express, { Request, Response } from 'express';
import templatesRouter from './routes/templates';
import { requireAuth } from '@clerk/express';

const app = express();

app.use(express.json());

export const authMiddleware = requireAuth();

// Public health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Use Clerk's requireAuth middleware on protected routes
app.use('/templates', authMiddleware, templatesRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
