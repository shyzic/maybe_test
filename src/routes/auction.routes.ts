import { Router } from 'express';
import AuctionController from '../controllers/AuctionController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', AuctionController.getAuctions);
router.get('/:id', AuctionController.getAuctionById);
router.get('/:id/rounds', AuctionController.getAuctionRounds);
router.get('/:id/current-round', AuctionController.getCurrentRound);
router.get('/:id/rounds/:roundNum/leaderboard', AuctionController.getRoundLeaderboard);

// Protected routes (require authentication)
router.post('/', authenticate, AuctionController.createAuction);
router.put('/:id', authenticate, AuctionController.updateAuction);
router.post('/:id/start', authenticate, AuctionController.startAuction);

export default router;
