import { Router } from 'express';
import UserController from '../controllers/UserController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.get('/me', authenticate, UserController.getMe);
router.put('/me', authenticate, UserController.updateProfile);
router.get('/me/balance', authenticate, UserController.getBalance);
router.post('/me/deposit', authenticate, UserController.deposit);
router.post('/me/withdraw', authenticate, UserController.withdraw);
router.get('/me/transactions', authenticate, UserController.getTransactions);
router.get('/me/wins', authenticate, UserController.getMyWins);
router.get('/me/stats', authenticate, UserController.getStats);

// Public user profile
router.get('/:id', UserController.getUserProfile);

export default router;
