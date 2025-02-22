# Promptier Chrome Extension Technical Specification

## 1. System Overview
- **Core purpose and value proposition**: Promptier is a Chrome extension built with TypeScript and Plasmo that enhances interaction with large language model (LLM) chat interfaces, specifically Grok on grok.com and ChatGPT on chat.openai.com. It allows users to create, save, and retrieve prompt templates with dynamic variables, map these variables to static strings or local filesystem content, and generate prompts for manual use in chat interfaces. The extension also supports **prompt chains** with actions such as executing prompts, saving AI responses to disk, and restarting chains. Targeting developers, it streamlines workflows like code generation and research by reducing repetitive tasks.
- **Key workflows**:
  1. User authenticates via Clerk using email+password, email+OTP, username+password, SMS+OTP, or passkeys.
  2. User creates and saves prompt templates with placeholders (e.g., `{{VARIABLE}}`).
  3. User maps variables to static strings or filesystem content using the File System Access API.
  4. User generates prompts and copies them to the clipboard for manual pasting into the chat UI.
  5. User defines and executes prompt chains with actions like 'execute_prompt', 'save_to_disk', and 'restart_chain'.
  6. User optionally saves AI responses to disk by pasting them into the extension's sidebar.
- **System architecture**:
  - **Client-side (Chrome extension)**: Built with Plasmo framework, React, and TypeScript, featuring:
    - Popup UI with React Router for authentication and template management
    - Content scripts for injecting a floating toolbar on supported sites
    - Background service worker for maintaining Clerk session and extension logic
    - Side panel for managing templates and chains
  - **Server-side**: A Node.js + Express RESTful API, also written in TypeScript, with a PostgreSQL database for storing templates and prompt chains.

## Project File Map
### TBD

## 3. Feature Specification

### 3.1 Prompt Template Management
- **User story and requirements**:
  - Users can create, save, and retrieve templates with placeholders, categorize them, and pin them for quick access in a toolbar.
- **Detailed implementation steps**:
  1. In `sidebar.html`, create a form with fields: `name` (text), `category` (text), `template_text` (textarea).
  2. In `sidebar.ts`, on form submit, send POST `/templates` with `{ name, category, template_text, is_pinned: false }`.
  3. Server inserts into `templates` table and returns `id`.
  4. Fetch templates with GET `/templates` and display in sidebar as a list with pin toggles.
  5. In `grok.ts` and `chatgpt.ts`, inject a floating toolbar with buttons for pinned templates (fetched from server where `is_pinned = true`).
- **Error handling and edge cases**:
  - Validate placeholders (e.g., `{{VARIABLE}}`) in `sidebar.ts`; alert if syntax is invalid.
  - Handle duplicate names: append suffix (e.g., "CodeGen_1").
  - On network failure, show "Failed to save" in sidebar.

### 3.2 Dynamic Variables
- **User story and requirements**:
  - Users define variables with placeholders, map them to strings or files, and generate prompts.
- **Detailed implementation steps**:
  1. In `sidebar.ts`, parse `template_text` to extract placeholders (e.g., `/{{([^}]+)}}/g`).
  2. For each variable, render an input for strings and a button triggering `window.showOpenFilePicker()` for files.
  3. Store mappings in local state (e.g., `{ VARIABLE: "value" }`).
  4. On "Generate" click, replace placeholders with mapped values and use `navigator.clipboard.writeText()` to copy.
- **Error handling and edge cases**:
  - Alert "Variable {{X}} not mapped" if any placeholder lacks a value.
  - Handle file access denial: prompt user to re-grant permissions.
  - Limit file size (e.g., 1MB) to prevent performance issues.

### 3.3 Prompt Chains
- **User story and requirements**:
  - Users create and execute a sequence of steps, each with an action ('execute_prompt', 'save_to_disk', 'restart_chain') and optional data (referrant, e.g., template ID for 'execute_prompt').
- **Detailed implementation steps**:
  1. In `sidebar.html`, add a chain creation section: `name` (text), and a list of steps with action dropdowns ('Execute Prompt', 'Save to Disk', 'Restart Chain').
     - For 'Execute Prompt', select a template (referrant: template ID).
     - For 'Save to Disk', input a file name pattern (referrant: e.g., "response_{timestamp}.txt").
     - For 'Restart Chain', no additional input (no referrant).
  2. In `sidebar.ts`, save chain via POST `/chains` with `{ name, steps: [{ action, data, step_order }] }`, where `data` is JSON (e.g., `{ template_id: 123 }` for 'execute_prompt', `{ file_name_pattern: "response_{timestamp}.txt" }` for 'save_to_disk', `{}` for 'restart_chain').
  3. On execution, fetch chain steps, process each step in order:
     - 'execute_prompt': Generate prompt based on the template (referrant: template ID), copy to clipboard.
     - 'save_to_disk': Show textarea for user to paste response, then save to disk using the file name pattern (referrant: e.g., "response_{timestamp}.txt").
     - 'restart_chain': Reset to the first step (no referrant).
  4. Use a "Next" button to advance through steps after each action is completed.
- **Error handling and edge cases**:
  - Prevent saving empty chains: alert "Add at least one step."
  - Handle missing referrant for actions (e.g., no template for 'execute_prompt').
  - On 'save_to_disk', if no response is pasted, alert "Please paste the AI response."

### 3.4 Write AI Responses to Disk
- **User story and requirements**:
  - As part of prompt chains or standalone, users can save AI responses to disk by pasting them into the sidebar.
- **Detailed implementation steps**:
  1. For 'save_to_disk' steps in chains or standalone, show a textarea in the sidebar for pasting the AI response.
  2. Parse the response for content (e.g., between ``` or `<file>` tags).
  3. Use `window.showSaveFilePicker()` to save the content with the specified file name pattern (referrant: e.g., "response_20231010_120000.txt").
- **Error handling and edge cases**:
  - If no content is found in the response, alert "No file content detected."
  - Handle file overwrite conflicts with a confirmation prompt.

## 4. Database Schema

### 4.1 Tables
- **users**:
  - `id` SERIAL PRIMARY KEY
  - `clerk_id` VARCHAR(255) UNIQUE NOT NULL
  - `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- **templates**:
  - `id` SERIAL PRIMARY KEY
  - `user_id` INT REFERENCES users(id)
  - `name` VARCHAR(255) NOT NULL
  - `category` VARCHAR(255)
  - `template_text` TEXT NOT NULL
  - `is_pinned` BOOLEAN DEFAULT FALSE
  - `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- **prompt_chains**:
  - `id` SERIAL PRIMARY KEY
  - `user_id` INT REFERENCES users(id)
  - `name` VARCHAR(255) NOT NULL
  - `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- **chain_steps**:
  - `id` SERIAL PRIMARY KEY
  - `chain_id` INT REFERENCES prompt_chains(id)
  - `action` VARCHAR(50) NOT NULL  (e.g., 'execute_prompt', 'save_to_disk', 'restart_chain')
  - `data` JSONB  (referrant data, e.g., `{ "template_id": 123 }` for 'execute_prompt', `{ "file_name_pattern": "response_{timestamp}.txt" }` for 'save_to_disk', `{}` for 'restart_chain')
  - `step_order` INT NOT NULL
  - `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

## 5. Server Actions

### 5.1 Database Actions
- **Create Chain Step**:
  - **Description**: Saves a new chain step with action and referrant data.
  - **Input**: `{ chain_id, action, data, step_order }`
  - **SQL**: `INSERT INTO chain_steps (chain_id, action, data, step_order) VALUES ($1, $2, $3, $4) RETURNING id`
  - **Return**: `{ id }`
- **Get Chain Steps**:
  - **Description**: Fetches steps for a chain.
  - **Input**: `chain_id`
  - **SQL**: `SELECT * FROM chain_steps WHERE chain_id = $1 ORDER BY step_order`
  - **Return**: `[{ id, action, data, step_order }]`

### 5.2 Other Actions
- **Authentication**:
  - Use Clerk middleware in `auth.ts` to verify tokens for all `/templates` and `/chains` endpoints.
- **File Handling**:
  - Handled client-side using the File System Access API.

## 6. Design System

### 6.1 Visual Style
- **Color palette**:
  - Primary: `#007bff` (blue)
  - Success: `#28a745` (green)
  - Background: `#f8f9fa` (light gray)
- **Typography**:
  - Font: `'Segoe UI', sans-serif`
  - Sizes: 14px (body), 16px (headings)
- **Spacing**: 8px grid.

### 6.2 Core Components
- **Floating Toolbar**:
  - Horizontal div with `<button>` elements for pinned items.
  - Hover: `background-color: #e9ecef`.
- **Sidebar**:
  - Sections: template list, chain creator, response saver.
  - Button styles: `background-color: #007bff`, `color: white`; Success: `#28a745`.

## 7. Component Architecture

### 7.1 Client Components (TypeScript + React)
- **RootLayout**: Main layout component wrapping the app in `<ClerkProvider>` with routing setup.
- **AuthPages**: Sign-in and sign-up pages using Clerk components.
- **TemplateList**: `<ul>` of templates, onclick handlers for selection/pinning.
- **ChainStepCreator**: Form for adding steps with action dropdown and conditional inputs.
- **Background Service Worker**: Uses `createClerkClient()` to maintain fresh session tokens.

## 8. Authentication & Authorization
- **Clerk implementation**: 
  - Use `@clerk/chrome-extension` SDK for authentication
  - Configure consistent CRX ID to prevent token rotation issues
  - Use `createClerkClient()` in background service worker to maintain fresh session
  - Support popup-based authentication methods (email+password, email+OTP, etc.)
- **Protected routes**: Middleware checks `Authorization` header with Clerk token.

## 9. Data Flow
- **Mechanisms**: Fetch API for server communication, Chrome messaging for inter-script communication.
- **State**: `chrome.storage.local` for temporary data, server for persistence. Chain execution state is managed in memory (lost on close).

## 10. Stripe Integration
- N/A for MVP.

## 11. PostHog Analytics
- **Strategy**: Track events like `template_created`, `prompt_generated`, and `chain_executed`.
- **Implementation**: Integrate PostHog JS SDK in `sidebar.ts`.

## 12. Testing
- **Unit tests**: Jest for TypeScript utilities and components.
- **E2E tests**: Playwright for key workflows like template creation and chain execution.