import { Request, Response } from 'express';
import AuctionService from '../services/AuctionService';
import RoundService from '../services/RoundService';
import { asyncHandler } from '../middleware/errorHandler';

export class AuctionController {
  /**
   * Создание аукциона
   * POST /api/auctions
   */
  createAuction = asyncHandler(async (req: Request, res: Response) => {
    const {
      name,
      description,
      imageUrl,
      totalItems,
      itemsPerRound,
      startTime,
      roundDuration,
      antiSnipeWindow,
      antiSnipeExtension,
      maxExtensions,
      minBid,
      minBidStep,
      currency,
    } = req.body;
    
    const auction = await AuctionService.createAuction({
      name,
      description,
      imageUrl,
      totalItems,
      itemsPerRound,
      startTime,
      roundDuration,
      antiSnipeWindow,
      antiSnipeExtension,
      maxExtensions,
      minBid,
      minBidStep,
      currency,
      createdBy: req.userId!,
    });
    
    res.status(201).json({
      success: true,
      data: auction,
      message: `Auction created with ${auction.totalRounds} rounds`,
    });
  });

  /**
   * Получение списка аукционов
   * GET /api/auctions
   */
  getAuctions = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, status, createdBy } = req.query;
    
    const result = await AuctionService.getAuctions({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      status: status as any,
      createdBy: createdBy as any,
    });
    
    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Получение аукциона по ID
   * GET /api/auctions/:id
   */
  getAuctionById = asyncHandler(async (req: Request, res: Response) => {
    const auction = await AuctionService.getAuctionById(req.params.id);
    
    res.status(200).json({
      success: true,
      data: auction,
    });
  });

  /**
   * Обновление аукциона
   * PUT /api/auctions/:id
   */
  updateAuction = asyncHandler(async (req: Request, res: Response) => {
    const { name, description, imageUrl, status } = req.body;
    
    const auction = await AuctionService.updateAuction(req.params.id, {
      name,
      description,
      imageUrl,
      status,
    });
    
    res.status(200).json({
      success: true,
      data: auction,
      message: 'Auction updated successfully',
    });
  });

  /**
   * Отмена аукциона
   * DELETE /api/auctions/:id
   */
  cancelAuction = asyncHandler(async (req: Request, res: Response) => {
    const auction = await AuctionService.cancelAuction(req.params.id);
    
    res.status(200).json({
      success: true,
      data: auction,
      message: 'Auction cancelled successfully',
    });
  });

  /**
   * Запуск аукциона
   * POST /api/auctions/:id/start
   */
  startAuction = asyncHandler(async (req: Request, res: Response) => {
    const auction = await AuctionService.startAuction(req.params.id);
    
    res.status(200).json({
      success: true,
      data: auction,
      message: 'Auction started successfully',
    });
  });

  /**
   * Получение статистики аукциона
   * GET /api/auctions/:id/stats
   */
  getAuctionStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await AuctionService.getAuctionStats(req.params.id);
    
    res.status(200).json({
      success: true,
      data: stats,
    });
  });

  /**
   * Получение раундов аукциона
   * GET /api/auctions/:id/rounds
   */
  getAuctionRounds = asyncHandler(async (req: Request, res: Response) => {
    const { status, roundNumber } = req.query;
    
    const rounds = await RoundService.getAuctionRounds(req.params.id, {
      status: status as any,
      roundNumber: roundNumber ? parseInt(roundNumber as string) : undefined,
    });
    
    res.status(200).json({
      success: true,
      data: rounds,
    });
  });

  /**
   * Получение текущего раунда
   * GET /api/auctions/:id/current-round
   */
  getCurrentRound = asyncHandler(async (req: Request, res: Response) => {
    const round = await RoundService.getCurrentRound(req.params.id);
    
    if (!round) {
      res.status(404).json({
        success: false,
        error: 'No active round found',
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: round,
    });
  });
}

export default new AuctionController();
