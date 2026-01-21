import { Types } from 'mongoose';
import { CONSTANTS } from '../config/constants';
import { ValidationError } from './errors';

/**
 * Валидация ObjectId
 */
export function validateObjectId(id: string, fieldName: string = 'ID'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new ValidationError(`Invalid ${fieldName}: must be a valid ObjectId`);
  }
}

/**
 * Валидация required полей
 */
export function validateRequired(value: any, fieldName: string): void {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
}

/**
 * Валидация строки
 */
export function validateString(
  value: string,
  fieldName: string,
  options?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  }
): void {
  validateRequired(value, fieldName);
  
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }
  
  const trimmed = value.trim();
  
  if (options?.minLength && trimmed.length < options.minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${options.minLength} characters long`
    );
  }
  
  if (options?.maxLength && trimmed.length > options.maxLength) {
    throw new ValidationError(
      `${fieldName} must be at most ${options.maxLength} characters long`
    );
  }
  
  if (options?.pattern && !options.pattern.test(trimmed)) {
    throw new ValidationError(`${fieldName} has invalid format`);
  }
}

/**
 * Валидация числа
 */
export function validateNumber(
  value: number,
  fieldName: string,
  options?: {
    min?: number;
    max?: number;
    integer?: boolean;
  }
): void {
  validateRequired(value, fieldName);
  
  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(`${fieldName} must be a number`);
  }
  
  if (options?.integer && !Number.isInteger(value)) {
    throw new ValidationError(`${fieldName} must be an integer`);
  }
  
  if (options?.min !== undefined && value < options.min) {
    throw new ValidationError(`${fieldName} must be at least ${options.min}`);
  }
  
  if (options?.max !== undefined && value > options.max) {
    throw new ValidationError(`${fieldName} must be at most ${options.max}`);
  }
}

/**
 * Валидация email
 */
export function validateEmail(email: string): void {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  validateString(email, 'Email', {
    pattern: emailPattern,
    maxLength: 255,
  });
}

/**
 * Валидация username
 */
export function validateUsername(username: string): void {
  const usernamePattern = /^[a-zA-Z0-9_-]+$/;
  validateString(username, 'Username', {
    minLength: 3,
    maxLength: 50,
    pattern: usernamePattern,
  });
}

/**
 * Валидация пароля
 */
export function validatePassword(password: string): void {
  validateString(password, 'Password', {
    minLength: 6,
    maxLength: 100,
  });
}

/**
 * Валидация даты
 */
export function validateDate(date: Date | string, fieldName: string): Date {
  validateRequired(date, fieldName);
  
  const parsedDate = date instanceof Date ? date : new Date(date);
  
  if (isNaN(parsedDate.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date`);
  }
  
  return parsedDate;
}

/**
 * Валидация будущей даты
 */
export function validateFutureDate(date: Date | string, fieldName: string): Date {
  const parsedDate = validateDate(date, fieldName);
  
  if (parsedDate.getTime() <= Date.now()) {
    throw new ValidationError(`${fieldName} must be in the future`);
  }
  
  return parsedDate;
}

/**
 * Валидация суммы денег
 */
export function validateAmount(amount: number, fieldName: string = 'Amount'): void {
  validateNumber(amount, fieldName, {
    min: 0.01,
  });
}

/**
 * Валидация параметров аукциона
 */
export function validateAuctionParams(params: {
  totalItems: number;
  itemsPerRound: number;
  roundDuration: number;
  antiSnipeWindow: number;
  antiSnipeExtension: number;
  maxExtensions?: number;
  minBid: number;
  minBidStep: number;
}): void {
  // Total items
  validateNumber(params.totalItems, 'Total items', {
    integer: true,
    min: 1,
    max: CONSTANTS.MAX_TOTAL_ITEMS,
  });
  
  // Items per round
  validateNumber(params.itemsPerRound, 'Items per round', {
    integer: true,
    min: 1,
    max: CONSTANTS.MAX_ITEMS_PER_ROUND,
  });
  
  // Round duration
  validateNumber(params.roundDuration, 'Round duration', {
    integer: true,
    min: CONSTANTS.MIN_ROUND_DURATION,
    max: CONSTANTS.MAX_ROUND_DURATION,
  });
  
  // Anti-snipe window
  validateNumber(params.antiSnipeWindow, 'Anti-snipe window', {
    integer: true,
    min: CONSTANTS.MIN_ANTI_SNIPE_WINDOW,
    max: CONSTANTS.MAX_ANTI_SNIPE_WINDOW,
  });
  
  // Anti-snipe extension
  validateNumber(params.antiSnipeExtension, 'Anti-snipe extension', {
    integer: true,
    min: CONSTANTS.MIN_ANTI_SNIPE_EXTENSION,
    max: CONSTANTS.MAX_ANTI_SNIPE_EXTENSION,
  });
  
  // Max extensions
  if (params.maxExtensions !== undefined) {
    validateNumber(params.maxExtensions, 'Max extensions', {
      integer: true,
      min: 0,
      max: CONSTANTS.MAX_EXTENSIONS_LIMIT,
    });
  }
  
  // Min bid
  validateAmount(params.minBid, 'Minimum bid');
  
  // Min bid step
  validateNumber(params.minBidStep, 'Minimum bid step', {
    min: CONSTANTS.MIN_BID_STEP_PERCENT,
    max: CONSTANTS.MAX_BID_STEP_PERCENT,
  });
  
  // Логические проверки
  if (params.antiSnipeWindow >= params.roundDuration) {
    throw new ValidationError(
      'Anti-snipe window must be less than round duration'
    );
  }
}

/**
 * Валидация параметров пагинации
 */
export function validatePagination(params: {
  page?: number;
  limit?: number;
}): { page: number; limit: number } {
  const page = params.page || 1;
  const limit = params.limit || CONSTANTS.DEFAULT_PAGE_SIZE;
  
  validateNumber(page, 'Page', {
    integer: true,
    min: 1,
  });
  
  validateNumber(limit, 'Limit', {
    integer: true,
    min: 1,
    max: CONSTANTS.MAX_PAGE_SIZE,
  });
  
  return { page, limit };
}

/**
 * Валидация enum значения
 */
export function validateEnum<T extends string>(
  value: string,
  enumValues: readonly T[],
  fieldName: string
): void {
  if (!enumValues.includes(value as T)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${enumValues.join(', ')}`
    );
  }
}

/**
 * Санитизация строки
 */
export function sanitizeString(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
