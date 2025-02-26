/**
 * Core functionality for batch operations
 */
import { BatchOperation, BatchResult, BatchOptions } from './types';
import * as Errors from '../errors';

/**
 * Execute a batch of operations with proper error handling and concurrency
 * 
 * @param operations - Array of operations to execute
 * @param options - Options for batch execution
 * @returns Promise resolving to batch operation results
 */
export async function executeBatch<T>(
  operations: BatchOperation<T>[],
  options: BatchOptions = {}
): Promise<BatchResult<T>> {
  const {
    continueOnError = false,
    maxConcurrent = 0, // 0 means no limit
    onProgress,
    verifyPermissions = true
  } = options;
  
  const results: T[] = [];
  const failedOperations: { index: number; error: Error }[] = [];
  let completed = 0;
  
  if (operations.length === 0) {
    return { success: true, results, failedOperations };
  }
  
  // Helper function to update progress
  const updateProgress = () => {
    if (onProgress) {
      onProgress({
        completed,
        total: operations.length,
        percentage: Math.round((completed / operations.length) * 100)
      });
    }
  };
  
  try {
    // If maxConcurrent is 0 or 1, or there's only one operation, run sequentially
    if (maxConcurrent === 1 || maxConcurrent === 0 && operations.length === 1) {
      for (let i = 0; i < operations.length; i++) {
        try {
          const result = await operations[i]();
          results.push(result);
        } catch (error) {
          failedOperations.push({ 
            index: i, 
            error: Errors.toFileSystemError(error) 
          });
          
          if (!continueOnError) {
            break;
          }
        } finally {
          completed++;
          updateProgress();
        }
      }
    } else {
      // Run concurrently with controlled concurrency
      const inProgress = new Set<number>();
      let nextIndex = 0;
      
      const executeNext = async () => {
        if (nextIndex >= operations.length) return;
        
        const currentIndex = nextIndex++;
        inProgress.add(currentIndex);
        
        try {
          const result = await operations[currentIndex]();
          results[currentIndex] = result;
        } catch (error) {
          failedOperations.push({
            index: currentIndex,
            error: Errors.toFileSystemError(error)
          });
          
          if (!continueOnError) {
            nextIndex = operations.length; // Stop executing new operations
          }
        } finally {
          inProgress.delete(currentIndex);
          completed++;
          updateProgress();
          
          // If we should continue and there are operations left, execute the next one
          if (nextIndex < operations.length && (continueOnError || failedOperations.length === 0)) {
            await executeNext();
          }
        }
      };
      
      // Start initial batch of operations
      const initialBatchSize = maxConcurrent > 0 
        ? Math.min(maxConcurrent, operations.length) 
        : operations.length;
      
      const initialPromises = [];
      for (let i = 0; i < initialBatchSize; i++) {
        initialPromises.push(executeNext());
      }
      
      // Wait for all operations to complete
      await Promise.all(initialPromises);
    }
  } catch (error) {
    console.error('Unexpected error during batch execution:', error);
  }
  
  return {
    success: failedOperations.length === 0,
    results,
    failedOperations
  };
}

/**
 * Group a list of operations by a key to optimize execution
 * This can be used to group operations that work on the same directory, for example
 * 
 * @param items - Array of items to group
 * @param keyFn - Function to extract the group key from an item
 * @returns Grouped items
 */
export function groupOperations<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
} 