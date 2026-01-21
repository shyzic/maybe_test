import { Router } from 'express';
import AuctionController from '../controllers/AuctionController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { validateBody } from '../middleware/validation';

const router = Router();

/**
 * @swagger
 * /api/auctions:
 *   get:
 *     summary: Get all auctions
 *     tags: [Auctions]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of auctions
 */
router.get('/', AuctionController.getAuctions);

/**
 * @swagger
 * /api/auctions:
 *   post:
 *     summary: Create new auction
 *     tags: [Auctions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - totalItems
 *               - itemsPerRound
 *               - startTime
 *               - roundDuration
 *               - minBid
 *               - minBidStep
 *               - currency
 *             properties:
 *               name:
 *                 type: string
 *               totalItems:
 *                 type: number
 *               itemsPerRound:
 *                 type: number
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               roundDuration:
 *                 type: number
 *               minBid:
 *                 type: number
 *               minBidStep:
 *                 type: number
 *               currency:
 *                 type: string
 *     responses:
 *       201:
 *         description: Auction created
 */
router.post('/', authenticate, requireAdmin, validateBody, AuctionController.createAuction);

/**
 * @swagger
 * /api/auctions/{id}:
 *   get:
 *     summary: Get auction by ID
 *     tags: [Auctions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Auction details
 *       404:
 *         description: Auction not found
 */
router.get('/:id', AuctionController.getAuctionById);

router.put('/:id', authenticate, requireAdmin, validateBody, AuctionController.updateAuction);
router.delete('/:id', authenticate, requireAdmin, AuctionController.cancelAuction);
router.post('/:id/start', authenticate, requireAdmin, AuctionController.startAuction);
router.get('/:id/stats', AuctionController.getAuctionStats);
router.get('/:id/rounds', AuctionController.getAuctionRounds);
router.get('/:id/current-round', AuctionController.getCurrentRound);

export default router;