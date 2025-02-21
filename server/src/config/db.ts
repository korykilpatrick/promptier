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

// Create a new Pool instance with placeholder configuration
// This pool manages database connections and is reused across the application
const pool = new Pool({
  user: 'postgres',     // Replace with your PostgreSQL username
  host: 'localhost',         // Replace with your PostgreSQL host (e.g., 'localhost' or a remote IP)
  database: 'promptier', // Replace with your PostgreSQL database name
  password: '', // Replace with your PostgreSQL password
  port: 5432,                // Replace with your PostgreSQL port if different (5432 is the default)
});

export default pool;