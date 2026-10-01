'use strict';

class DomainError extends Error {}
class NotFoundError extends DomainError {}
class ConflictError extends DomainError {}
class ValidationError extends DomainError {
  constructor(message, details) {
    super(message);
    this.details = details;
  }
}

// The single place where domain errors become HTTP responses.
function toResponse(err) {
  if (err instanceof ValidationError) {
    return { status: 422, body: { error: { code: 'VALIDATION_ERROR', message: err.message, details: err.details } } };
  }
  if (err instanceof NotFoundError) {
    return { status: 404, body: { error: { code: 'NOT_FOUND', message: err.message } } };
  }
  if (err instanceof ConflictError) {
    return { status: 409, body: { error: { code: 'CONFLICT', message: err.message } } };
  }
  return { status: 500, body: { error: { code: 'INTERNAL', message: 'Internal error' } } };
}

module.exports = { DomainError, NotFoundError, ConflictError, ValidationError, toResponse };
