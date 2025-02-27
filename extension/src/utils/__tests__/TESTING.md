# Testing Guide for Filesystem Module

## Test Setup

The filesystem module has a comprehensive test suite that uses Jest for testing. This document provides guidance on setting up and running the tests.

## Common Linter Errors

When working with the test files, you might encounter linter errors related to Jest functions and types. This is because TypeScript doesn't recognize the Jest globals by default. Here's how to fix these issues:

### 1. Install Jest Types

```bash
npm install --save-dev @types/jest
```

### 2. Add Jest Configuration to tsconfig.json

Make sure your `tsconfig.json` includes Jest types:

```json
{
  "compilerOptions": {
    "types": ["jest", "node"]
  }
}
```

### 3. Setup Jest Environment in Test Files

At the top of your test files, you can add:

```typescript
/**
 * @jest-environment jsdom
 */
```

### 4. Common Error: "Cannot find name 'jest'"

If you see errors like `Cannot find name 'jest'` or `Cannot find name 'describe'`, you need to ensure Jest types are properly installed and configured. 

Some specific errors and their solutions:

| Error | Solution |
|-------|----------|
| `Cannot find name 'jest'` | Make sure `@types/jest` is installed |
| `Cannot find name 'describe'` | Make sure Jest types are included in tsconfig.json |
| `Parameter 'x' implicitly has an 'any' type` | Add explicit type annotations to test parameters |
| `Cannot find namespace 'jest'` | Use correct imports and Jest type setup |

### 5. Fixing Parameter Type Errors

When mocking functions, add explicit types to parameters:

```typescript
// Before (error)
(fs.registry.getHandle as jest.Mock).mockImplementation((id) => {
  // ...
});

// After (fixed)
(fs.registry.getHandle as jest.Mock).mockImplementation((id: string) => {
  // ...
});
```

## Running Tests

To run tests for the filesystem module:

```bash
npm test -- --testPathPattern="filesystem"
```

To run a specific test file:

```bash
npm test -- extension/src/filesystem/__tests__/recursive.test.ts
```

## Test Structure

Our tests are organized as follows:

- `extension/src/filesystem/__tests__/`: Tests for the core filesystem module
  - `recursive.test.ts`: Tests for recursive directory operations
  - `performance.test.ts`: Performance benchmarks for filesystem operations
  - `types.test.ts`: Type validation tests
  - `index.test.ts`: Main module functionality tests

- `extension/src/utils/__tests__/`: Tests for utilities that use the filesystem module
  - `file-content-resolver.test.ts`: Tests for file content resolution

## Writing New Tests

When writing new tests for the filesystem module:

1. Import the necessary modules from filesystem
2. Mock external dependencies
3. Test both success and error scenarios
4. Use explicit type annotations

Example test structure:

```typescript
describe('filesystem module', () => {
  // Setup - create mocks and test data
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
  });
  
  describe('specificFunction', () => {
    test('should handle success case', async () => {
      // Arrange
      // ...
      
      // Act
      const result = await fs.specificFunction();
      
      // Assert
      expect(result).toBe(expectedValue);
    });
    
    test('should handle error case', async () => {
      // Arrange - setup error condition
      
      // Act & Assert
      await expect(fs.specificFunction()).rejects.toThrow(ExpectedError);
    });
  });
});
```

## Best Practices

1. **Mock External Dependencies**: Always mock external APIs like `FileSystemFileHandle`
2. **Test Error Cases**: Ensure you test both success and error scenarios
3. **Include Edge Cases**: Test edge cases like empty directories, large files, etc.
4. **Keep Tests Small**: Focus each test on a single behavior
5. **Use Clear Naming**: Name tests clearly to describe what they're testing

## Debugging Tests

If you encounter issues with tests:

1. Use `console.log` to debug test execution
2. Check mock implementations to ensure they're working correctly
3. Run tests with `--verbose` flag for more details
4. Use `--watch` mode during development

## Continuous Integration

Tests are run automatically in the CI pipeline. Make sure all tests pass before submitting a PR. 