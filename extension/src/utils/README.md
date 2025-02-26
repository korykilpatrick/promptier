# File Content Resolution for Variables

## Overview

The file content resolution system allows users to include file variables in templates that get resolved to the actual file contents when the template is copied to the clipboard. This is particularly useful for:

- Including code files in AI prompts
- Adding config files to prompts
- Referencing documentation in prompts

## How It Works

1. Users can create file variables using the File Picker component
2. When a template is copied to the clipboard, the system:
   - Checks for any file variables
   - Resolves file permissions with minimal user interaction
   - Reads file contents
   - Escapes XML special characters in content
   - Wraps contents in XML tags with the file path as an identifier
   - Replaces file references with the content in the clipboard

## XML Wrapping Format

File contents are wrapped in XML tags with the file path as an attribute:

```xml
<file path="/path/to/file.txt">
File contents here...
</file>
```

### XML Escaping

To prevent confusion with the wrapper tags, special XML characters in the file content are escaped:
- `&` becomes `&amp;`
- `<` becomes `&lt;`
- `>` becomes `&gt;`

This ensures that the content is properly separated from the wrapper structure.

## Implementation Details

### File Content Resolver

The core functionality is in `file-content-resolver.ts` which provides:

- `resolveFileContents`: Processes variables containing file references, reading the actual content
- `copyWithResolvedFileContents`: Enhanced clipboard operation that resolves file references before copying
- `ensureFilePermissions`: Checks and requests permissions for all file variables at once

### Permission Management

The system uses the File System Access API's permission model:

- Permissions are requested once per session
- Handles are stored for persistent access
- Silent permission verification before operations
- Clear error messages when permission is denied

### Size Limits

File size limits are set very high (equivalent to 200k tokens, approximately 800KB) to accommodate most use cases without truncation.

## Usage

To use the file content resolution in your code:

```typescript
import { copyWithResolvedFileContents, ensureFilePermissions } from '../utils/file-content-resolver';

// Check if we have permissions first (optional)
const permissionsGranted = await ensureFilePermissions(globalVariables);

// Copy template with resolved file contents
const success = await copyWithResolvedFileContents(
  templateContent, 
  templateValues,
  globalVariables
);
```

## Error Handling

The system provides graceful degradation for common issues:

- **Permission Denied**: Shows a clear message that permission was denied
- **File Size Limit**: Warns when files exceed the size limit
- **File Not Found**: Displays an error message in place of the file content
- **Read Errors**: Handles and displays file reading errors 