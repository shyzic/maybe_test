import { Router } from 'express';
import UserController from '../controllers/UserController';
import { authenticate } from '../middleware/auth';
import { validateBody, validateFields } from '../middleware/validation';

const router = Router();

/**
 * @route   GET /api/users/:id
 * @desc    Получение профиля пользователя
 * @access  Public
 */
router.get('/:id', UserController.getUserProfile);

/**
 * @route   PUT /api/users/me
 * @desc    Обновление своего профиля
 * @access  Private
 */
router.put('/me', authenticate, validateBody, UserController.updateProfile);

/**
 * @route   GET /api/users/me/balance
 * @desc    Получение баланса
 * @access  Private
 */
router.get('/me/balance', authenticate, UserController.getBalance);

/**
 * @route   POST /api/users/me/deposit
 * @desc    Пополнение баланса
 * @access  Private
 */
router.post(
  '/me/deposit',
  authenticate,
  validateBody,
  validateFields(['amount']),
  UserController.deposit
);

/**
 * @route   POST /api/users/me/withdraw
 * @desc    Вывод средств
 * @access  Private
 */
router.post(
  '/me/withdraw',
  authenticate,
  validateBody,
  validateFields(['amount']),
  UserController.withdraw
);

/**
 * @route   GET /api/users/me/transactions
 * @desc    Получение транзакций
 * @access  Private
 */
router.get('/me/transactions', authenticate, UserController.getTransactions);

/**
 * @route   GET /api/users/me/stats
 * @desc    Получение статистики
 * @access  Private
 */
router.get('/me/stats', authenticate, UserController.getStats);

export default router;