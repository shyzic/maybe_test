import { Router } from 'express';
import authRoutes from './auth.routes';
import auctionRoutes from './auction.routes';
import bidRoutes from './bid.routes';
import userRoutes from './user.routes';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auction API is running',
    timestamp: new Date().toISOString(),
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/auctions', auctionRoutes);
router.use('/bids', bidRoutes);
router.use('/users', userRoutes);

export default router;
