import expressModule from 'express';
const express = expressModule;
import type { Request, Response } from 'express';
import pool from '../config/db.js';
import { getAuth } from '@clerk/express';
import { getUserIdFromClerk } from '../utils/db.js';
import { 
  TemplateRequest, 
  TemplateResponse,
  BaseTemplate,
  UserTemplate
} from '../../../shared/types/templates.js';

const router = express.Router();

// GET /templates
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('Request to /templates:', req.method, req.url, req.headers);
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);
    console.log('Internal user ID:', internalUserId);

    // Get templates and their favorite status for this user
    const result = await pool.query(
      `SELECT t.*, COALESCE(ut.is_favorite, false) as is_favorite 
       FROM templates t
       LEFT JOIN user_templates ut ON t.id = ut.template_id AND ut.user_id = $1
       WHERE t.created_by = $1`,
      [internalUserId]
    );
    
    console.log('Templates found:', result.rows);
    
    // Transform rows to match TemplateResponse type
    const templates = result.rows.map(row => ({
      id: row.id,
      created_by: row.created_by,
      name: row.name,
      category: row.category,
      template_text: row.template_text,
      is_favorite: row.is_favorite,
      created_at: row.created_at
    }));

    console.log('Transformed templates:', templates);
    res.json({ data: templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /templates
router.post('/', async (req: Request<{}, {}, TemplateRequest>, res: Response) => {
    const { name, category, template_text } = req.body;
    if (!name || !template_text) {
      return res.status(400).json({ error: 'Name and template_text are required' });
    }
    
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ error: 'Unauthenticated' });
  
      const internalUserId = await getUserIdFromClerk(userId);
  
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
  
        // Create template
        const templateResult = await client.query(
          'INSERT INTO templates (created_by, name, category, template_text) VALUES ($1, $2, $3, $4) RETURNING *',
          [internalUserId, name, category || null, template_text]
        );
        const template = templateResult.rows[0];
  
        // Create user_template entry with is_favorite = false
        await client.query(
          'INSERT INTO user_templates (user_id, template_id, is_favorite) VALUES ($1, $2, $3)',
          [internalUserId, template.id, false]
        );
  
        await client.query('COMMIT');
  
        res.status(201).json({ 
          data: {
            ...template,
            is_favorite: false
          }
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /templates/:id
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

// DELETE /templates/:id
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

      // Check if the user is associated with the template
      const checkResult = await client.query(
        'SELECT 1 FROM user_templates WHERE user_id = $1 AND template_id = $2',
        [internalUserId, templateId]
      );
      
      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Template not found in your list' });
      }

      // Delete the user's association with the template
      await client.query(
        'DELETE FROM user_templates WHERE user_id = $1 AND template_id = $2',
        [internalUserId, templateId]
      );

      // Check if there are any remaining associations for this template
      const countResult = await client.query(
        'SELECT COUNT(*) FROM user_templates WHERE template_id = $1',
        [templateId]
      );
      const remainingCount = parseInt(countResult.rows[0].count);

      if (remainingCount === 0) {
        // Delete the template since no users are associated with it
        await client.query(
          'DELETE FROM templates WHERE id = $1',
          [templateId]
        );
      }

      await client.query('COMMIT');
      res.json({ message: 'Template removed from your list' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error removing template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;