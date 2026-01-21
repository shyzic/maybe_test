import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import UserService from '../services/UserService';
import logger from '../utils/logger';
import { Types } from 'mongoose';

export class WebSocketServer {
  private io: Server;
  private connectedUsers: Map<string, string>; // userId -> socketId

  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*', // В продакшене указать конкретные origins
        methods: ['GET', 'POST'],
      },
    });

    this.connectedUsers = new Map();
    this.initialize();
  }

  private initialize(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Аутентификация
      socket.on('authenticate', async (token: string) => {
        try {
          const userId = UserService.verifyToken(token);
          socket.data.userId = userId.toString();
          this.connectedUsers.set(userId.toString(), socket.id);
          
          socket.emit('authenticated', { userId: userId.toString() });
          logger.info(`User authenticated: ${userId}`);
        } catch (error) {
          socket.emit('error', { message: 'Authentication failed' });
          logger.error('WebSocket auth error:', error);
        }
      });

      // Подписка на аукцион
      socket.on('subscribe:auction', (auctionId: string) => {
        socket.join(`auction:${auctionId}`);
        logger.info(`Socket ${socket.id} subscribed to auction ${auctionId}`);
      });

      // Отписка от аукциона
      socket.on('unsubscribe:auction', (auctionId: string) => {
        socket.leave(`auction:${auctionId}`);
        logger.info(`Socket ${socket.id} unsubscribed from auction ${auctionId}`);
      });

      // Отключение
      socket.on('disconnect', () => {
        if (socket.data.userId) {
          this.connectedUsers.delete(socket.data.userId);
        }
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });

    logger.info('WebSocket server initialized');
  }

  // Отправка события в комнату аукциона
  public emitToAuction(auctionId: string, event: string, data: any): void {
    this.io.to(`auction:${auctionId}`).emit(event, data);
  }

  // Отправка события конкретному пользователю
  public emitToUser(userId: string, event: string, data: any): void {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  // Broadcast всем подключенным
  public broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }

  public getIO(): Server {
    return this.io;
  }
}

let wsServer: WebSocketServer | null = null;

export const initializeWebSocket = (httpServer: HTTPServer): WebSocketServer => {
  wsServer = new WebSocketServer(httpServer);
  return wsServer;
};

export const getWebSocketServer = (): WebSocketServer => {
  if (!wsServer) {
    throw new Error('WebSocket server not initialized');
  }
  return wsServer;
};

export default { initializeWebSocket, getWebSocketServer };
