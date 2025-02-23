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
 * - Type Safety: Uses interfaces from shared types.
 * 
 * @dependencies
 * - express: Web framework for Node.js, used to define routes and handle HTTP requests.
 * - pg: PostgreSQL client for Node.js, used via the `pool` instance from `db.ts`.
 * - @clerk/express: Provides `getAuth` for retrieving authenticated user details.
 * - ../utils/db: Utility function for mapping Clerk user IDs to internal IDs.
 * - shared/types/templates: Type definitions for API data structures.
 * 
 * @notes
 * - Uses `created_by` to match the `templates` table schema in `001_create_tables.sql`.
 * - Responses are typed to ensure consistency with client expectations.
 */

import express, { Request, Response } from 'express';
import pool from '../config/db';
import { getAuth } from '@clerk/express';
import { getUserIdFromClerk } from '../utils/db';
import { 
  TemplateRequest, 
  TemplateResponse,
  BaseTemplate,
  UserTemplate
} from 'shared/types/templates';

const router = express.Router();

/**
 * GET /templates
 * Fetches all templates belonging to the authenticated user.
 * 
 * @returns {SuccessResponse<TemplateResponse[]>} Array of template objects.
 * @throws 401 if user is not authenticated.
 * @throws 500 if a database error occurs.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('Request to /templates:', req.method, req.url, req.headers);
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);

    // Get templates and their favorite status for this user
    const result = await pool.query(
      `SELECT t.*, COALESCE(is_favorite, false) as is_favorite 
       FROM templates t
       LEFT JOIN user_templates ut ON t.id = ut.template_id AND ut.user_id = $1
       WHERE t.created_by = $1`,
      [internalUserId]
    );
    
    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /templates
 * Creates a new template for the authenticated user.
 * 
 * @body {TemplateRequest} - The template data.
 * @returns {SuccessResponse<TemplateResponse>} The created template.
 * @throws 400 if required fields are missing.
 * @throws 401 if user is not authenticated.
 * @throws 500 if a database error occurs.
 */
router.post('/', async (req: Request<{}, {}, TemplateRequest>, res: Response) => {
  const { name, category, template_text } = req.body;
  if (!name || !template_text) {
    return res.status(400).json({ error: 'Name and template_text are required' });
  }
  
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);

    // Create template
    const result = await pool.query(
      'INSERT INTO templates (created_by, name, category, template_text) VALUES ($1, $2, $3, $4) RETURNING *',
      [internalUserId, name, category || null, template_text]
    );

    const template = result.rows[0];
    
    // Return with is_favorite as false since it's a new template
    res.status(201).json({ 
      data: {
        ...template,
        is_favorite: false
      }
    });
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
 * @body {TemplateRequest} - The updated template data.
 * @returns {SuccessResponse<TemplateResponse>} The updated template.
 * @throws 400 if required fields are missing.
 * @throws 401 if user is not authenticated.
 * @throws 404 if the template is not found or doesn't belong to the user.
 * @throws 500 if a database error occurs.
 */
router.put('/:id', async (req: Request<{ id: string }, {}, TemplateRequest & { isFavorite?: boolean }>, res: Response) => {
  const { name, category, template_text, isFavorite } = req.body;
  if (!name || !template_text) {
    return res.status(400).json({ error: 'Name and template_text are required' });
  }
  
  const templateId = parseInt(req.params.id);
  if (isNaN(templateId)) {
    return res.status(400).json({ error: 'Invalid template ID' });
  }

  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if template exists and belongs to user
      const checkResult = await client.query(
        'SELECT id FROM templates WHERE id = $1 AND created_by = $2',
        [templateId, internalUserId]
      );
      
      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Template not found' });
      }

      // Update template
      const updateResult = await client.query(
        'UPDATE templates SET name = $1, category = $2, template_text = $3 WHERE id = $4 AND created_by = $5 RETURNING *',
        [name, category || null, template_text, templateId, internalUserId]
      );

      // Handle favorite status if provided
      if (typeof isFavorite === 'boolean') {
        if (isFavorite) {
          // Upsert user_template with is_favorite = true
          await client.query(
            `INSERT INTO user_templates (user_id, template_id, is_favorite)
             VALUES ($1, $2, true)
             ON CONFLICT (user_id, template_id)
             DO UPDATE SET is_favorite = true`,
            [internalUserId, templateId]
          );
        } else {
          // Update or remove user_template
          await client.query(
            `DELETE FROM user_templates
             WHERE user_id = $1 AND template_id = $2`,
            [internalUserId, templateId]
          );
        }
      }

      await client.query('COMMIT');

      // Return updated template with favorite status
      const template = updateResult.rows[0];
      res.json({ 
        data: {
          ...template,
          is_favorite: isFavorite ?? false
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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
 * @returns {SuccessResponse<never>} Success message.
 * @throws 401 if user is not authenticated.
 * @throws 404 if the template is not found or doesn't belong to the user.
 * @throws 500 if a database error occurs.
 */
router.delete('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const templateId = parseInt(req.params.id);
  if (isNaN(templateId)) {
    return res.status(400).json({ error: 'Invalid template ID' });
  }

  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if template exists and belongs to user
      const checkResult = await client.query(
        'SELECT id FROM templates WHERE id = $1 AND created_by = $2',
        [templateId, internalUserId]
      );
      
      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Template not found' });
      }

      // Delete user_templates entries first (cascade will handle this, but being explicit)
      await client.query(
        'DELETE FROM user_templates WHERE template_id = $1',
        [templateId]
      );

      // Delete template
      await client.query(
        'DELETE FROM templates WHERE id = $1 AND created_by = $2',
        [templateId, internalUserId]
      );

      await client.query('COMMIT');
      res.json({ message: 'Template deleted' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;