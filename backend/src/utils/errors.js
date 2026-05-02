/**
 * Custom error classes for Aegis Swarm
 */

export class AegisError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

export class ValidationError extends AegisError {
  constructor(message, details = null) {
    super(message, 400, details);
  }
}

export class NotFoundError extends AegisError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AegisError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
  }
}

export class RateLimitError extends AegisError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429);
  }
}

export class GitHubError extends AegisError {
  constructor(message, details = null) {
    super(`GitHub API error: ${message}`, 502, details);
  }
}

export class CloneError extends AegisError {
  constructor(repoUrl, details = null) {
    super(`Failed to clone repository: ${repoUrl}`, 500, details);
  }
}

export class ScanError extends AegisError {
  constructor(message, details = null) {
    super(`File scanning error: ${message}`, 500, details);
  }
}

export class AgentError extends AegisError {
  constructor(agentName, message, details = null) {
    super(`${agentName} agent error: ${message}`, 500, details);
  }
}

export class SandboxError extends AegisError {
  constructor(message, details = null) {
    super(`Sandbox execution error: ${message}`, 500, details);
  }
}

export class DatabaseError extends AegisError {
  constructor(message, details = null) {
    super(`Database error: ${message}`, 500, details);
  }
}

export class ReportGenerationError extends AegisError {
  constructor(message, details = null) {
    super(`Report generation error: ${message}`, 500, details);
  }
}

/**
 * Error handler middleware for Express
 */
export const errorHandler = (err, req, res, next) => {
  // Log error
  const logger = req.app.get('logger');
  if (logger) {
    logger.error('Error occurred:', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // Handle known errors
  if (err instanceof AegisError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Handle validation errors from Joi
  if (err.name === 'ValidationError' && err.isJoi) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid request data',
      details: err.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      })),
    });
  }

  // Handle unknown errors
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    error: 'InternalServerError',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Made with Bob
