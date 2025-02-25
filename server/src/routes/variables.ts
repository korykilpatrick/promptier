import expressModule from 'express';
const express = expressModule;
import type { Request, Response } from 'express';
import pool from '../config/db.js';
import { getAuth } from '@clerk/express';
import { getUserIdFromClerk } from '../utils/db.js';

const router = express.Router();

/**
 * GET /variables
 * 
 * Get all user variables
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);

    const result = await pool.query(
      `SELECT id, name, value, created_at, updated_at 
       FROM user_variables 
       WHERE user_id = $1
       ORDER BY name ASC`,
      [internalUserId]
    );
    
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching user variables:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /variables
 * 
 * Create a new user variable
 */
router.post('/', async (req: Request<{}, {}, { name: string, value: string }>, res: Response) => {
  const { name, value } = req.body;
  
  if (!name || value === undefined) {
    return res.status(400).json({ error: 'Name and value are required' });
  }
  
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);

    // Create or update the variable
    const result = await pool.query(
      `INSERT INTO user_variables (user_id, name, value, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, name)
       DO UPDATE SET value = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [internalUserId, name, value]
    );
    
    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error creating/updating user variable:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /variables/:id
 * 
 * Update an existing user variable
 */
router.put('/:id', async (req: Request<{ id: string }, {}, { name: string, value: string }>, res: Response) => {
  const { name, value } = req.body;
  const variableId = parseInt(req.params.id);
  
  if (isNaN(variableId)) {
    return res.status(400).json({ error: 'Invalid variable ID' });
  }
  
  if (!name || value === undefined) {
    return res.status(400).json({ error: 'Name and value are required' });
  }
  
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);

    // Update the variable
    const result = await pool.query(
      `UPDATE user_variables 
       SET name = $1, value = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [name, value, variableId, internalUserId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Variable not found' });
    }
    
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error updating user variable:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /variables/:id
 * 
 * Delete a user variable
 */
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const variableId = parseInt(req.params.id);
  
  if (isNaN(variableId)) {
    return res.status(400).json({ error: 'Invalid variable ID' });
  }
  
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);

    // Delete the variable
    const result = await pool.query(
      `DELETE FROM user_variables 
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [variableId, internalUserId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Variable not found' });
    }
    
    res.json({ message: 'Variable deleted successfully' });
  } catch (error) {
    console.error('Error deleting user variable:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /variables/by-name/:name
 * 
 * Get a user variable by name
 */
router.get('/by-name/:name', async (req: Request<{ name: string }>, res: Response) => {
  const { name } = req.params;
  
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);

    const result = await pool.query(
      `SELECT id, name, value, created_at, updated_at 
       FROM user_variables 
       WHERE user_id = $1 AND name = $2`,
      [internalUserId, name]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Variable not found' });
    }
    
    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching user variable by name:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 