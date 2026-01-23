import { Request, Response } from 'express';
import BidService from '../services/BidService';
import { asyncHandler } from '../middleware/errorHandler';
import { Types } from 'mongoose';

export class BidController {
  /**
   * Размещение ставки
   * POST /api/bids
   */
  placeBid = asyncHandler(async (req: Request, res: Response) => {
    const { auctionId, amount } = req.body;
    
    const bid = await BidService.placeBid({
      auctionId: new Types.ObjectId(auctionId),
      userId: req.userId!,
      amount,
    });
    
    res.status(201).json({
      success: true,
      data: bid,
      message: 'Bid placed successfully',
    });
  });

  /**
   * Повышение ставки
   * PUT /api/bids/:id
   */
  increaseBid = asyncHandler(async (req: Request, res: Response) => {
    const { newAmount } = req.body;
    
    const bid = await BidService.increaseBid({
      bidId: new Types.ObjectId(req.params.id), 
      userId: new Types.ObjectId(req.userId!),
      newAmount,
    });
    
    res.status(200).json({
      success: true,
      data: bid,
      message: 'Bid increased successfully',
    });
  });

  /**
   * Получение ставки по ID
   * GET /api/bids/:id
   */
  getBidById = asyncHandler(async (req: Request, res: Response) => {
    const bid = await BidService.getBidById(req.params.id);
    
    res.status(200).json({
      success: true,
      data: bid,
    });
  });

  /**
   * Получение ставок текущего пользователя
   * GET /api/bids/my-bids
   */
  getMyBids = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, auctionId, status, currentRound } = req.query;
    
    const result = await BidService.getUserBids(req.userId!, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      auctionId: auctionId ? new Types.ObjectId(auctionId as string) : undefined,
      status: status as any,
      currentRound: currentRound ? parseInt(currentRound as string) : undefined,
    });
    
    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Получение leaderboard раунда
   * GET /api/auctions/:auctionId/rounds/:roundNumber/leaderboard
   */
  getRoundLeaderboard = asyncHandler(async (req: Request, res: Response) => {
    const { auctionId, roundNumber } = req.params;
    
    const leaderboard = await BidService.getRoundLeaderboard(
      auctionId,
      parseInt(roundNumber),
      req.userId // может быть undefined если не авторизован
    );
    
    res.status(200).json({
      success: true,
      data: leaderboard,
    });
  });

  /**
   * Получение позиции пользователя
   * GET /api/auctions/:auctionId/my-position
   */
  getMyPosition = asyncHandler(async (req: Request, res: Response) => {
    const { auctionId } = req.params;
    const { roundNumber } = req.query;
    
    const position = await BidService.getUserPosition(
      auctionId,
      req.userId!,
      roundNumber ? parseInt(roundNumber as string) : undefined
    );
    
    if (!position) {
      res.status(404).json({
        success: false,
        error: 'No active bid found',
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: position,
    });
  });

  /**
   * Отмена ставки
   * DELETE /api/bids/:id
   */
  cancelBid = asyncHandler(async (req: Request, res: Response) => {
    const bid = await BidService.cancelBid(req.params.id, req.userId!);
    
    res.status(200).json({
      success: true,
      data: bid,
      message: 'Bid cancelled successfully',
    });
  });

  /**
   * Получение статистики ставок аукциона
   * GET /api/auctions/:auctionId/bid-stats
   */
  getAuctionBidStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await BidService.getAuctionBidStats(req.params.auctionId);
    
    res.status(200).json({
      success: true,
      data: stats,
    });
  });
}

export default new BidController();
