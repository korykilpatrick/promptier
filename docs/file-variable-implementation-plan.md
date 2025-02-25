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

## Implementation Steps

### Database Changes
- [ ] 1. **Migration: Add Type Column**
   - Create migration file to add `type` column to `user_variables` table
   - Set default value to 'text'
   - Add enum constraint for valid types ('text', 'file', 'directory')

- [ ] 2. **Migration: Add Index**
   - Add index on the new `type` column for query performance

- [ ] 3. **Update Schema Documentation**
   - Update database schema documentation to reflect new column

### Backend Model Updates
- [ ] 4. **Update Variable Model**
   - Add `type` field to variable model/class
   - Update type definitions

- [ ] 5. **Add Validation**
   - Implement validation for the new variable types
   - Add constraints for file paths

- [ ] 6. **Create Type Constants**
   - Define constants for variable types ('TEXT', 'FILE', 'DIRECTORY')
   - Add helper functions to check variable types

### Basic File Variable Backend Support
- [ ] 7. **Type Check Utility**
   - Create utility function to check if variable is file-type
   - Add type-specific validation

- [ ] 8. **Creation Endpoint Update**
   - Update variable creation logic to handle file-type variables
   - Add validation for file paths

- [ ] 9. **Update Endpoint Enhancement**
   - Modify variable update logic for file-type variables
   - Handle file path changes

- [ ] 10. **Path Validation**
    - Create utility to validate file paths
    - Add security checks for path traversal

### Advanced Backend File Handling
- [ ] 11. **File Reading Utility**
    - Create function to read file contents
    - Add error handling for file access issues

- [ ] 12. **Text File Content Extraction**
    - Implement content extraction for text files
    - Add encoding detection/handling

- [ ] 13. **Directory Path Handling**
    - Add support for directory path variables
    - Implement directory content listing

- [ ] 14. **File Size Checking**
    - Implement size validation for files
    - Add configurable limits for file sizes

- [ ] 15. **Content Caching**
    - Create caching mechanism for file contents
    - Add cache invalidation logic

### API Endpoint Updates
- [ ] 16. **GET Variable Endpoint**
    - Update to include type information
    - Add file metadata in response

- [ ] 17. **Add Content Control Parameter**
    - Add parameter to control whether file content is included in response
    - Implement conditional content loading

- [ ] 18. **List Endpoint Filtering**
    - Update variable list endpoint to support filtering by type
    - Add sorting options for file variables

- [ ] 19. **API Documentation**
    - Update API documentation for all modified endpoints
    - Add examples for file variable usage

### Frontend Variable Model Updates
- [ ] 20. **Update Interface/Type**
    - Add file type to variable interface
    - Update related component props

- [ ] 21. **Frontend Type Constants**
    - Create constants matching backend variable types
    - Add type checking helpers

- [ ] 22. **Type Utility Functions**
    - Add utility functions to check variable types
    - Create formatters for file paths

### File Picker Component - Initial
- [ ] 23. **Basic Component Structure**
    - Create file picker component skeleton
    - Add container and styling

- [ ] 24. **API Permission Request**
    - Implement File System Access API permission request
    - Add permission state management

- [ ] 25. **Single File Selection**
    - Add single file selection functionality
    - Implement file handle management

- [ ] 26. **File Metadata Extraction**
    - Extract name, size, type from selected files
    - Create display format for metadata

### File Picker Component - Advanced
- [ ] 27. **Multiple File Selection**
    - Implement multiple file selection support
    - Add file list management

- [ ] 28. **Directory Selection**
    - Add directory selection functionality
    - Implement recursive path handling

- [ ] 29. **File Size Validation**
    - Add client-side file size checking
    - Implement warning for large files

- [ ] 30. **File Type Filtering**
    - Add file type filter options
    - Implement extension filtering

- [ ] 31. **Selected Files Display**
    - Create list view for selected files
    - Add removal functionality

### Variable Creation UI Updates
- [ ] 32. **Type Selector**
    - Add variable type radio/dropdown in creation form
    - Style type selection component

- [ ] 33. **Conditional File Picker**
    - Show file picker only when file type is selected
    - Add smooth transitions

- [ ] 34. **Form Submission Update**
    - Modify submission logic to handle file data
    - Update validation for file variables

- [ ] 35. **Size Warnings**
    - Add file size warnings in UI
    - Implement confirmation for large files

### Variable Editing UI Updates
- [ ] 36. **Edit Modal Update**
    - Update edit variable modal to support file type
    - Show current file selection

- [ ] 37. **File Replacement**
    - Add functionality to replace selected files
    - Preserve previous selection if needed

- [ ] 38. **Clear Selection**
    - Create clear file selection button
    - Add confirmation dialog

- [ ] 39. **UI Indicators**
    - Add visual indicators for file-based variables in list
    - Create file-specific badges/icons

### Prompt Template Integration - Basic
- [ ] 40. **Variable Interpolation Update**
    - Modify interpolation logic to handle file variables
    - Add special formatting for file content

- [ ] 41. **Content Extraction**
    - Implement file content extraction during prompt generation
    - Add error handling for missing files

- [ ] 42. **Template Preview**
    - Create placeholder text for file variables in template preview
    - Add file summary in preview

### Prompt Template Integration - Advanced
- [ ] 43. **Content Formatting**
    - Add formatting based on file type (code, text, etc.)
    - Implement syntax-aware formatting

- [ ] 44. **Size Limit Checks**
    - Add size checks during prompt generation
    - Implement truncation for oversized files

- [ ] 45. **Large File Warnings**
    - Create warning UI for large file variables
    - Add confirmation before using large files

- [ ] 46. **Syntax Highlighting**
    - Implement syntax highlighting for code files in preview
    - Add language detection

### Error Handling
- [ ] 47. **File Not Found**
    - Implement graceful handling for missing files
    - Add user-friendly error messages

- [ ] 48. **Permission Denial**
    - Handle permission denial scenarios
    - Add instructions for granting permissions

- [ ] 49. **Error Messages**
    - Create consistent error message format
    - Add troubleshooting guidance

- [ ] 50. **Retry Mechanism**
    - Implement retry for file access failures
    - Add exponential backoff

### Testing & Validation
- [ ] 51. **Model Tests**
    - Create unit tests for file variable model
    - Test type validation

- [ ] 52. **Content Extraction Tests**
    - Add tests for file content extraction
    - Test various file types and encodings

- [ ] 53. **Permission Tests**
    - Create tests for permission handling
    - Test error conditions

- [ ] 54. **Integration Tests**
    - Test with various file types and nested directories
    - Verify end-to-end functionality

### User Experience Improvements
- [ ] 55. **Loading Indicators**
    - Add loading states during file processing
    - Implement progress indicators for large files

- [ ] 56. **Tooltips**
    - Create tooltips explaining file variable usage
    - Add help text in appropriate places

- [ ] 57. **File Indicators**
    - Add file icon indicators in variable list
    - Create visual file type identification

- [ ] 58. **Drag & Drop**
    - Implement drag and drop support for file selection
    - Add visual feedback during drag operations

### Documentation
- [ ] 59. **User Documentation**
    - Update user-facing documentation with file variable explanation
    - Add screenshots and examples

- [ ] 60. **Example Use Cases**
    - Create example use cases for file variables
    - Add template examples

- [ ] 61. **Developer Documentation**
    - Create developer documentation for the feature
    - Add architecture overview

- [ ] 62. **Code Comments**
    - Add inline code comments explaining file handling logic
    - Document edge cases and solutions