/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         username:
 *           type: string
 *         email:
 *           type: string
 *         balance:
 *           type: number
 *         reservedBalance:
 *           type: number
 *     
 *     Auction:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         totalItems:
 *           type: number
 *         itemsPerRound:
 *           type: number
 *         status:
 *           type: string
 *           enum: [scheduled, active, paused, completed, cancelled]
 *     
 *     Bid:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         auctionId:
 *           type: string
 *         userId:
 *           type: string
 *         amount:
 *           type: number
 *         status:
 *           type: string
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   - name: Authentication
 *     description: User authentication endpoints
 *   - name: Users
 *     description: User management endpoints
 *   - name: Auctions
 *     description: Auction management endpoints
 *   - name: Bids
 *     description: Bidding endpoints
 */