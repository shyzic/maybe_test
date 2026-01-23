import { Router } from 'express';
import AuctionController from '../controllers/AuctionController';
import BidController from '../controllers/BidController';
import { authenticate, optionalAuthenticate } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/', AuctionController.getAuctions);
router.get('/:id', AuctionController.getAuctionById);
router.get('/:id/stats', AuctionController.getAuctionStats);
router.get('/:id/rounds', AuctionController.getAuctionRounds);
router.get('/:id/current-round', AuctionController.getCurrentRound);

// Leaderboard - использует BidController
router.get('/:auctionId/rounds/:roundNumber/leaderboard', optionalAuthenticate, BidController.getRoundLeaderboard);

// Bid stats
router.get('/:auctionId/bid-stats', BidController.getAuctionBidStats);

// User position (requires auth)
router.get('/:auctionId/my-position', authenticate, BidController.getMyPosition);

// Protected routes (require authentication)
router.post('/', authenticate, AuctionController.createAuction);
router.put('/:id', authenticate, AuctionController.updateAuction);
router.delete('/:id', authenticate, AuctionController.cancelAuction);
router.post('/:id/start', authenticate, AuctionController.startAuction);

export default router;
