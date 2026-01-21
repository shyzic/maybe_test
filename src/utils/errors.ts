export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(message: string = 'Insufficient balance') {
    super(message, 400);
  }
}

export class AuctionNotActiveError extends AppError {
  constructor(message: string = 'Auction is not active') {
    super(message, 400);
  }
}

export class RoundNotActiveError extends AppError {
  constructor(message: string = 'Round is not active') {
    super(message, 400);
  }
}

export class BidTooLowError extends AppError {
  constructor(message: string = 'Bid amount is too low') {
    super(message, 400);
  }
}

export class ConcurrentModificationError extends AppError {
  constructor(message: string = 'Concurrent modification detected') {
    super(message, 409);
  }
}
