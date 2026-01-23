import { Router } from 'express';
import BidController from '../controllers/BidController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All bid routes require authentication
router.post('/', authenticate, BidController.placeBid);
router.get('/my-bids', authenticate, BidController.getMyBids);
router.get('/:id', authenticate, BidController.getBidById);
router.put('/:id', authenticate, BidController.increaseBid);

export default router;
