-- Migration to modify variable value column to JSONB format
-- This allows for storing complex data structures including file collections and directories

-- First, ensure the column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_variables' AND column_name = 'value'
    ) THEN
        -- Alter the column type to JSONB with a migration strategy
        -- 1. Add a temporary JSONB column
        ALTER TABLE user_variables ADD COLUMN value_jsonb JSONB;
        
        -- 2. Convert existing text values to simple JSONB format
        UPDATE user_variables SET value_jsonb = 
            jsonb_build_array(
                jsonb_build_object(
                    'type', 'text',
                    'value', value
                )
            );
        
        -- 3. Drop the old column
        ALTER TABLE user_variables DROP COLUMN value;
        
        -- 4. Rename the new column to the original name
        ALTER TABLE user_variables RENAME COLUMN value_jsonb TO value;
        
        -- 5. Set NOT NULL constraint
        ALTER TABLE user_variables ALTER COLUMN value SET NOT NULL;
    END IF;
END$$;

-- Add a comment on the column to document its purpose
COMMENT ON COLUMN user_variables.value IS 'JSONB array containing objects with type and value fields. Supports text, file, and directory data, potentially in combinations.'; 