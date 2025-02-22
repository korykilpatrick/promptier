# Implementation Plan

Below is a detailed, step-by-step plan to build the Promptier Chrome extension and its backend server. Each step is designed to be implemented in a single iteration by an AI code generation system, modifying a limited number of files, and building logically on previous steps.

## Server Setup

- [x] **Step 1: Initialize Server Project**
  - **Task**: Set up a Node.js project with TypeScript, install essential dependencies (express, pg, typescript, etc.), and configure TypeScript compilation.
  - **Files**:
    - `package.json`: Initialize with dependencies (`express`, `pg`, `typescript`, `@types/node`, `@types/express`, `ts-node`).
    - `tsconfig.json`: Configure with `"target": "ES6"`, `"module": "commonjs"`, `"outDir": "./dist"`, `"strict": true`.
  - **Step Dependencies**: None
  - **User Instructions**: Run `npm install` in the server directory to install dependencies.

- [x] **Step 2: Set Up Database Connection**
  - **Task**: Create a module to connect to a PostgreSQL database using the `pg` library, with placeholder credentials.
  - **Files**:
    - `src/config/db.ts`: Export a `Pool` instance from `pg` with config `{ user, host, database, password, port }`.
  - **Step Dependencies**: Step 1
  - **User Instructions**: Update `src/config/db.ts` with your PostgreSQL credentials (user, host, database, password, port).

- [x] **Step 3: Create Database Schema**
  - **Task**: Write an SQL script to create tables for `users`, `templates`, `prompt_chains`, and `chain_steps` as per the technical specification.
  - **Files**:
    - `src/migrations/001_create_tables.sql`: Define tables with columns and relationships (e.g., `users(id, clerk_id)`, `templates(id, user_id, name, category, template_text, is_pinned)`, etc.).
  - **Step Dependencies**: Step 2
  - **User Instructions**: Run the script with `psql -U <user> -d <database> -f src/migrations/001_create_tables.sql` to create the tables.

- [x] **Step 4: Implement Clerk Authentication on Server**
  - **Task**: Integrate Clerk middleware to verify authentication tokens and set up the Express server with basic routing.
  - **Files**:
    - `src/utils/auth.ts`: Export a middleware function using `@clerk/express` to verify tokens.
    - `src/server.ts`: Initialize Express, apply Clerk middleware, and add a health check route (`GET /health`).
  - **Step Dependencies**: Step 1
  - **User Instructions**: Sign up for Clerk, obtain API keys, and update `src/utils/auth.ts` with your Clerk publishable key and secret key.

- [x] **Step 5: Implement API Routes for Templates**
  - **Task**: Create CRUD endpoints for managing prompt templates, protected by Clerk authentication.
  - **Files**:
    - `src/routes/templates.ts`: Define routes (`GET /templates`, `POST /templates`, `PUT /templates/:id`, `DELETE /templates/:id`) with SQL queries to `templates` table.
    - `src/server.ts`: Import and mount `/templates` routes with authentication middleware.
  - **Step Dependencies**: Steps 1-4
  - **User Instructions**: Ensure the server is running with `npx ts-node src/server.ts`.

- [x] **Step 6: Implement API Routes for Prompt Chains**
  - **Task**: Create CRUD endpoints for managing prompt chains and their steps, protected by Clerk authentication.
  - **Files**:
    - `src/routes/chains.ts`: Define routes (`GET /chains`, `POST /chains`, `PUT /chains/:id`, `DELETE /chains/:id`) with SQL queries to `prompt_chains` and `chain_steps` tables.
    - `src/server.ts`: Import and mount `/chains` routes with authentication middleware.
  - **Step Dependencies**: Steps 1-4
  - **User Instructions**: None

## Chrome Extension Setup

- [x] **Step 7: Set Up Extension Project Structure**
  - **Task**: Create the Chrome extension’s manifest and directory structure, including content scripts, background script, sidebar, and assets.
  - **Files**:
    - `manifest.json`: Define version 3, permissions (`activeTab`, `storage`, `clipboardWrite`), content scripts for `grok.com` and `chat.openai.com`, and background script.
    - `src/content_scripts/grok.ts`: Empty file for Grok content script.
    - `src/content_scripts/chatgpt.ts`: Empty file for ChatGPT content script.
    - `src/background.ts`: Empty background script.
    - `src/sidebar.html`: Empty HTML file.
    - `src/sidebar.ts`: Empty TypeScript file.
    - `src/styles/toolbar.css`: Empty CSS file.
    - `src/styles/sidebar.css`: Empty CSS file.
    - `images/icon16.png`, `images/icon48.png`, `images/icon128.png`: Placeholder icons (16x16, 48x48, 128x128).
    - `tsconfig.json`: Configure with `"target": "ES6"`, `"module": "ESNext"`, `"outDir": "./dist"`.
  - **Step Dependencies**: None
  - **User Instructions**: Load the extension in Chrome via Developer Mode by selecting the project directory.

- [ ] **Step 8: Implement Background Script for Authentication**
  - **Task**: Integrate Clerk SDK in the background script to handle user authentication and store the token.
  - **Files**:
    - `src/background.ts`: Add Clerk SDK, initialize with publishable key, and store token in `chrome.storage.local` on sign-in.
  - **Step Dependencies**: Step 4
  - **User Instructions**: Add Clerk publishable key to `src/background.ts` and ensure `@clerk/chrome-extension` is installed via `npm install` in the extension directory.

- [ ] **Step 9: Implement Server Communication in Background Script**
  - **Task**: Add functions to the background script to make authenticated API requests to the server, handling messages from other scripts.
  - **Files**:
    - `src/background.ts`: Implement `chrome.runtime.onMessage` listener for actions like `fetchTemplates`, `saveTemplate`, etc., using `fetch` with Clerk token in headers.
  - **Step Dependencies**: Step 8
  - **User Instructions**: Update the server URL in `src/background.ts` to match your running server (e.g., `http://localhost:3000`).

## Sidebar Implementation

- [ ] **Step 10: Implement Sidebar UI Structure**
  - **Task**: Create the basic HTML and CSS structure for the sidebar, with sections for templates, chains, and response saving.
  - **Files**:
    - `src/sidebar.html`: Add `<div>` sections for template management, chain management, and response saving, with placeholders for forms and lists.
    - `src/styles/sidebar.css`: Style with a fixed position, light gray background (`#f8f9fa`), and basic layout (e.g., `width: 300px`).
  - **Step Dependencies**: None
  - **User Instructions**: None

- [ ] **Step 11: Implement Template Management in Sidebar**
  - **Task**: Add a form to create templates, a list to display them, and pin toggles, with logic to save and fetch via the background script.
  - **Files**:
    - `src/sidebar.html`: Add form with `name`, `category`, `template_text` fields, and a template list `<ul>`.
    - `src/sidebar.ts`: Add event listeners for form submission (send `saveTemplate` message), fetch templates on load (send `fetchTemplates` message), and toggle `is_pinned` via `updateTemplate`.
    - `src/styles/sidebar.css`: Style form inputs and list items.
  - **Step Dependencies**: Step 10, Step 9
  - **User Instructions**: None

- [ ] **Step 12: Implement Dynamic Variables in Sidebar**
  - **Task**: Add logic to parse placeholders in a selected template, display inputs for mapping variables, and generate prompts.
  - **Files**:
    - `src/sidebar.html`: Add a section for variable mappings below the template list.
    - `src/sidebar.ts`: Parse placeholders with regex (e.g., `/{{([^}]+)}}/g`), render text/file inputs per variable, and on "Generate" click, replace placeholders and copy to clipboard with `navigator.clipboard.writeText`.
    - `src/styles/sidebar.css`: Style variable input section.
  - **Step Dependencies**: Step 11
  - **User Instructions**: None

- [ ] **Step 13: Implement Prompt Chain Management in Sidebar**
  - **Task**: Add a UI section for creating prompt chains, allowing users to define steps with actions and referrants.
  - **Files**:
    - `src/sidebar.html`: Add a chain creation form with `name` input and a step list, each step with an action dropdown and conditional inputs (e.g., template selector).
    - `src/sidebar.ts`: Add logic to manage step list state, save chain via `saveChain` message to background script with `{ name, steps }`.
    - `src/styles/sidebar.css`: Style chain section.
  - **Step Dependencies**: Step 12
  - **User Instructions**: None

- [ ] **Step 14: Implement Prompt Chain Execution in Sidebar**
  - **Task**: Add logic to execute prompt chains step-by-step, handling actions like `execute_prompt`, `save_to_disk`, and `restart_chain`.
  - **Files**:
    - `src/sidebar.html`: Add "Execute" and "Next" buttons for chains.
    - `src/sidebar.ts`: Fetch chain steps via `fetchChain` message, maintain execution state, process each step (e.g., generate prompt, show textarea for `save_to_disk`), and advance on "Next" click.
    - `src/styles/sidebar.css`: Style execution controls.
  - **Step Dependencies**: Step 13
  - **User Instructions**: None

- [ ] **Step 15: Implement Saving AI Responses to Disk in Sidebar**
  - **Task**: Add a textarea and logic to save AI responses to disk, either standalone or as part of a chain’s `save_to_disk` step.
  - **Files**:
    - `src/sidebar.html`: Add a response textarea and "Save" checkbox/button in the response section.
    - `src/sidebar.ts`: Parse response for content (e.g., between ```), use `window.showSaveFilePicker` to save with a timestamped name (e.g., `response_YYYYMMDD_HHMMSS.txt`).
    - `src/styles/sidebar.css`: Style response section.
  - **Step Dependencies**: Step 14
  - **User Instructions**: None

## Content Scripts

- [ ] **Step 16: Implement Content Scripts to Inject Toolbar and Sidebar**
  - **Task**: Inject a floating toolbar with pinned templates and a sidebar iframe into supported sites, handling toolbar button clicks.
  - **Files**:
    - `src/content_scripts/grok.ts`: Inject toolbar `<div>` with pinned template buttons and sidebar `<iframe>` sourcing `sidebar.html`.
    - `src/content_scripts/chatgpt.ts`: Same as above for ChatGPT.
    - `src/styles/toolbar.css`: Style toolbar with horizontal layout, blue buttons (`#007bff`), and hover effects.
  - **Step Dependencies**: Step 11
  - **User Instructions**: Reload the extension in Chrome after updating content scripts.

- [ ] **Step 17: Implement Hotkey to Toggle Sidebar**
  - **Task**: Add a keyboard listener to toggle the sidebar iframe’s visibility with `Cmd+Shift+P`.
  - **Files**:
    - `src/content_scripts/grok.ts`: Add `document.addEventListener('keydown')` to toggle iframe `display` style.
    - `src/content_scripts/chatgpt.ts`: Same as above.
  - **Step Dependencies**: Step 16
  - **User Instructions**: None

## Additional Features

- [ ] **Step 18: Implement Error Handling**
  - **Task**: Add error handling for common issues like invalid placeholders, network failures, and missing mappings.
  - **Files**:
    - `src/sidebar.ts`: Alert on unmapped variables, invalid chain steps, or response parsing failures.
    - `src/background.ts`: Handle fetch errors and send error messages to sidebar.
    - `src/routes/templates.ts`: Return error responses for invalid inputs.
    - `src/routes/chains.ts`: Same as above.
  - **Step Dependencies**: Steps 1-17
  - **User Instructions**: None

- [ ] **Step 19: Implement Testing**
  - **Task**: Write unit tests for key utilities and E2E tests for core workflows like template creation and chain execution.
  - **Files**:
    - `tests/unit/sidebar.test.ts`: Test placeholder parsing and prompt generation.
    - `tests/e2e/template_creation.spec.ts`: Playwright test for creating a template.
    - `tests/e2e/chain_execution.spec.ts`: Test chain execution flow.
  - **Step Dependencies**: Steps 1-18
  - **User Instructions**: Install Jest (`npm install --dev jest`) and Playwright (`npx playwright install`), then run `npx jest` and `npx playwright test`.

## Summary

This implementation plan systematically builds the Promptier Chrome extension and its backend server in 19 manageable steps. It starts with server setup (project initialization, database, authentication, and API routes), followed by extension configuration (structure, background script), and then focuses on the sidebar (template management, variables, chains, file saving). Content scripts add site-specific functionality (toolbar, sidebar injection, hotkeys), and final steps ensure robustness with error handling and testing.

**Key Considerations**:
- **Logical Progression**: Server setup precedes client features due to data dependency; authentication is implemented early for security.
- **Modularity**: Steps are self-contained, with clear file changes and dependencies, modifying 2-10 files each.
- **User Involvement**: Instructions guide users through setup tasks (e.g., installing dependencies, configuring Clerk, running migrations).
- **MVP Focus**: Complexities like pre-mapped variables for pinned templates are simplified (toolbar buttons open the sidebar), keeping the scope manageable.
