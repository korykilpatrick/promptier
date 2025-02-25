# Variables API Documentation

This document details the API endpoints for managing user variables in the Promptier application, including the new file variable functionality.

## Data Types

### Variable Entry Types
Variables can now contain entries of multiple types:

```typescript
const VARIABLE_ENTRY_TYPES = {
  TEXT: 'text',
  FILE: 'file',
  DIRECTORY: 'directory'
};
```

### VariableEntry Interface

```typescript
interface VariableEntry {
  id?: string;         // Optional identifier for the entry
  type: VariableEntryType;  // 'text', 'file', or 'directory'
  name?: string;       // Optional display name
  value: string;       // Value (text content or file/directory path)
  metadata?: Record<string, any>; // Optional additional metadata
}
```

### Request and Response Types

#### VariableRequest
```typescript
interface VariableRequest {
  name: string;
  value: VariableEntry[];
}
```

#### VariableResponse
```typescript
interface VariableResponse {
  data: BaseVariable | BaseVariable[];
}

interface BaseVariable {
  id: number;
  name: string;
  value: VariableEntry[];
  created_at: string;
  updated_at: string;
}
```

## Endpoints

### GET /variables

Retrieves all variables for the authenticated user.

**Authentication Required**: Yes

**Response**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "test_variable",
      "value": [
        {
          "id": "entry1",
          "type": "text",
          "value": "Example text content"
        },
        {
          "id": "entry2",
          "type": "file",
          "name": "example.txt",
          "value": "/path/to/example.txt"
        }
      ],
      "created_at": "2023-02-15T12:00:00Z",
      "updated_at": "2023-02-15T12:00:00Z"
    }
  ]
}
```

### POST /variables

Creates a new user variable or updates an existing one if the name already exists.

**Authentication Required**: Yes

**Request Body**:
```json
{
  "name": "my_variable",
  "value": [
    {
      "type": "text",
      "value": "Some text content"
    },
    {
      "type": "file",
      "name": "example.js",
      "value": "/path/to/example.js"
    },
    {
      "type": "directory",
      "name": "src",
      "value": "/path/to/src"
    }
  ]
}
```

**Response (201 Created)**:
```json
{
  "data": {
    "id": 2,
    "name": "my_variable",
    "value": [
      {
        "type": "text",
        "value": "Some text content"
      },
      {
        "type": "file",
        "name": "example.js",
        "value": "/path/to/example.js"
      },
      {
        "type": "directory",
        "name": "src",
        "value": "/path/to/src"
      }
    ],
    "created_at": "2023-02-15T12:00:00Z",
    "updated_at": "2023-02-15T12:00:00Z"
  }
}
```

**Error Responses**:

- 400 Bad Request: If the variable name is missing, value is not an array, or entries are invalid
- 401 Unauthorized: If the user is not authenticated

### PUT /variables/:id

Updates an existing user variable.

**Authentication Required**: Yes

**URL Parameters**:
- `id`: The ID of the variable to update

**Request Body**:
```json
{
  "name": "updated_variable",
  "value": [
    {
      "type": "text",
      "value": "Updated text content"
    },
    {
      "type": "file",
      "name": "updated.js",
      "value": "/path/to/updated.js"
    }
  ]
}
```

**Response (200 OK)**:
```json
{
  "data": {
    "id": 2,
    "name": "updated_variable",
    "value": [
      {
        "type": "text",
        "value": "Updated text content"
      },
      {
        "type": "file",
        "name": "updated.js",
        "value": "/path/to/updated.js"
      }
    ],
    "created_at": "2023-02-15T12:00:00Z",
    "updated_at": "2023-02-15T12:30:00Z"
  }
}
```

**Error Responses**:

- 400 Bad Request: If the ID is invalid, variable name is missing, value is not an array, or entries are invalid
- 401 Unauthorized: If the user is not authenticated
- 404 Not Found: If the variable is not found or doesn't belong to the user

### DELETE /variables/:id

Deletes a user variable.

**Authentication Required**: Yes

**URL Parameters**:
- `id`: The ID of the variable to delete

**Response (200 OK)**:
```json
{
  "message": "Variable deleted successfully"
}
```

**Error Responses**:

- 400 Bad Request: If the ID is invalid
- 401 Unauthorized: If the user is not authenticated
- 404 Not Found: If the variable is not found or doesn't belong to the user

### GET /variables/by-name/:name

Retrieves a variable by name.

**Authentication Required**: Yes

**URL Parameters**:
- `name`: The name of the variable to retrieve

**Response (200 OK)**:
```json
{
  "data": {
    "id": 3,
    "name": "my_file_variable",
    "value": [
      {
        "type": "file",
        "name": "example.js",
        "value": "/path/to/example.js"
      }
    ],
    "created_at": "2023-02-15T12:00:00Z",
    "updated_at": "2023-02-15T12:00:00Z"
  }
}
```

**Error Responses**:

- 401 Unauthorized: If the user is not authenticated
- 404 Not Found: If the variable is not found or doesn't belong to the user

### GET /variables/:id/content

Retrieves a variable with file/directory contents processed. This endpoint reads the content of files 
and directories referenced in file/directory entries and includes that content in the response.

**Authentication Required**: Yes

**URL Parameters**:
- `id`: The ID of the variable to retrieve with contents

**Response (200 OK)**:
```json
{
  "data": {
    "id": 4,
    "name": "file_variable",
    "entries": [
      {
        "type": "text",
        "value": "Some text content"
      },
      {
        "type": "file",
        "name": "example.js",
        "value": "/path/to/example.js",
        "content": "console.log('This is the content of the file');"
      },
      {
        "type": "directory",
        "name": "src",
        "value": "/path/to/src",
        "files": [
          {
            "name": "index.js",
            "path": "/path/to/src/index.js",
            "content": "// index.js content here"
          },
          {
            "name": "utils.js",
            "path": "/path/to/src/utils.js",
            "content": "// utils.js content here"
          }
        ]
      }
    ],
    "created_at": "2023-02-15T12:00:00Z",
    "updated_at": "2023-02-15T12:00:00Z"
  }
}
```

**Error Responses**:

- 400 Bad Request: If the ID is invalid
- 401 Unauthorized: If the user is not authenticated
- 404 Not Found: If the variable is not found or doesn't belong to the user

## Working with File Variables

### File Entry Format

A file entry should include:
- `type`: Must be `"file"`
- `value`: The path to the file
- `name` (optional): A display name, defaults to the filename

Example:
```json
{
  "type": "file",
  "name": "script.js",
  "value": "/path/to/script.js"
}
```

### Directory Entry Format

A directory entry should include:
- `type`: Must be `"directory"`
- `value`: The path to the directory
- `name` (optional): A display name, defaults to the directory name

Example:
```json
{
  "type": "directory",
  "name": "src",
  "value": "/path/to/src"
}
```

### Best Practices

1. **Path Validation**: 
   - Always validate paths to ensure they exist and can be accessed
   - Avoid path traversal vulnerabilities by checking for suspicious path patterns

2. **File Size Considerations**:
   - Be aware of file size limitations when using the `/variables/:id/content` endpoint
   - Large files will affect performance and may be truncated

3. **Mixed Content Types**:
   - Variables can contain a mix of text, file, and directory entries
   - Order is preserved when processing variables

4. **Error Handling**:
   - The `/variables/:id/content` endpoint will still return partial data even if some files cannot be accessed
   - Check the `errors` field in the response for any file access issues 

## Examples of Using File Variables in Prompt Templates

### Basic File Variable Usage

File variables can be used in prompt templates similar to text variables. The following examples demonstrate how to use file variables in prompt templates.

#### Example 1: Analyzing Code

**Variable Setup**:
1. Create a file variable named "code_to_analyze":
```json
{
  "name": "code_to_analyze",
  "value": [
    {
      "type": "file",
      "name": "main.js",
      "value": "/path/to/main.js"
    }
  ]
}
```

**Prompt Template**:
```
Please analyze the following JavaScript code and suggest improvements:

{{code_to_analyze}}

Focus on:
1. Performance optimizations
2. Code readability
3. Potential bugs or edge cases
```

When the prompt is generated, `{{code_to_analyze}}` will be replaced with the content of the main.js file.

#### Example 2: Multiple Files Review

**Variable Setup**:
```json
{
  "name": "project_files",
  "value": [
    {
      "type": "file",
      "name": "index.html",
      "value": "/path/to/index.html"
    },
    {
      "type": "file",
      "name": "styles.css",
      "value": "/path/to/styles.css"
    },
    {
      "type": "file",
      "name": "app.js",
      "value": "/path/to/app.js"
    }
  ]
}
```

**Prompt Template**:
```
Please review these web project files and suggest improvements:

HTML:
{{project_files}}

Specifically look for:
1. Semantic HTML structure
2. CSS optimizations
3. JavaScript best practices
```

When the prompt is generated, all three files (index.html, styles.css, and app.js) will be included in the prompt, with appropriate file headers to distinguish between them.

#### Example 3: Directory Analysis

**Variable Setup**:
```json
{
  "name": "project_structure",
  "value": [
    {
      "type": "directory",
      "name": "src",
      "value": "/path/to/src"
    }
  ]
}
```

**Prompt Template**:
```
Please analyze the structure and code quality of this project:

{{project_structure}}

Provide recommendations on:
1. Project organization
2. Code modularity
3. Potential refactoring opportunities
```

When the prompt is generated, all files in the src directory will be included, organized by their path structure.

### Advanced Usage: Combining Text and File Variables

File variables can be combined with text variables for more flexible prompt templates.

**Variable Setup**:
```json
{
  "name": "code_file",
  "value": [
    {
      "type": "file",
      "name": "component.tsx",
      "value": "/path/to/component.tsx"
    }
  ]
}
```

```json
{
  "name": "instructions",
  "value": [
    {
      "type": "text",
      "value": "Convert this React component to use hooks instead of class components."
    }
  ]
}
```

**Prompt Template**:
```
Please follow these instructions for the React component below:

Instructions: {{instructions}}

Component code:
{{code_file}}

Please provide the refactored code with explanations of your changes.
```

### Tips for Effective File Variable Usage

1. **Organize by Context**: Group related files into a single variable for context preservation
2. **Use Descriptive Names**: Both for variables and file entries
3. **Consider Size Limitations**: 
   - Keep in mind LLM token limits when including file content
   - For large codebases, focus on key files or use directories with selective inclusion
4. **Provide Clear Instructions**: Indicate which parts of included files are most important
5. **Format File Content**: Consider formatting code with syntax highlighting or adding line numbers for easier reference 

## API Usage Examples

### Example: Creating a Variable with File Entries

The following example demonstrates how to create a variable that includes file entries using the API.

#### Request
```http
POST /variables HTTP/1.1
Content-Type: application/json
Authorization: Bearer <auth_token>

{
  "name": "project_analysis",
  "value": [
    {
      "type": "text",
      "value": "Please analyze the following project files:"
    },
    {
      "type": "file",
      "name": "index.js",
      "value": "/projects/my-app/src/index.js"
    },
    {
      "type": "file",
      "name": "utils.js",
      "value": "/projects/my-app/src/utils.js"
    }
  ]
}
```

#### Response
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "data": {
    "id": 5,
    "name": "project_analysis",
    "value": [
      {
        "type": "text",
        "value": "Please analyze the following project files:"
      },
      {
        "type": "file",
        "name": "index.js",
        "value": "/projects/my-app/src/index.js"
      },
      {
        "type": "file",
        "name": "utils.js",
        "value": "/projects/my-app/src/utils.js"
      }
    ],
    "created_at": "2023-02-15T12:00:00Z",
    "updated_at": "2023-02-15T12:00:00Z"
  }
}
```

### Example: Retrieving a Variable with File Contents

The following example demonstrates how to retrieve a variable with file contents processed using the `/variables/:id/content` endpoint.

#### Request
```http
GET /variables/5/content HTTP/1.1
Authorization: Bearer <auth_token>
```

#### Response
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "id": 5,
    "name": "project_analysis",
    "entries": [
      {
        "type": "text",
        "value": "Please analyze the following project files:"
      },
      {
        "type": "file",
        "name": "index.js",
        "value": "/projects/my-app/src/index.js",
        "content": "import React from 'react';\nimport ReactDOM from 'react-dom';\nimport App from './App';\n\nReactDOM.render(<App />, document.getElementById('root'));"
      },
      {
        "type": "file",
        "name": "utils.js",
        "value": "/projects/my-app/src/utils.js",
        "content": "export function formatDate(date) {\n  return new Date(date).toLocaleDateString();\n}\n\nexport function truncateText(text, maxLength) {\n  if (text.length <= maxLength) return text;\n  return text.slice(0, maxLength) + '...';\n}"
      }
    ],
    "created_at": "2023-02-15T12:00:00Z",
    "updated_at": "2023-02-15T12:00:00Z"
  }
}
```

### Example: Working with Directory Entries

The following example demonstrates how to create and retrieve a variable with directory entries.

#### Creating a Variable with a Directory
```http
POST /variables HTTP/1.1
Content-Type: application/json
Authorization: Bearer <auth_token>

{
  "name": "src_directory",
  "value": [
    {
      "type": "directory",
      "name": "src folder",
      "value": "/projects/my-app/src"
    }
  ]
}
```

#### Retrieving Directory Contents
```http
GET /variables/6/content HTTP/1.1
Authorization: Bearer <auth_token>
```

#### Response with Directory Contents
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "id": 6,
    "name": "src_directory",
    "entries": [
      {
        "type": "directory",
        "name": "src folder",
        "value": "/projects/my-app/src",
        "files": [
          {
            "name": "index.js",
            "path": "/projects/my-app/src/index.js",
            "content": "import React from 'react';\nimport ReactDOM from 'react-dom';\nimport App from './App';\n\nReactDOM.render(<App />, document.getElementById('root'));"
          },
          {
            "name": "App.js",
            "path": "/projects/my-app/src/App.js",
            "content": "import React from 'react';\nimport './App.css';\n\nfunction App() {\n  return (\n    <div className=\"App\">\n      <header className=\"App-header\">\n        <h1>My React App</h1>\n      </header>\n    </div>\n  );\n}\n\nexport default App;"
          },
          {
            "name": "App.css",
            "path": "/projects/my-app/src/App.css",
            "content": ".App {\n  text-align: center;\n}\n\n.App-header {\n  background-color: #282c34;\n  padding: 20px;\n  color: white;\n}"
          },
          {
            "name": "utils.js",
            "path": "/projects/my-app/src/utils.js",
            "content": "export function formatDate(date) {\n  return new Date(date).toLocaleDateString();\n}\n\nexport function truncateText(text, maxLength) {\n  if (text.length <= maxLength) return text;\n  return text.slice(0, maxLength) + '...';\n}"
          }
        ]
      }
    ],
    "created_at": "2023-02-15T12:00:00Z",
    "updated_at": "2023-02-15T12:00:00Z"
  }
}
```

### Example: Handling File Access Errors

If some files can't be accessed, the API will still return the available data along with errors.

#### Request
```http
GET /variables/7/content HTTP/1.1
Authorization: Bearer <auth_token>
```

#### Response with Errors
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "id": 7,
    "name": "project_files",
    "entries": [
      {
        "type": "file",
        "name": "config.js",
        "value": "/projects/my-app/config.js",
        "content": "module.exports = {\n  apiUrl: 'https://api.example.com',\n  timeout: 5000\n};"
      },
      {
        "type": "file",
        "name": "deleted.js",
        "value": "/projects/my-app/deleted.js"
      }
    ],
    "errors": [
      {
        "path": "/projects/my-app/deleted.js",
        "error": "File not found or permission denied"
      }
    ],
    "created_at": "2023-02-15T12:00:00Z",
    "updated_at": "2023-02-15T12:00:00Z"
  }
}
```

## Notes on File Size and Performance

### Size Limits
- The API may truncate the content of large files to prevent performance issues
- The default maximum file size is 1MB per file
- For very large files, consider splitting them into smaller segments

### Performance Considerations
- Processing multiple files or large directories can impact response time
- Consider using selective file inclusion rather than entire directories for large projects
- The API provides basic caching to improve performance for frequently accessed files 