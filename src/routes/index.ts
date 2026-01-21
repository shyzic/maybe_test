import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import auctionRoutes from './auction.routes';
import bidRoutes from './bid.routes';

const router = Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/auctions', auctionRoutes);
router.use('/bids', bidRoutes);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
