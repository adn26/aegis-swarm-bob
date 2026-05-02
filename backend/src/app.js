import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import logger from './utils/logger.js';
import { errorHandler } from './utils/errors.js';
import { initSupabase, testConnection } from './db/supabase.js';

// Import routes
import auditRoutes from './api/routes/audit.routes.js';
import streamRoutes from './api/routes/stream.routes.js';

/**
 * Create and configure Express application
 */
const createApp = () => {
  const app = express();

  // Initialize Supabase
  initSupabase();
  
  // Test database connection
  testConnection().catch(err => {
    logger.error('Failed to connect to Supabase:', err);
  });

  // Store logger in app for access in error handler
  app.set('logger', logger);

  // Middleware
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: config.security.rateLimitWindowMs,
    max: config.security.rateLimitMaxRequests,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/', limiter);

  // Request logging
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
    });
  });

  // API routes
  app.use('/api/audit', auditRoutes);
  app.use('/api/stream', streamRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'NotFound',
      message: 'The requested resource was not found',
      path: req.path,
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};

export default createApp;

// Made with Bob
