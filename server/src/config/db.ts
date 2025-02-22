/**
 * @description
 * This module sets up the database connection for the Promptier server.
 * It uses the `pg` library to create a connection pool to a PostgreSQL database.
 * The exported `pool` instance is used throughout the application to execute
 * database queries, providing an efficient way to manage multiple connections.
 * 
 * Key features:
 * - Connection Pooling: Manages a pool of database connections for performance.
 * - Configurable: Allows specification of database credentials and connection details.
 * 
 * @dependencies
 * - pg: PostgreSQL client library for Node.js, used to interact with the database.
 * 
 * @notes
 * - The database credentials provided are placeholders and must be updated with
 *   actual values specific to your PostgreSQL instance.
 * - Ensure that the PostgreSQL server is running and accessible from the specified host.
 * - In a production environment, consider using environment variables or a secrets
 *   manager (e.g., AWS Secrets Manager) to handle sensitive credentials securely,
 *   rather than hardcoding them in this file.
 * - No explicit connection testing is included here; connection errors will surface
 *   when queries are executed (e.g., in Step 3 during schema creation).
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Verify required environment variables are present
const requiredEnvVars = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
}

// Create a new Pool instance with configuration from environment variables
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

export default pool;