/**
 * @description
 * This module defines the API routes for managing prompt chains and their steps.
 * It provides CRUD operations for prompt chains, ensuring that only authenticated
 * users can access and modify their own chains. The routes handle the creation,
 * retrieval, updating, and deletion of prompt chains, including their associated steps.
 * 
 * Key features:
 * - Authentication: All routes are protected and require a valid Clerk authentication token.
 * - Data Validation: Basic validation for required fields in requests.
 * - Database Interactions: Uses PostgreSQL with utility functions from `db.ts`.
 * - Action Mapping: Uses `getActionId` to convert action names to IDs.
 * 
 * @dependencies
 * - express: Web framework for Node.js, used to define routes and handle HTTP requests.
 * - pg: PostgreSQL client for Node.js, used via the `pool` instance from `db.ts`.
 * - @clerk/express: Provides `getAuth` for retrieving authenticated user details.
 * - ../utils/db: Utility functions for database operations.
 * 
 * @notes
 * - Uses `created_by` to match the `prompt_chains` table schema in `001_create_tables.sql`.
 * - Steps are replaced entirely on updates for simplicity; future iterations could support partial updates.
 * - Error handling leverages utility-thrown errors for specific cases (e.g., invalid action).
 */

import express, { Request, Response } from 'express';
import pool from '../config/db';
import { getAuth } from '@clerk/express';
import { getActionId, getUserIdFromClerk } from '../utils/db';

const router = express.Router();

/**
 * GET /chains
 * Fetches all prompt chains belonging to the authenticated user, including their steps.
 * 
 * @returns {object[]} Array of chains, each with an embedded `steps` array.
 * @throws 401 if user is not authenticated.
 * @throws 500 if a database error occurs.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);

    // Fetch all chains for the user
    const chainsResult = await pool.query(
      'SELECT * FROM prompt_chains WHERE created_by = $1',
      [internalUserId]
    );
    const chains = chainsResult.rows;

    // For each chain, fetch its steps and include the action name
    for (const chain of chains) {
      const stepsResult = await pool.query(
        'SELECT s.*, a.name as action ' +
        'FROM chain_steps s ' +
        'JOIN actions a ON s.action_id = a.id ' +
        'WHERE s.chain_id = $1 ' +
        'ORDER BY s.step_order',
        [chain.id]
      );
      chain.steps = stepsResult.rows;
    }

    res.json(chains);
  } catch (error) {
    console.error('Error fetching chains:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /chains/:id
 * Fetches a specific prompt chain by ID, including its steps, if it belongs to the authenticated user.
 * 
 * @param {string} id - The chain ID from the URL parameter.
 * @returns {object} The chain object with an embedded `steps` array.
 * @throws 401 if user is not authenticated.
 * @throws 404 if the chain is not found or doesn't belong to the user.
 * @throws 500 if a database error occurs.
 */
router.get('/:id', async (req: Request, res: Response) => {
  const chainId = req.params.id;
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);

    // Fetch the chain, ensuring it belongs to the user
    const chainResult = await pool.query(
      'SELECT * FROM prompt_chains WHERE id = $1 AND created_by = $2',
      [chainId, internalUserId]
    );
    if (chainResult.rows.length === 0) return res.status(404).json({ error: 'Chain not found' });

    const chain = chainResult.rows[0];

    // Fetch the chain's steps with action names
    const stepsResult = await pool.query(
      'SELECT s.*, a.name as action ' +
        'FROM chain_steps s ' +
        'JOIN actions a ON s.action_id = a.id ' +
        'WHERE s.chain_id = $1 ' +
        'ORDER BY s.step_order',
        [chainId]
    );
    chain.steps = stepsResult.rows;

    res.json(chain);
  } catch (error) {
    console.error('Error fetching chain:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /chains
 * Creates a new prompt chain with its steps for the authenticated user.
 * 
 * @body {string} name - The name of the chain.
 * @body {object[]} steps - Array of steps, each with `action`, `data`, and `step_order`.
 * @returns {object} { id: number } - The ID of the created chain.
 * @throws 400 if required fields are missing or invalid.
 * @throws 401 if user is not authenticated.
 * @throws 500 if a database error occurs.
 */
router.post('/', async (req: Request, res: Response) => {
  const { name, steps } = req.body;
  if (!name || !steps || !Array.isArray(steps)) {
    return res.status(400).json({ error: 'Name and steps array are required' });
  }
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);

    // Insert the chain into prompt_chains
    const chainResult = await pool.query(
      'INSERT INTO prompt_chains (created_by, name) VALUES ($1, $2) RETURNING id',
      [internalUserId, name]
    );
    const chainId = chainResult.rows[0].id;

    // Insert each step, using getActionId to convert action name to action_id
    for (const step of steps) {
      const { action, data, step_order } = step;
      if (!action || !data || step_order == null) {
        return res.status(400).json({ error: 'Each step must have action, data, and step_order' });
      }
      const actionId = await getActionId(action); // Throws if action is invalid
      await pool.query(
        'INSERT INTO chain_steps (chain_id, action_id, data, step_order) VALUES ($1, $2, $3, $4)',
        [chainId, actionId, data, step_order]
      );
    }

    res.status(201).json({ id: chainId });
  } catch (error: any) {
    console.error('Error creating chain:', error);
    if (error.message.includes('Action not found')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /chains/:id
 * Updates an existing prompt chain's name and replaces its steps, if it belongs to the authenticated user.
 * 
 * @param {string} id - The chain ID from the URL parameter.
 * @body {string} name - The updated name of the chain.
 * @body {object[]} steps - Array of updated steps, each with `action`, `data`, and `step_order`.
 * @returns {object} { message: string } - Confirmation message.
 * @throws 400 if required fields are missing or invalid.
 * @throws 401 if user is not authenticated.
 * @throws 404 if the chain is not found or doesn't belong to the user.
 * @throws 500 if a database error occurs.
 */
router.put('/:id', async (req: Request, res: Response) => {
  const chainId = req.params.id;
  const { name, steps } = req.body;
  if (!name || !steps || !Array.isArray(steps)) {
    return res.status(400).json({ error: 'Name and steps array are required' });
  }
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);

    // Verify the chain exists and belongs to the user
    const checkResult = await pool.query(
      'SELECT id FROM prompt_chains WHERE id = $1 AND created_by = $2',
      [chainId, internalUserId]
    );
    if (checkResult.rows.length === 0) return res.status(404).json({ error: 'Chain not found' });

    // Update the chain name
    await pool.query(
      'UPDATE prompt_chains SET name = $1 WHERE id = $2',
      [name, chainId]
    );

    // Delete existing steps
    await pool.query(
      'DELETE FROM chain_steps WHERE chain_id = $1',
      [chainId]
    );

    // Insert new steps, using getActionId to convert action name to action_id
    for (const step of steps) {
      const { action, data, step_order } = step;
      if (!action || !data || step_order == null) {
        return res.status(400).json({ error: 'Each step must have action, data, and step_order' });
      }
      const actionId = await getActionId(action); // Throws if action is invalid
      await pool.query(
        'INSERT INTO chain_steps (chain_id, action_id, data, step_order) VALUES ($1, $2, $3, $4)',
        [chainId, actionId, data, step_order]
      );
    }

    res.status(200).json({ message: 'Chain updated' });
  } catch (error: any) {
    console.error('Error updating chain:', error);
    if (error.message.includes('Action not found')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /chains/:id
 * Deletes a prompt chain and its steps, if it belongs to the authenticated user.
 * 
 * @param {string} id - The chain ID from the URL parameter.
 * @returns {object} { message: string } - Confirmation message.
 * @throws 401 if user is not authenticated.
 * @throws 404 if the chain is not found or doesn't belong to the user.
 * @throws 500 if a database error occurs.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const chainId = req.params.id;
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);

    // Verify the chain exists and belongs to the user
    const checkResult = await pool.query(
      'SELECT id FROM prompt_chains WHERE id = $1 AND created_by = $2',
      [chainId, internalUserId]
    );
    if (checkResult.rows.length === 0) return res.status(404).json({ error: 'Chain not found' });

    // Delete the chain's steps (ON DELETE CASCADE would handle this, but explicit for clarity)
    await pool.query(
      'DELETE FROM chain_steps WHERE chain_id = $1',
      [chainId]
    );

    // Delete the chain
    await pool.query(
      'DELETE FROM prompt_chains WHERE id = $1',
      [chainId]
    );

    res.status(200).json({ message: 'Chain deleted' });
  } catch (error) {
    console.error('Error deleting chain:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;