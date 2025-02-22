/**
 * @description
 * This module defines the API routes for managing prompt templates.
 * It provides CRUD operations for templates, ensuring that only authenticated
 * users can access and modify their own templates. The routes handle the creation,
 * retrieval, updating, and deletion of templates stored in the database.
 * 
 * Key features:
 * - Authentication: All routes are protected and require a valid Clerk authentication token.
 * - Data Validation: Basic validation for required fields in requests.
 * - Database Interactions: Uses PostgreSQL with utility functions from `db.ts`.
 * 
 * @dependencies
 * - express: Web framework for Node.js, used to define routes and handle HTTP requests.
 * - pg: PostgreSQL client for Node.js, used via the `pool` instance from `db.ts`.
 * - @clerk/express: Provides `getAuth` for retrieving authenticated user details.
 * - ../utils/db: Utility function for mapping Clerk user IDs to internal IDs.
 * 
 * @notes
 * - Uses `created_by` to match the `templates` table schema in `001_create_tables.sql`, correcting prior use of `user_id`.
 * - Error handling is basic; further enhancements are planned in later optimization steps (e.g., Step 5).
 * - Assumes Clerk configuration is set up as per Step 4 of the implementation plan.
 */

import express, { Request, Response } from 'express';
import pool from '../config/db';
import { getAuth } from '@clerk/express';
import { getUserIdFromClerk } from '../utils/db';

const router = express.Router();

/**
 * GET /templates
 * Fetches all templates belonging to the authenticated user.
 * 
 * @returns {object[]} Array of template objects.
 * @throws 401 if user is not authenticated.
 * @throws 500 if a database error occurs.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);

    const result = await pool.query(
      'SELECT * FROM templates WHERE created_by = $1',
      [internalUserId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /templates
 * Creates a new template for the authenticated user.
 * 
 * @body {string} name - The name of the template.
 * @body {string} [category] - The category of the template (optional).
 * @body {string} template_text - The text of the template with placeholders.
 * @body {boolean} [is_pinned] - Whether the template is pinned (optional, defaults to false).
 * @returns {object} { id: number } - The ID of the created template.
 * @throws 400 if required fields are missing.
 * @throws 401 if user is not authenticated.
 * @throws 500 if a database error occurs.
 */
router.post('/', async (req: Request, res: Response) => {
  const { name, category, template_text, is_pinned } = req.body;
  if (!name || !template_text) {
    return res.status(400).json({ error: 'Name and template_text are required' });
  }
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);

    const pinned = is_pinned ?? false;
    const result = await pool.query(
      'INSERT INTO templates (created_by, name, category, template_text, is_pinned) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [internalUserId, name, category || null, template_text, pinned]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /templates/:id
 * Updates an existing template, if it belongs to the authenticated user.
 * 
 * @param {string} id - The template ID from the URL parameter.
 * @body {string} name - The updated name of the template.
 * @body {string} [category] - The updated category of the template (optional).
 * @body {string} template_text - The updated text of the template.
 * @body {boolean} [is_pinned] - Whether the template is pinned (optional).
 * @returns {object} { message: string } - Confirmation message.
 * @throws 400 if required fields are missing.
 * @throws 401 if user is not authenticated.
 * @throws 404 if the template is not found or doesn't belong to the user.
 * @throws 500 if a database error occurs.
 */
router.put('/:id', async (req: Request, res: Response) => {
  const { name, category, template_text, is_pinned } = req.body;
  if (!name || !template_text) {
    return res.status(400).json({ error: 'Name and template_text are required' });
  }
  const templateId = req.params.id;
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);

    const checkResult = await pool.query(
      'SELECT id FROM templates WHERE id = $1 AND created_by = $2',
      [templateId, internalUserId]
    );
    if (checkResult.rows.length === 0) return res.status(404).json({ error: 'Template not found' });

    const pinned = is_pinned ?? false;
    await pool.query(
      'UPDATE templates SET name = $1, category = $2, template_text = $3, is_pinned = $4 WHERE id = $5 AND created_by = $6',
      [name, category || null, template_text, pinned, templateId, internalUserId]
    );
    res.status(200).json({ message: 'Template updated' });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /templates/:id
 * Deletes a template, if it belongs to the authenticated user.
 * 
 * @param {string} id - The template ID from the URL parameter.
 * @returns {object} { message: string } - Confirmation message.
 * @throws 401 if user is not authenticated.
 * @throws 404 if the template is not found or doesn't belong to the user.
 * @throws 500 if a database error occurs.
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const templateId = req.params.id;
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);

    const checkResult = await pool.query(
      'SELECT id FROM templates WHERE id = $1 AND created_by = $2',
      [templateId, internalUserId]
    );
    if (checkResult.rows.length === 0) return res.status(404).json({ error: 'Template not found' });

    await pool.query(
      'DELETE FROM templates WHERE id = $1 AND created_by = $2',
      [templateId, internalUserId]
    );
    res.status(200).json({ message: 'Template deleted' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;