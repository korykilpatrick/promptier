# File Selection Variables Implementation Plan

## Context
This document outlines the implementation plan for adding file variables to the Promptier application. When this document is included in an AI prompt context window, the AI should understand that the user is working on implementing this feature and should help with the current implementation step.

### Feature Description
This feature will allow users to set variables to file(s) selected from a file picker using the File System Access API. Selected files/folders will be concatenated and injected into prompts similar to existing text variables. The feature involves both frontend and backend changes, including database updates, API modifications, and new UI components.

### Technical Stack
- Backend: Node.js with Express, PostgreSQL database (ES6+ throughout)
- Frontend: React, likely with TypeScript(ES6+ throughout)
- API: RESTful endpoints for variable management
- File System Access: Using the browser's File System Access API

### Key Considerations
- Security: Ensure proper validation of file paths and content
- Performance: Handle large files appropriately, implement caching where needed
- UX: Create an intuitive interface for selecting and managing file variables
- Permissions: Utilize the File System Access API's session-based permission model
  - Once permission is granted, it persists for the entire browser session
  - Store and reuse FileSystemHandle objects to maintain access without re-prompting
  - Implement permission verification for graceful degradation if access is revoked

### Implementation Philosophy
- Each step should be focused and self-contained
- Commit frequently with descriptive messages
- Test each component thoroughly before moving to the next
- Consider edge cases and error handling at each stage

## How to Use This Checklist
When working on this feature:
1. Mark steps as complete by changing `- [ ]` to `- [x]`
2. Include this document in AI context windows for implementation assistance
3. Add notes or modifications to steps as needed during implementation
4. Use this as a reference to track progress and ensure all components are completed

## Implementation Approach Change
Note: The original implementation plan called for adding a 'type' column to the user_variables table. However, after further consideration, we've decided to use a more flexible approach:

1. We're converting the 'value' column to JSONB format instead of adding a type column
2. This allows variables to store multiple files/directories and supports mixed content types
3. The JSONB structure uses an array of objects with 'type', 'id', 'name', and 'value' fields
4. This approach better supports the advanced features we want to implement

**Update (Implementation Order Change)**: We've decided to prioritize frontend implementation before optimizing backend with caching, to provide user-facing functionality sooner and gather real usage data before optimization.

The steps below have been updated to reflect this new approach and order.

## Implementation Steps

### Database Changes
- [x] 1. **Migration: Convert Value to JSONB**
   - Create migration file to convert the 'value' column in 'user_variables' table to JSONB
   - Implement migration strategy that preserves existing text values
   - Update database documentation to reflect the change

### Backend Model Updates
- [x] 2. **Update Variable Types**
   - Create types for variable entries (text, file, directory)
   - Update variable model interfaces to use the new JSONB structure
   - Add constants for entry types

- [x] 3. **Add Validation**
   - Implement validation for variable entries
   - Add path validation for file and directory entries

### Basic File Variable Backend Support
- [x] 4. **Variable Entry Utilities**
   - Create utility functions to work with the new variable format
   - Add helper functions to create and validate entries

- [x] 5. **Creation Endpoint Update**
   - Update variable creation logic to handle JSONB entries
   - Add validation for file/directory paths

- [x] 6. **Update Endpoint Enhancement**
   - Modify variable update logic for JSONB data
   - Ensure proper error handling

- [x] 7. **Path Validation**
   - Create utilities to validate file paths
   - Add security checks for path traversal

### Advanced Backend File Handling
- [x] 8. **File Reading Utility**
   - Create function to read file contents
   - Add error handling for file access issues

- [x] 9. **Text File Content Extraction**
   - Implement content extraction for text files
   - Add encoding detection/handling

- [x] 10. **Directory Path Handling**
    - Add support for directory path variables
    - Implement directory content listing

- [x] 11. **File Size Checking**
    - Implement size validation for files
    - Add configurable limits for file sizes

### API Endpoint Updates
- [x] 12. **GET Variable Endpoint**
    - Update to include JSONB data in response
    - Ensure proper parsing of JSONB values

- [x] 13. **Add Content Processing**
    - Add endpoint to process file/directory entries
    - Include file contents in response

- [x] 14. **API Documentation**
    - Update API documentation for all modified endpoints
    - Add examples for file variable usage

### Frontend Variable Model Updates
- [x] 15. **Update Interface/Type**
    - Add new variable entry interfaces
    - Update related component props

- [x] 16. **Frontend Entry Constants**
    - Create constants matching backend entry types
    - Add type checking helpers

- [x] 17. **Type Utility Functions**
    - Add utility functions to work with entries
    - Create formatters for file paths

### File Picker Component - Initial
- [x] 18. **Basic Component Structure**
    - Create file picker component skeleton
    - Add container and styling

- [x] 19. **API Permission Request**
    - Implement File System Access API permission request
    - Add permission state management
    - Store FileSystemHandle objects for session-long access
    - Implement handle serialization for potential cross-session persistence
    - Add permission verification before file operations

- [x] 20. **Single File Selection**
    - Add single file selection functionality
    - Implement file handle management

- [x] 21. **File Metadata Extraction**
    - Extract name, size, type from selected files
    - Create display format for metadata

### File Picker Component - Advanced
- [x] 22. **Multiple File Selection**
    - Implement multiple file selection support
    - Add file list management

- [x] 23. **Directory Selection**
    - Add directory selection functionality
    - Implement recursive path handling

- [x] 24. **File Size Validation**
    - Add client-side file size checking
    - Implement warning for large files

- [x] 25. **File Type Filtering**
    - Add file type filter options
    - Implement extension filtering

- [x] 26. **Selected Files Display**
    - Create list view for selected files
    - Add removal functionality

### Variable Creation UI Updates
- [x] 27. **Entry Creator Component**
    - Create component for adding variable entries
    - Support text, file, and directory entries

- [x] 28. **Conditional File Picker**
    - Show file picker only when file/directory type is selected
    - Add smooth transitions

- [x] 29. **Form Submission Update**
    - Modify submission logic to handle entry arrays
    - Update validation for file variables

- [x] 30. **Size Warnings**
    - Add file size warnings in UI
    - Implement confirmation for large files

### Variable Editing UI Updates
- [x] 31. **Edit Modal Update**
    - Update edit variable modal to support entry arrays
    - Show current entries in editable format

- [x] 32. **Entry Replacement**
    - Add functionality to replace selected entries
    - Preserve previous entries when needed

- [x] 33. **Clear Selection**
    - Create clear entries button
    - Add confirmation dialog

- [x] 34. **UI Indicators**
    - Add visual indicators for file/directory entries in list
    - Create entry-specific badges/icons

### Backend Optimization
- [ ] 35. **Content Caching**
    - Create caching mechanism for file contents
    - Add cache invalidation logic

### Prompt Template Integration - Basic
- [ ] 36. **Variable Interpolation Update**
    - Modify interpolation logic to handle entry arrays
    - Add special formatting for file content

- [ ] 37. **Content Extraction**
    - Implement file content extraction during prompt generation
    - Add error handling for missing files
    - Add mechanism to reuse stored FileSystemHandle objects
    - Implement graceful verification of access permissions
    - Provide fallback options if access is denied

- [ ] 38. **Template Preview**
    - Create placeholder text for file variables in template preview
    - Add file summary in preview

### Prompt Template Integration - Advanced
- [ ] 39. **Content Formatting**
    - Add formatting based on file type (code, text, etc.)
    - Implement syntax-aware formatting

- [ ] 40. **Size Limit Checks**
    - Add size checks during prompt generation
    - Implement truncation for oversized files

- [ ] 41. **Large File Warnings**
    - Create warning UI for large file variables
    - Add confirmation before using large files

- [ ] 42. **Syntax Highlighting**
    - Implement syntax highlighting for code files in preview
    - Add language detection

### Error Handling
- [ ] 43. **File Not Found**
    - Implement graceful handling for missing files
    - Add user-friendly error messages

- [ ] 44. **Permission Denial**
    - Handle permission denial scenarios
    - Add instructions for granting permissions
    - Implement session-based permission tracking
    - Add verification flow that minimizes permission requests
    - Store permission state to prevent unnecessary re-prompting
    - Provide clear UI for re-requesting access when needed

- [ ] 45. **Error Messages**
    - Create consistent error message format
    - Add troubleshooting guidance

- [ ] 46. **Retry Mechanism**
    - Implement retry for file access failures
    - Add exponential backoff

### Testing & Validation
- [ ] 47. **Model Tests**
    - Create unit tests for variable entries
    - Test type validation

- [ ] 48. **Content Extraction Tests**
    - Add tests for file content extraction
    - Test various file types and encodings

- [ ] 49. **Permission Tests**
    - Create tests for permission handling
    - Test error conditions

- [ ] 50. **Integration Tests**
    - Test with various file types and nested directories
    - Verify end-to-end functionality

### User Experience Improvements
- [ ] 51. **Loading Indicators**
    - Add loading states during file processing
    - Implement progress indicators for large files

- [ ] 52. **Tooltips**
    - Create tooltips explaining file variable usage
    - Add help text in appropriate places

- [ ] 53. **File Indicators**
    - Add file icon indicators in variable list
    - Create visual file type identification

- [ ] 54. **Drag & Drop**
    - Implement drag and drop support for file selection
    - Add visual feedback during drag operations

### Documentation
- [ ] 55. **User Documentation**
    - Update user-facing documentation with file variable explanation
    - Add screenshots and examples

- [ ] 56. **Example Use Cases**
    - Create example use cases for file variables
    - Add template examples

- [ ] 57. **Developer Documentation**
    - Create developer documentation for the feature
    - Add architecture overview

- [ ] 58. **Code Comments**
    - Add inline code comments explaining file handling logic
    - Document edge cases and solutions