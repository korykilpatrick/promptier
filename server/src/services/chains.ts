/**
 * @description
 * This module provides a service layer for managing prompt chains and their steps.
 * It encapsulates the business logic for CRUD operations on chains, interacting with
 * the database and providing a clean interface for route handlers. This separation
 * improves modularity, testability, and maintainability.
 * 
 * Key features:
 * - Chain Management: Functions for creating, retrieving, updating, and deleting chains.
 * - Step Management: Handles chain steps as part of chain operations.
 * - Error Handling: Throws specific errors for invalid inputs or permissions.
 * - Type Safety: Uses interfaces from `api.ts` for data structures.
 * - Transactions: Uses database transactions for multi-query operations to ensure atomicity.
 * 
 * @dependencies
 * - pg: PostgreSQL client for Node.js, used via the `pool` instance from `db.ts`.
 * - ../utils/db: Utility functions for action ID lookup and user ID mapping.
 * - ../types/api: Type definitions for API data structures.
 * 
 * @notes
 * - Assumes the database schema from `001_create_tables.sql` is applied.
 * - Steps are replaced entirely on updates for simplicity, consistent with the original implementation.
 * - Transactions are used in `createChain` and `updateChain` to prevent partial commits.
 */

import pool from '../config/db';
import { getActionId } from '../utils/db';
import { ChainStepRequest, ChainResponse } from '../types/api';
import { Client } from 'pg';

/**
 * Retrieves all chains for a user, including their steps.
 * 
 * @param {number} userId - The internal user ID.
 * @returns {Promise<ChainResponse[]>} Array of chains with embedded steps.
 * @throws {Error} If a database error occurs.
 */
export async function getChains(userId: number): Promise<ChainResponse[]> {
  const chainsResult = await pool.query(
    'SELECT * FROM prompt_chains WHERE created_by = $1',
    [userId]
  );
  const chains = chainsResult.rows as ChainResponse[];

  // Fetch steps for each chain
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

  return chains;
}

/**
 * Retrieves a specific chain by ID, if it belongs to the user.
 * 
 * @param {number} chainId - The ID of the chain.
 * @param {number} userId - The internal user ID.
 * @returns {Promise<ChainResponse>} The chain with embedded steps.
 * @throws {Error} 'Chain not found' if the chain doesn’t exist or isn’t owned by the user.
 * @throws {Error} If a database error occurs.
 */
export async function getChain(chainId: number, userId: number): Promise<ChainResponse> {
  const chainResult = await pool.query(
    'SELECT * FROM prompt_chains WHERE id = $1 AND created_by = $2',
    [chainId, userId]
  );
  if (chainResult.rows.length === 0) {
    throw new Error('Chain not found');
  }
  const chain = chainResult.rows[0] as ChainResponse;

  const stepsResult = await pool.query(
    'SELECT s.*, a.name as action ' +
    'FROM chain_steps s ' +
    'JOIN actions a ON s.action_id = a.id ' +
    'WHERE s.chain_id = $1 ' +
    'ORDER BY s.step_order',
    [chainId]
  );
  chain.steps = stepsResult.rows;

  return chain;
}

/**
 * Creates a new chain with its steps for a user within a transaction.
 * 
 * @param {number} userId - The internal user ID.
 * @param {string} name - The name of the chain.
 * @param {ChainStepRequest[]} steps - Array of steps to create.
 * @returns {Promise<number>} The ID of the created chain.
 * @throws {Error} 'Invalid step data' if any step is missing required fields.
 * @throws {Error} 'Action not found: <name>' if an action is invalid.
 * @throws {Error} If a database error occurs (rolls back transaction).
 */
export async function createChain(userId: number, name: string, steps: ChainStepRequest[]): Promise<number> {
  if (!name || !steps || !Array.isArray(steps)) {
    throw new Error('Name and steps array are required');
  }

  const client: Client = await pool.connect();
  try {
    // Start transaction
    await client.query('BEGIN');

    // Insert the chain
    const chainResult = await client.query(
      'INSERT INTO prompt_chains (created_by, name) VALUES ($1, $2) RETURNING id',
      [userId, name]
    );
    const chainId = chainResult.rows[0].id;

    // Insert steps
    for (const step of steps) {
      const { action, data, step_order } = step;
      if (!action || !data || step_order == null) {
        throw new Error('Invalid step data: Each step must have action, data, and step_order');
      }
      const actionId = await getActionId(action);
      await client.query(
        'INSERT INTO chain_steps (chain_id, action_id, data, step_order) VALUES ($1, $2, $3, $4)',
        [chainId, actionId, data, step_order]
      );
    }

    // Commit transaction
    await client.query('COMMIT');
    return chainId;
  } catch (error) {
    // Roll back transaction on error
    await client.query('ROLLBACK');
    throw error; // Re-throw to be handled by the route
  } finally {
    client.release();
  }
}

/**
 * Updates an existing chain’s name and steps within a transaction, if it belongs to the user.
 * 
 * @param {number} chainId - The ID of the chain.
 * @param {number} userId - The internal user ID.
 * @param {string} name - The updated name.
 * @param {ChainStepRequest[]} steps - Array of updated steps.
 * @throws {Error} 'Chain not found' if the chain doesn’t exist or isn’t owned by the user.
 * @throws {Error} 'Invalid step data' if any step is missing required fields.
 * @throws {Error} 'Action not found: <name>' if an action is invalid.
 * @throws {Error} If a database error occurs (rolls back transaction).
 */
export async function updateChain(chainId: number, userId: number, name: string, steps: ChainStepRequest[]): Promise<void> {
  if (!name || !steps || !Array.isArray(steps)) {
    throw new Error('Name and steps array are required');
  }

  const client: Client = await pool.connect();
  try {
    // Start transaction
    await client.query('BEGIN');

    // Verify chain ownership
    const checkResult = await client.query(
      'SELECT id FROM prompt_chains WHERE id = $1 AND created_by = $2',
      [chainId, userId]
    );
    if (checkResult.rows.length === 0) {
      throw new Error('Chain not found');
    }

    // Update chain name
    await client.query(
      'UPDATE prompt_chains SET name = $1 WHERE id = $2',
      [name, chainId]
    );

    // Delete existing steps
    await client.query(
      'DELETE FROM chain_steps WHERE chain_id = $1',
      [chainId]
    );

    // Insert new steps
    for (const step of steps) {
      const { action, data, step_order } = step;
      if (!action || !data || step_order == null) {
        throw new Error('Invalid step data: Each step must have action, data, and step_order');
      }
      const actionId = await getActionId(action);
      await client.query(
        'INSERT INTO chain_steps (chain_id, action_id, data, step_order) VALUES ($1, $2, $3, $4)',
        [chainId, actionId, data, step_order]
      );
    }

    // Commit transaction
    await client.query('COMMIT');
  } catch (error) {
    // Roll back transaction on error
    await client.query('ROLLBACK');
    throw error; // Re-throw to be handled by the route
  } finally {
    client.release();
  }
}

/**
 * Deletes a chain and its steps, if it belongs to the user.
 * 
 * @param {number} chainId - The ID of the chain.
 * @param {number} userId - The internal user ID.
 * @throws {Error} 'Chain not found' if the chain doesn’t exist or isn’t owned by the user.
 * @throws {Error} If a database error occurs.
 */
export async function deleteChain(chainId: number, userId: number): Promise<void> {
  const checkResult = await pool.query(
    'SELECT id FROM prompt_chains WHERE id = $1 AND created_by = $2',
    [chainId, userId]
  );
  if (checkResult.rows.length === 0) {
    throw new Error('Chain not found');
  }

  // Delete steps (ON DELETE CASCADE would handle this, but explicit for clarity)
  await pool.query(
    'DELETE FROM chain_steps WHERE chain_id = $1',
    [chainId]
  );

  // Delete chain
  await pool.query(
    'DELETE FROM prompt_chains WHERE id = $1',
    [chainId]
  );
}