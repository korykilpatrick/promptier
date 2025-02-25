/**
 * @description
 * This module provides utility functions for database operations in the Promptier server.
 * It centralizes common queries (e.g., action ID lookup, user ID mapping) to reduce duplication,
 * improve maintainability, and ensure consistency across the codebase.
 * 
 * Key features:
 * - Action ID Lookup: Retrieves and caches action IDs from the `actions` table.
 * - User ID Mapping: Maps Clerk user IDs to internal `users.id`, creating users as needed.
 * 
 * @dependencies
 * - pg: PostgreSQL client for Node.js, used via the `pool` instance from `db.ts`.
 * 
 * @notes
 * - Action IDs are cached in memory since the `actions` table is populated by migration and unlikely to change at runtime.
 * - User creation is idempotent with `ON CONFLICT DO NOTHING` to handle concurrent requests safely.
 * - Errors are thrown with descriptive messages for callers to handle appropriately.
 * - Assumes the database schema from `001_create_tables.sql` is applied.
 */

import pool from '../config/db.js';

// Cache for action IDs to avoid repeated queries (actions are static post-migration)
const actionIdCache: Map<string, number> = new Map();

/**
 * Retrieves the ID of an action from the `actions` table by its name.
 * 
 * @param {string} actionName - The name of the action (e.g., 'execute_prompt').
 * @returns {Promise<number>} The action's ID.
 * @throws {Error} If the action is not found in the database.
 */
export async function getActionId(actionName: string): Promise<number> {
  // Check cache first
  if (actionIdCache.has(actionName)) {
    return actionIdCache.get(actionName)!;
  }

  // Query the database
  const result = await pool.query(
    'SELECT id FROM actions WHERE name = $1',
    [actionName]
  );

  if (result.rows.length === 0) {
    throw new Error(`Action not found: ${actionName}`);
  }

  const actionId = result.rows[0].id;
  actionIdCache.set(actionName, actionId); // Cache the result
  return actionId;
}

/**
 * Maps a Clerk user ID to an internal `users.id`, creating the user if they don't exist.
 * 
 * @param {string} clerkId - The Clerk user ID from authentication.
 * @returns {Promise<number>} The internal user ID from the `users` table.
 * @throws {Error} If the database query fails unexpectedly.
 */
export async function getUserIdFromClerk(clerkId: string): Promise<number> {
  // Insert the user if they don't exist, then retrieve their ID
  const insertResult = await pool.query(
    'INSERT INTO users (clerk_id) VALUES ($1) ON CONFLICT (clerk_id) DO NOTHING RETURNING id',
    [clerkId]
  );

  if (insertResult.rows.length > 0) {
    return insertResult.rows[0].id; // New user created
  }

  // If no row was returned, the user already exists; fetch their ID
  const selectResult = await pool.query(
    'SELECT id FROM users WHERE clerk_id = $1',
    [clerkId]
  );

  if (selectResult.rows.length === 0) {
    throw new Error(`Unexpected error: Clerk ID ${clerkId} not found after insert`);
  }

  return selectResult.rows[0].id;
}