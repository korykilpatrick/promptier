-- This script creates the updated database schema for the Promptier application.
-- It defines tables for users, actions, templates, user_templates, favorite_templates,
-- prompt_chains, user_prompt_chains, chain_steps, user_variables, and prompt_history.

-- Create the users table to store user information linked to Clerk authentication.
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    clerk_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the actions table to define valid actions for chain_steps.
CREATE TABLE IF NOT EXISTS actions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'execute_prompt', 'save_to_disk', 'restart_chain'
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default actions into the actions table.
INSERT INTO actions (name, description) 
VALUES 
    ('execute_prompt', 'Generates and executes a prompt based on a template'),
    ('save_to_disk', 'Saves an AI response to disk with a specified file name pattern'),
    ('restart_chain', 'Restarts the prompt chain from the first step')
ON CONFLICT (name) DO NOTHING;

-- Create the templates table to store prompt templates, with created_by linking to users.
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    created_by INT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255),
    template_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the user_templates join table to link users with templates they have access to.
CREATE TABLE IF NOT EXISTS user_templates (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    template_id INT REFERENCES templates(id) ON DELETE CASCADE,
    associated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, template_id)
);

-- Create the favorite_templates join table to link users with templates they want featured in the UI.
CREATE TABLE IF NOT EXISTS favorite_templates (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    template_id INT REFERENCES templates(id) ON DELETE CASCADE,
    favorited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, template_id)
);

-- Create the prompt_chains table to store prompt chains, with created_by linking to users.
CREATE TABLE IF NOT EXISTS prompt_chains (
    id SERIAL PRIMARY KEY,
    created_by INT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the user_prompt_chains join table to link users with prompt chains they use or manage.
CREATE TABLE IF NOT EXISTS user_prompt_chains (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    prompt_chain_id INT REFERENCES prompt_chains(id) ON DELETE CASCADE,
    associated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, prompt_chain_id)
);

-- Create the chain_steps table to store individual steps within prompt chains,
-- with action referencing the actions table.
CREATE TABLE IF NOT EXISTS chain_steps (
    id SERIAL PRIMARY KEY,
    chain_id INT REFERENCES prompt_chains(id) ON DELETE CASCADE,
    action_id INT REFERENCES actions(id) ON DELETE RESTRICT,
    data JSONB, -- e.g., {"template_id": 123} or {"file_name_pattern": "response_{timestamp}.txt"}
    step_order INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the user_variables table to store persistent variables defined by users.
CREATE TABLE IF NOT EXISTS user_variables (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_variable UNIQUE (user_id, name)
);

-- Create the prompt_history table to store the history of executed prompts.
CREATE TABLE IF NOT EXISTS prompt_history (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    template_id INT REFERENCES templates(id) ON DELETE SET NULL,
    prompt_chain_id INT REFERENCES prompt_chains(id) ON DELETE SET NULL,
    prompt_text TEXT NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for foreign key columns to improve query performance.
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by);
CREATE INDEX IF NOT EXISTS idx_user_templates_user_id ON user_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_templates_template_id ON user_templates(template_id);
CREATE INDEX IF NOT EXISTS idx_favorite_templates_user_id ON favorite_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_templates_template_id ON favorite_templates(template_id);
CREATE INDEX IF NOT EXISTS idx_prompt_chains_created_by ON prompt_chains(created_by);
CREATE INDEX IF NOT EXISTS idx_user_prompt_chains_user_id ON user_prompt_chains(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prompt_chains_prompt_chain_id ON user_prompt_chains(prompt_chain_id);
CREATE INDEX IF NOT EXISTS idx_chain_steps_chain_id ON chain_steps(chain_id);
CREATE INDEX IF NOT EXISTS idx_chain_steps_action_id ON chain_steps(action_id);
CREATE INDEX IF NOT EXISTS idx_user_variables_user_id ON user_variables(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_history_user_id ON prompt_history(user_id);
CREATE INDEX IF NOT EXISTS idx_prompt_history_template_id ON prompt_history(template_id);
CREATE INDEX IF NOT EXISTS idx_prompt_history_prompt_chain_id ON prompt_history(prompt_chain_id);