import { Types } from 'mongoose';

/**
 * Проверяет валидность ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

/**
 * Конвертирует строку в ObjectId
 */
export function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

/**
 * Вычисляет общее количество раундов
 */
export function calculateTotalRounds(totalItems: number, itemsPerRound: number): number {
  return Math.ceil(totalItems / itemsPerRound);
}

/**
 * Вычисляет количество товаров в конкретном раунде
 */
export function calculateItemsInRound(
  roundNumber: number,
  totalItems: number,
  itemsPerRound: number,
  totalRounds: number
): number {
  if (roundNumber === totalRounds) {
    return totalItems - (totalRounds - 1) * itemsPerRound;
  }
  return itemsPerRound;
}

/**
 * Вычисляет начальный номер предмета для раунда
 */
export function calculateStartItemNumber(
  roundNumber: number,
  itemsPerRound: number
): number {
  return (roundNumber - 1) * itemsPerRound + 1;
}

/**
 * Проверяет, находится ли текущее время в anti-snipe окне
 */
export function isInAntiSnipeWindow(
  currentTime: Date,
  roundEndTime: Date,
  antiSnipeWindow: number
): boolean {
  const timeUntilEnd = roundEndTime.getTime() - currentTime.getTime();
  return timeUntilEnd <= antiSnipeWindow * 1000 && timeUntilEnd > 0;
}

/**
 * Генерирует задержку для тестов (мс)
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Форматирует сумму для отображения
 */
export function formatAmount(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency}`;
}

/**
 * Парсит дату из различных форматов
 */
export function parseDate(date: string | Date): Date {
  if (date instanceof Date) {
    return date;
  }
  return new Date(date);
}

/**
 * Проверяет, является ли дата в будущем
 */
export function isFutureDate(date: Date): boolean {
  return date.getTime() > Date.now();
}

/**
 * Добавляет секунды к дате
 */
export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

/**
 * Вычисляет минимальную следующую ставку
 */
export const calculateMinNextBid = (currentBid: number, stepPercentage: number): number => {
  const minBid = currentBid * (1 + stepPercentage / 100);
  return Number(minBid.toFixed(2)); // Сохранит точность до 2 знаков
};

/**
 * Генерирует случайное число в диапазоне
 */
export function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Генерирует UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
