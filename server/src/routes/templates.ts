// server/src/routes/templates.ts
import express, { Request, Response } from 'express';
import pool from '../config/db';
import { getAuth } from '@clerk/express';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const result = await pool.query('SELECT * FROM templates WHERE created_by = $1', [userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { name, category, template_text, is_pinned } = req.body;
  if (!name || !template_text) {
    return res.status(400).json({ error: 'Name and template_text are required' });
  }
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const pinned = is_pinned ?? false;
    const result = await pool.query(
      'INSERT INTO templates (created_by, name, category, template_text, is_pinned) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [userId, name, category || null, template_text, pinned]
    );
    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const { name, category, template_text, is_pinned } = req.body;
  if (!name || !template_text) {
    return res.status(400).json({ error: 'Name and template_text are required' });
  }
  const templateId = req.params.id;
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const checkResult = await pool.query(
      'SELECT id FROM templates WHERE id = $1 AND created_by = $2',
      [templateId, userId]
    );
    if (checkResult.rows.length === 0) return res.status(404).json({ error: 'Template not found' });

    const pinned = is_pinned ?? false;
    await pool.query(
      'UPDATE templates SET name = $1, category = $2, template_text = $3, is_pinned = $4 WHERE id = $5 AND created_by = $6',
      [name, category || null, template_text, pinned, templateId, userId]
    );
    res.status(200).json({ message: 'Template updated' });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const templateId = req.params.id;
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const checkResult = await pool.query(
      'SELECT id FROM templates WHERE id = $1 AND created_by = $2',
      [templateId, userId]
    );
    if (checkResult.rows.length === 0) return res.status(404).json({ error: 'Template not found' });

    await pool.query('DELETE FROM templates WHERE id = $1 AND created_by = $2', [templateId, userId]);
    res.status(200).json({ message: 'Template deleted' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
