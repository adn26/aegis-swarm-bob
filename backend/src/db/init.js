import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialize the SQLite database
 */
export const initDatabase = () => {
  try {
    // Ensure data directory exists
    const dbDir = path.dirname(config.database.path);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      logger.info(`Created database directory: ${dbDir}`);
    }

    // Create database connection
    const db = new Database(config.database.path);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema (split by semicolon and filter empty statements)
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    for (const statement of statements) {
      db.exec(statement);
    }
    
    logger.info('Database initialized successfully');
    
    return db;
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
};

/**
 * Get database connection
 */
export const getDatabase = () => {
  if (!global.db) {
    global.db = initDatabase();
  }
  return global.db;
};

/**
 * Close database connection
 */
export const closeDatabase = () => {
  if (global.db) {
    global.db.close();
    global.db = null;
    logger.info('Database connection closed');
  }
};

// Initialize database if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase();
  logger.info('Database initialization complete');
  process.exit(0);
}

export default { initDatabase, getDatabase, closeDatabase };

// Made with Bob
