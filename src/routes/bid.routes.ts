import { Router } from 'express';
import BidController from '../controllers/BidController';
import { authenticate, optionalAuthenticate } from '../middleware/auth';
import { validateBody, validateFields } from '../middleware/validation';

const router = Router();

/**
 * @swagger
 * /api/bids:
 *   post:
 *     summary: Place a bid
 *     tags: [Bids]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - auctionId
 *               - amount
 *             properties:
 *               auctionId:
 *                 type: string
 *               amount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Bid placed successfully
 */
router.post(
  '/',
  authenticate,
  validateBody,
  validateFields(['auctionId', 'amount']),
  BidController.placeBid
);

/**
 * @swagger
 * /api/bids/{id}:
 *   put:
 *     summary: Increase bid amount
 *     tags: [Bids]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newAmount
 *             properties:
 *               newAmount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Bid increased
 */
router.put(
  '/:id',
  authenticate,
  validateBody,
  validateFields(['newAmount']),
  BidController.increaseBid
);

/**
 * @swagger
 * /api/bids/{id}:
 *   get:
 *     summary: Get bid by ID
 *     tags: [Bids]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bid details
 */
router.get('/:id', BidController.getBidById);

/**
 * @swagger
 * /api/bids/my-bids:
 *   get:
 *     summary: Get my bids
 *     tags: [Bids]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's bids
 */
router.get('/my-bids', authenticate, BidController.getMyBids);

router.get('/auctions/:auctionId/rounds/:roundNumber/leaderboard', optionalAuthenticate, BidController.getRoundLeaderboard);
router.get('/auctions/:auctionId/my-position', authenticate, BidController.getMyPosition);
router.delete('/:id', authenticate, BidController.cancelBid);
router.get('/auctions/:auctionId/bid-stats', BidController.getAuctionBidStats);

export default router;