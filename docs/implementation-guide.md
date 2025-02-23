# Implementation Plan

Below is a detailed, step-by-step plan to build the Promptier Chrome extension and its backend server. Each step is designed to be implemented in a single iteration by an AI code generation system, modifying a limited number of files, and building logically on previous steps.

## NOTES

The strict file paths in this plan *are just loose suggestions*. Do not blindly create them - ensure that they are being named and creating in the appropriate place. And make sure they dont already exist somewhere else before you create them.

This implementation is split into two phases:
1. Core Functionality: Building the sidebar as a standalone feature with template/chain management
2. DOM Integration: Adding content scripts and DOM interaction features

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

- [x] **Step 7: Initialize Plasmo Extension Project**
  - **Task**: Set up a new Plasmo extension project with TypeScript and React, configure Clerk, and set up the basic project structure.
  - **Files**:
    - `package.json`: Initialize with dependencies (`plasmo`, `@clerk/chrome-extension`, `react-router-dom`).
    - `.env.development`: Add Clerk publishable key and frontend API URL.
    - `.env.chrome`: Add CRX public key for consistent extension ID.
    - `tsconfig.json`: Configure with Plasmo's recommended TypeScript settings.
  - **Step Dependencies**: None
  - **User Instructions**: 
    - Run `pnpm create plasmo` to create new project
    - Run `pnpm add @clerk/chrome-extension react-router-dom`
    - Configure Clerk application in dashboard for Chrome extension
    - Generate and add CRX public key

- [x] **Step 8: Configure React Router and Clerk Provider**
  - **Task**: Set up React Router with memory router and wrap the app in Clerk's provider.
  - **Files**:
    - `src/popup/layouts/root-layout.tsx`: Create root layout with `<ClerkProvider>` and navigation.
    - `src/popup/routes/home.tsx`: Create home page component.
    - `src/popup/routes/sign-in.tsx`: Create sign-in page with `<SignIn>` component.
    - `src/popup/routes/sign-up.tsx`: Create sign-up page with `<SignUp>` component.
    - `src/popup/routes/settings.tsx`: Create settings page with `<UserProfile>` component.
    - `src/popup/index.tsx`: Configure routes with `createMemoryRouter`.
  - **Step Dependencies**: Step 7
  - **User Instructions**: None

- [x] **Step 9: Implement Background Service Worker with Clerk**
  - **Task**: Create a background service worker that maintains fresh Clerk sessions.
  - **Files**:
    - `src/background/index.ts`: Implement `createClerkClient()` and message handling.
    - `src/utils/api.ts`: Create utility functions for making authenticated API requests.
  - **Step Dependencies**: Step 8
  - **User Instructions**: None

## Phase 1: Core Sidebar Functionality

- [x] **Step 10: Implement Sidebar UI Structure**
  - **Task**: Create React components for the sidebar UI, with sections for templates, chains, and response saving.
  - **Files**:
    - `src/components/sidebar/TemplateSection.tsx`: Component for template management section.
    - `src/components/sidebar/ChainSection.tsx`: Component for chain management section.
    - `src/components/sidebar/ResponseSection.tsx`: Component for response saving section.
    - `src/components/sidebar/Sidebar.tsx`: Main sidebar component combining all sections.
    - `src/styles/sidebar.css`: Tailwind styles for sidebar components.
  - **Step Dependencies**: None
  - **User Instructions**: None

- [x] **Step 11: Create Standalone Sidebar View**
  - **Task**: Create a standalone page to host the sidebar for development and testing.
  - **Files**:
    - `src/pages/sidebar-view.tsx`: Create a page that renders the sidebar in a full-window view.
    - `src/popup/routes/sidebar.tsx`: Add route for accessing the standalone sidebar view.
    - Update `src/popup/index.tsx`: Add route for sidebar view.
  - **Step Dependencies**: Step 10
  - **User Instructions**: Access the sidebar view through the extension popup menu.

- [x] **Step 12: Implement Template Management**
  - **Task**: Add template creation, editing, and management functionality.
  - **Files**:
    - `src/components/sidebar/template/TemplateForm.tsx`: Form component for creating/editing templates.
    - `src/components/sidebar/template/TemplateList.tsx`: List component for displaying and managing templates.
    - `src/hooks/useTemplates.ts`: Hook for template CRUD operations.
  - **Step Dependencies**: Step 11
  - **User Instructions**: None

- [x] **Step 13: Implement Template Variables**
  - **Task**: Add support for dynamic variables in templates.
  - **Files**:
    - `src/components/sidebar/template/VariableMapping.tsx`: Component for variable input fields.
    - `src/utils/template-parser.ts`: Utility for parsing and replacing template variables.
    - `src/hooks/useTemplateVariables.ts`: Hook for managing template variable state.
  - **Step Dependencies**: Step 12
  - **User Instructions**: None

- [ ] **Step 14: Implement Chain Management**
  - **Task**: Add chain creation and management functionality.
  - **Files**:
    - `src/components/sidebar/chain/ChainForm.tsx`: Form for creating/editing chains.
    - `src/components/sidebar/chain/ChainList.tsx`: List component for chains.
    - `src/hooks/useChains.ts`: Hook for chain CRUD operations.
  - **Step Dependencies**: Step 13
  - **User Instructions**: None

- [ ] **Step 15: Implement Chain Execution**
  - **Task**: Add chain execution and step processing.
  - **Files**:
    - `src/components/sidebar/chain/ChainExecutor.tsx`: Component for executing chains.
    - `src/utils/chain-executor.ts`: Logic for processing chain steps.
    - `src/hooks/useChainExecution.ts`: Hook for managing chain execution state.
  - **Step Dependencies**: Step 14
  - **User Instructions**: None

- [ ] **Step 16: Implement Response Management**
  - **Task**: Add response viewing and saving functionality.
  - **Files**:
    - `src/components/sidebar/response/ResponseViewer.tsx`: Component for viewing responses.
    - `src/components/sidebar/response/ResponseActions.tsx`: Component for response actions.
    - `src/hooks/useResponses.ts`: Hook for managing responses.
  - **Step Dependencies**: Step 15
  - **User Instructions**: None

## Phase 2: DOM Integration

- [ ] **Step 17: Implement Content Script Infrastructure**
  - **Task**: Set up basic content script structure and messaging.
  - **Files**:
    - `src/content_scripts/index.ts`: Base content script setup.
    - `src/utils/messaging.ts`: Messaging utilities between content script and background.
  - **Step Dependencies**: Step 16
  - **User Instructions**: None

- [ ] **Step 18: Implement DOM Interaction Features**
  - **Task**: Add DOM interaction capabilities to the sidebar.
  - **Files**:
    - `src/utils/dom-utils.ts`: DOM manipulation utilities.
    - `src/hooks/useDOMInteraction.ts`: Hook for managing DOM interactions.
    - Update relevant components to support DOM interaction.
  - **Step Dependencies**: Step 17
  - **User Instructions**: None

- [ ] **Step 19: Implement Site Integration**
  - **Task**: Add site-specific integrations for supported platforms.
  - **Files**:
    - `src/content_scripts/chatgpt.ts`: ChatGPT-specific integration.
    - `src/content_scripts/grok.ts`: Grok-specific integration.
  - **Step Dependencies**: Step 18
  - **User Instructions**: None

- [ ] **Step 20: Implement Toolbar and Hotkeys**
  - **Task**: Add toolbar and keyboard shortcuts for sidebar control.
  - **Files**:
    - `src/components/toolbar/Toolbar.tsx`: Floating toolbar component.
    - `src/hooks/useHotkeys.ts`: Hook for managing keyboard shortcuts.
    - `src/styles/toolbar.css`: Toolbar styles.
  - **Step Dependencies**: Step 19
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
