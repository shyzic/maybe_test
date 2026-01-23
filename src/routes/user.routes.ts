import { Router } from 'express';
import UserController from '../controllers/UserController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.get('/me', authenticate, UserController.getMe);
router.get('/me/balance', authenticate, UserController.getBalance);
router.post('/me/deposit', authenticate, UserController.deposit);
router.get('/me/transactions', authenticate, UserController.getTransactions);
router.get('/me/wins', authenticate, UserController.getMyWins);

export default router;
