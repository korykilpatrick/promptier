/**
 * @description
 * This module defines the API routes for managing prompt chains and their steps.
 * It provides CRUD operations for prompt chains, ensuring that only authenticated
 * users can access and modify their own chains. The business logic is delegated to
 * the service layer in `chains.ts`, keeping route handlers focused on HTTP concerns.
 * 
 * Key features:
 * - Authentication: All routes are protected and require a valid Clerk authentication token.
 * - Data Validation: Handled by the service layer, with errors mapped to HTTP responses.
 * - Service Integration: Uses `chains.ts` for all chain-related operations.
 * - Type Safety: Uses interfaces from `api.ts` for request and response data.
 * 
 * @dependencies
 * - express: Web framework for Node.js, used to define routes and handle HTTP requests.
 * - @clerk/express: Provides `getAuth` for retrieving authenticated user details.
 * - ../utils/db: Utility function for mapping Clerk user IDs to internal IDs.
 * - ../services/chains: Service layer for chain operations.
 * - ../types/api: Type definitions for API data structures.
 * 
 * @notes
 * - Routes assume the service layer handles database interactions and validation.
 * - Responses are typed to ensure consistency with client expectations.
 */

import expressModule from 'express';
const express = expressModule;
import type { Request, Response } from 'express';
import { getAuth } from '@clerk/express';
import { getUserIdFromClerk } from '../utils/db.js';
import { 
  getChains, 
  getChain, 
  createChain, 
  updateChain, 
  deleteChain 
} from '../services/chains';
import { 
  ChainRequest, 
  ChainResponse, 
  SuccessResponse, 
  ErrorResponse 
} from '../types/api';

const router = express.Router();

/**
 * GET /chains
 * Fetches all prompt chains belonging to the authenticated user, including their steps.
 * 
 * @returns {SuccessResponse<ChainResponse[]>} Array of chains with embedded steps.
 * @throws 401 if user is not authenticated.
 * @throws 500 if a database error occurs.
 */
router.get('/', async (req: Request, res: Response<SuccessResponse<ChainResponse[]> | ErrorResponse>) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);
    const chains = await getChains(internalUserId);
    res.json({ data: chains });
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
 * @returns {SuccessResponse<ChainResponse>} The chain object with embedded steps.
 * @throws 401 if user is not authenticated.
 * @throws 404 if the chain is not found or doesn't belong to the user.
 * @throws 500 if a database error occurs.
 */
router.get('/:id', async (req: Request, res: Response<SuccessResponse<ChainResponse> | ErrorResponse>) => {
  const chainId = parseInt(req.params.id, 10);
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);
    const chain = await getChain(chainId, internalUserId);
    res.json({ data: chain });
  } catch (error: any) {
    console.error('Error fetching chain:', error);
    if (error.message === 'Chain not found') {
      return res.status(404).json({ error: 'Chain not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /chains
 * Creates a new prompt chain with its steps for the authenticated user.
 * 
 * @body {ChainRequest} - The chain data including name and steps.
 * @returns {SuccessResponse<never>} { id: number } - The ID of the created chain.
 * @throws 400 if required fields are missing or invalid.
 * @throws 401 if user is not authenticated.
 * @throws 500 if a database error occurs.
 */
router.post('/', async (req: Request<{}, {}, ChainRequest>, res: Response<SuccessResponse<never> | ErrorResponse>) => {
  const { name, steps } = req.body;
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);
    const chainId = await createChain(internalUserId, name, steps);
    res.status(201).json({ id: chainId });
  } catch (error: any) {
    console.error('Error creating chain:', error);
    if (error.message.includes('required') || error.message.includes('Invalid step data')) {
      return res.status(400).json({ error: error.message });
    }
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
 * @body {ChainRequest} - The updated chain data including name and steps.
 * @returns {SuccessResponse<never>} { message: string } - Confirmation message.
 * @throws 400 if required fields are missing or invalid.
 * @throws 401 if user is not authenticated.
 * @throws 404 if the chain is not found or doesn't belong to the user.
 * @throws 500 if a database error occurs.
 */
router.put('/:id', async (req: Request<{ id: string }, {}, ChainRequest>, res: Response<SuccessResponse<never> | ErrorResponse>) => {
  const chainId = parseInt(req.params.id, 10);
  const { name, steps } = req.body;
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);
    await updateChain(chainId, internalUserId, name, steps);
    res.status(200).json({ message: 'Chain updated' });
  } catch (error: any) {
    console.error('Error updating chain:', error);
    if (error.message.includes('required') || error.message.includes('Invalid step data')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message.includes('Action not found')) {
      return res.status(400).json({ error: error.message });
    }
    if (error.message === 'Chain not found') {
      return res.status(404).json({ error: 'Chain not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /chains/:id
 * Deletes a prompt chain and its steps, if it belongs to the authenticated user.
 * 
 * @param {string} id - The chain ID from the URL parameter.
 * @returns {SuccessResponse<never>} { message: string } - Confirmation message.
 * @throws 401 if user is not authenticated.
 * @throws 404 if the chain is not found or doesn't belong to the user.
 * @throws 500 if a database error occurs.
 */
router.delete('/:id', async (req: Request<{ id: string }>, res: Response<SuccessResponse<never> | ErrorResponse>) => {
  const chainId = parseInt(req.params.id, 10);
  try {
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

    const internalUserId = await getUserIdFromClerk(userId);
    await deleteChain(chainId, internalUserId);
    res.status(200).json({ message: 'Chain deleted' });
  } catch (error: any) {
    console.error('Error deleting chain:', error);
    if (error.message === 'Chain not found') {
      return res.status(404).json({ error: 'Chain not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;