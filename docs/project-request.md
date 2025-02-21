# Promptier Chrome Extension

## Project Description
A Chrome extension that enhances interaction with large language model (LLM) chat interfaces (specifically Grok on grok.com and ChatGPT on chat.openai.com) by allowing users to create, save, and retrieve prompt templates. Users can define dynamic variables within templates, map them to static strings or local filesystem content (e.g., code files, markdown docs) using the File System Access API, and generate prompts with injected variables. Generated prompts are copied to the clipboard for manual pasting into the chat UI, triggered either via buttons on supported sites or from the extension's sidebar. [New] The MVP now includes support for simple prompt chains to execute prompts in series and an option to write AI responses to disk as new or updated files. The extension eliminates repetitive copy-pasting, streamlining workflows like code generation or research. Templates and prompt chains are stored in a backend database, requiring a server for persistence.

## Target Audience
- Software engineers and developers using Grok or ChatGPT for code generation or debugging
- Researchers and writers leveraging LLMs for content creation or analysis
- Power users who value customizable prompt workflows and minimal manual effort

## Desired Features

### Prompt Template Management
- [ ] Users can create and save custom prompt templates
    - [ ] Input field for template text with placeholder syntax (e.g., `{{VARIABLE}}`)
    - [ ] Option to name and save templates for later use
    - [ ] Category tagging (e.g., "Coding", "Writing") for organization
    - [ ] Schema supports templates and categories
    - [ ] Templates stored in a backend database (requires server)
- [ ] [New] Users can create simple prompt chains
    - [ ] Interface to define a sequence of prompts (e.g., Prompt 1 → Prompt 2 → Prompt 3)
    - [ ] Each prompt in the chain supports its own template with dynamic variables
    - [ ] Chains saved as a single entity in the backend database
    - [ ] Execution trigger generates prompts in series, copying each to clipboard sequentially with a "Next" button in the UI
- [ ] Users can retrieve popular prompt templates
    - [ ] Include a default set (e.g., "CodeGen", "ResearchSummary") in the extension
    - [ ] [Deferred: Community library via website post-MVP]
- [ ] Users can pin templates for quick access
    - [ ] Display pinned templates as buttons in a floating toolbar on grok.com and chat.openai.com
    - [ ] [New] Pinned prompt chains displayed alongside individual templates

### Dynamic Variables
- [ ] Users can define dynamic variables within templates
    - [ ] Support for placeholder syntax (e.g., `{{YOUR CODE}}`)
    - [ ] Variables can represent any user-defined value (e.g., strings, file contents)
- [ ] Users can map variables to static strings or filesystem content
    - [ ] Text input for static string values
    - [ ] Sidebar with file picker using File System Access API
    - [ ] User grants read/write access to a directory at session start; permissions persist until session ends
    - [ ] Multiple file contents concatenated with XML tags including file paths (e.g., `<file path="/path/to/file.txt">content</file>`)
    - [ ] Simple tree visualization of selected directory (clean, accessible, non-fancy)
- [ ] Users can generate prompts with injected variables
    - [ ] Automatic replacement of placeholders with mapped values (injection method to be determined during implementation)
    - [ ] Generated prompt copied to clipboard for manual pasting into chat UI
- [ ] [New] Option to write AI responses to disk
    - [ ] Checkbox in sidebar: "Save AI response to disk"
    - [ ] When enabled, user manually pastes AI response into a text area in the sidebar
    - [ ] Extension parses response for file content (e.g., code blocks or text between delimiters like ``` or <file> tags)
    - [ ] New files saved to user-specified directory (via File System Access API) with generated names (e.g., `response_YYYYMMDD_HHMMSS.txt`) or updates existing files if file path specified in response
    - [ ] Basic overwrite confirmation if file exists

### UI and Interaction
- [ ] Floating toolbar for grok.com and chat.openai.com
    - [ ] Buttons for pinned templates and [New] prompt chains
    - [ ] Hotkey `Cmd+Shift+P` to toggle sidebar
- [ ] Extension sidebar for general use
    - [ ] Template creation and variable mapping interface
    - [ ] [New] Prompt chain creation interface (e.g., numbered list of prompts with add/remove buttons)
    - [ ] Button to generate and copy prompt to clipboard
    - [ ] [New] "Next" button for prompt chains to advance to the next prompt
    - [ ] [New] Text area and checkbox for saving AI responses to disk
    - [ ] Hotkey `Cmd+Shift+P` to toggle sidebar
- [ ] Basic error handling
    - [ ] Notify users of issues (e.g., "Variable {{X}} not mapped" or "No file content detected in response" in sidebar)

## Design Requests
- [ ] Minimalist floating toolbar for supported sites (grok.com, chat.openai.com)
    - [ ] Horizontal button layout for pinned templates and [New] prompt chains
    - [ ] Subtle hover effects for usability
- [ ] Clean sidebar for extension interface
    - [ ] Compact layout with template list, category tags, variable inputs, and generate button
    - [ ] [New] Section for prompt chain definition (e.g., collapsible list of prompts)
    - [ ] [New] Section for AI response input (text area) and save-to-disk checkbox
    - [ ] Monochrome palette with accent colors (e.g., blue for "Generate", green for "Save to Disk")
    - [ ] Simple file tree visualization in sidebar (non-fancy, accessible)
- [ ] Consistent branding across UI elements
    - [ ] Simple iconography (e.g., clipboard for copy, folder for file mapping, chain-link for prompt chains, disk for save)

## Other Notes
- Initial focus on Chrome only
- File System Access API used for directory access (requires user permission at session start)
- Backend server with database required for template and [New] prompt chain storage (e.g., Node.js + SQLite or similar)
- Basic security measures (e.g., sanitize inputs, limit file access scope)
- Post-MVP: Community library website and potential additional LLM chat UI support (e.g., Anthropic's Claude)

---

### Key Changes and Rationale
1. **Prompt Chains**:
   - Added under "Prompt Template Management" and integrated into the UI (toolbar and sidebar).
   - Allows users to define a sequence of prompts, enhancing workflow automation (e.g., "Generate code" → "Debug code" → "Optimize code").
   - Execution is manual (clipboard-based) with a "Next" button to keep the MVP simple and avoid direct LLM integration.

2. **Write AI Responses to Disk**:
   - Added as an optional feature under "Dynamic Variables" and reflected in the UI.
   - Requires manual pasting of AI responses into the sidebar to avoid real-time LLM interaction in the MVP.
   - Supports basic file creation/updating with minimal parsing (e.g., code blocks or tagged content), aligning with the File System Access API usage.
