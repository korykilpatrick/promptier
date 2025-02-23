# Implementation Plan

Below is a detailed, step-by-step plan to build the Promptier Chrome extension and its backend server. Each step is designed to be implemented in a single iteration, modifying a limited number of files, and building logically on previous steps. Steps 1–13 have been completed, establishing the server, database, authentication, and core frontend components with mock data. Starting from Step 14, the focus shifts to integrating the frontend and backend.

## NOTES

- **Logical Progression**: Steps assume that server setup (Steps 1–6) and frontend setup (Steps 7–13) are complete. Integration leverages existing APIs and components.
- **Modularity**: Each step is self-contained with clear deliverables, typically modifying 1–3 components or functions.
- **User Involvement**: Instructions guide you through testing each deliverable (e.g., via UI interactions or database checks).
- **Deliverables**: Steps include user stories where applicable, or concrete testable outcomes (e.g., API responses, UI updates) for smaller tasks.

## Server Setup (Completed)

- [x] **Step 1: Initialize Server Project**
- [x] **Step 2: Set Up Database Connection**
- [x] **Step 3: Create Database Schema**
- [x] **Step 4: Implement Clerk Authentication on Server**
- [x] **Step 5: Implement API Routes for Templates**
- [x] **Step 6: Implement API Routes for Prompt Chains**

## Chrome Extension Setup (Completed)

- [x] **Step 7: Initialize Plasmo Extension Project**
- [x] **Step 8: Configure React Router and Clerk Provider**
- [x] **Step 9: Implement Background Service Worker with Clerk**

## Phase 1: Core Sidebar Functionality (Partially Completed)

- [x] **Step 10: Implement Sidebar UI Structure**
- [x] **Step 11: Create Standalone Sidebar View**
- [x] **Step 12: Implement Template Management**
- [x] **Step 13: Implement Template Variables**

## Phase 1: Frontend-Backend Integration (Starting from Step 14)

- [x] **Step 14: Fetch Templates from Backend in `useTemplates` Hook**
  - **Task**: Update the `fetchTemplates` function in the `useTemplates` hook to call the `/templates` GET API route using `makeApiRequest`, replacing mock data.
  - **Deliverable**: **User Story**: "As a user, when I open the sidebar, I see my saved templates fetched from the backend." Test by manually inserting templates into the `templates` table in your database (e.g., via `psql`) and verifying they appear in the `TemplateSection` component.
  - **User Instructions**: Ensure the server is running, insert a template (e.g., `INSERT INTO templates (created_by, name, template_text, is_pinned) VALUES (1, 'Test Template', 'Hello {{name}}', false);`), then open the sidebar to confirm the template appears.

- [ ] **Step 15: Create Templates via Backend in `useTemplates` Hook**
  - **Task**: Modify the `createTemplate` function in the `useTemplates` hook to send a POST request to the `/templates` API route using `makeApiRequest`, replacing mock data logic.
  - **Deliverable**: **User Story**: "As a user, I can create a new template in the sidebar, and it saves to the backend." Test by creating a template via the `TemplateForm`, then checking the database to confirm it’s saved and appears in the `TemplateList`.
  - **User Instructions**: Open the sidebar, click "Create New Template," fill out the form, submit it, and verify the new template appears in the UI and exists in the `templates` table.

- [ ] **Step 16: Update Templates via Backend in `useTemplates` Hook**
  - **Task**: Adjust the `updateTemplate` function in the `useTemplates` hook to send a PUT request to the `/templates/:id` API route using `makeApiRequest`, replacing mock updates.
  - **Deliverable**: **User Story**: "As a user, I can edit an existing template, and the changes save to the backend." Test by editing a template in the `TemplateForm`, then confirming the update in the database and UI.
  - **User Instructions**: Select a template, click "Edit," modify it, submit, and check that the changes reflect in the `TemplateList` and database.

- [ ] **Step 17: Delete Templates via Backend in `useTemplates` Hook**
  - **Task**: Update the `deleteTemplate` function in the `useTemplates` hook to send a DELETE request to the `/templates/:id` API route using `makeApiRequest`, replacing mock deletion.
  - **Deliverable**: **User Story**: "As a user, I can delete a template, and it’s removed from the backend." Test by deleting a template from the `TemplateList`, then verifying it’s gone from the UI and database.
  - **User Instructions**: Select a template, click "Delete," confirm the action, and ensure it disappears from the sidebar and `templates` table.

- [ ] **Step 18: Pin and Unpin Templates via Backend in `useTemplates` Hook**
  - **Task**: Ensure `pinTemplate` and `unpinTemplate` functions in the `useTemplates` hook update the `is_pinned` field via the `/templates/:id` PUT API route using `makeApiRequest`.
  - **Deliverable**: **User Story**: "As a user, I can pin/unpin templates, and the status persists in the backend." Test by pinning a template, checking it moves to the pinned section, unpinning it, and verifying the database updates.
  - **User Instructions**: Click the pin icon on a template, confirm it appears in the pinned section, unpin it, and check the `is_pinned` field in the database.

- [ ] **Step 19: Create `useChains` Hook for Chain Management**
  - **Task**: Implement a new `useChains` hook with functions (`fetchChains`, `createChain`, `updateChain`, `deleteChain`) using `makeApiRequest` to interact with the `/chains` API routes.
  - **Deliverable**: Concrete outcome: The `useChains` hook is created and can make API calls. Test by calling `fetchChains` in a test component and logging the response.
  - **User Instructions**: Add a temporary test component calling `fetchChains`, log the result, and confirm it returns an empty array or existing chains from the database.

- [ ] **Step 20: Fetch Chains from Backend in `ChainSection`**
  - **Task**: Integrate the `useChains` hook into the `ChainSection` component and use `fetchChains` to load chains from the `/chains` GET API route.
  - **Deliverable**: **User Story**: "As a user, when I expand the Chains section, I see my saved prompt chains from the backend." Test by adding a chain to the `prompt_chains` table and verifying it appears in the `ChainSection`.
  - **User Instructions**: Insert a chain (e.g., `INSERT INTO prompt_chains (created_by, name) VALUES (1, 'Test Chain');`), expand the Chains section, and confirm it displays.

- [ ] **Step 21: Create Chains via Backend in `ChainSection`**
  - **Task**: Use the `createChain` function from the `useChains` hook in the `ChainSection` to send a POST request to the `/chains` API route when creating a chain.
  - **Deliverable**: **User Story**: "As a user, I can create a new prompt chain, and it saves to the backend." Test by clicking "Create New Chain," adding a chain, and checking the database and UI.
  - **User Instructions**: Click "Create New Chain," submit a name, and verify it’s added to the `ChainSection` and `prompt_chains` table.

- [ ] **Step 22: Update Chains via Backend in `ChainSection`**
  - **Task**: Implement chain updating in the `ChainSection` using the `updateChain` function from the `useChains` hook to call the `/chains/:id` PUT API route.
  - **Deliverable**: **User Story**: "As a user, I can edit a prompt chain, and the changes save to the backend." Test by editing a chain’s name, then confirming the update in the database and UI.
  - **User Instructions**: Select a chain, edit its name, submit, and check that it updates in the `ChainSection` and `prompt_chains` table.

- [ ] **Step 23: Delete Chains via Backend in `ChainSection`**
  - **Task**: Use the `deleteChain` function from the `useChains` hook in the `ChainSection` to send a DELETE request to the `/chains/:id` API route.
  - **Deliverable**: **User Story**: "As a user, I can delete a prompt chain, and it’s removed from the backend." Test by deleting a chain and verifying it’s gone from the UI and database.
  - **User Instructions**: Select a chain, delete it, confirm the action, and ensure it’s removed from the `ChainSection` and `prompt_chains` table.

## Phase 2: Enhance Reliability and Testing

- [ ] **Step 24: Add Error Handling for API Calls**
  - **Task**: Enhance the `useTemplates` and `useChains` hooks to handle API errors (e.g., network failures, 401s) and display them via the `Toast` component.
  - **Deliverable**: **User Story**: "As a user, if an API call fails, I see an error message in the UI." Test by disconnecting from the internet, performing an action (e.g., fetching templates), and confirming an error toast appears.
  - **User Instructions**: Disconnect from the internet, open the sidebar, and verify an error message shows via the `ToastContainer`.

- [ ] **Step 25: Write Tests for Key Functionalities**
  - **Task**: Add unit tests for template parsing in `template-parser.ts` and E2E tests for template creation and chain execution workflows.
  - **Deliverable**: Concrete outcome: Tests pass, ensuring core features work reliably. Test by running the test suite and confirming all tests succeed.
  - **User Instructions**: Install Jest and Playwright (`pnpm add -D jest playwright`), write tests, run `npx jest` and `npx playwright test`, and verify all pass.

## Phase 3: DOM Integration (Deferred)

- Steps for DOM integration (e.g., content scripts, toolbar, hotkeys) will follow after frontend-backend integration is complete, as per your request to prioritize integration first.

## Summary

This updated guide starts integrating the frontend and backend from Step 14, replacing mock data with real API calls. Each step is small, with clear deliverables—either user stories or testable outcomes—ensuring you can verify progress incrementally. After completing template and chain management (Steps 14–23), reliability is enhanced with error handling and testing (Steps 24–25). DOM integration steps are deferred to focus on your immediate integration needs.
