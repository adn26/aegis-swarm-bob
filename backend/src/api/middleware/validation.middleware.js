import Joi from 'joi';
import { ValidationError } from '../../utils/errors.js';

/**
 * Validation schemas
 */
const schemas = {
  auditRequest: Joi.object({
    repoUrl: Joi.string()
      .uri()
      .pattern(/^https:\/\/github\.com\/[\w-]+\/[\w.-]+/)
      .required()
      .messages({
        'string.pattern.base': 'Repository URL must be a valid GitHub repository URL',
        'string.uri': 'Repository URL must be a valid URL',
        'any.required': 'Repository URL is required',
      }),
    prNumber: Joi.number()
      .integer()
      .positive()
      .optional()
      .messages({
        'number.base': 'PR number must be a number',
        'number.integer': 'PR number must be an integer',
        'number.positive': 'PR number must be positive',
      }),
    branch: Joi.string()
      .optional()
      .messages({
        'string.base': 'Branch must be a string',
      }),
  }),
};

/**
 * Validate audit request
 */
export const validateAuditRequest = (req, res, next) => {
  const { error, value } = schemas.auditRequest.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));

    throw new ValidationError('Invalid audit request', details);
  }

  req.body = value;
  next();
};

/**
 * Generic validation middleware factory
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      throw new ValidationError('Validation failed', details);
    }

    req.body = value;
    next();
  };
};

export default { validateAuditRequest, validate };

// Made with Bob
