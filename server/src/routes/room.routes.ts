import { Router } from 'express';
import { createRoom, getMyRooms, getRoomToday, joinRoom } from '../controllers/room.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export const roomRouter = Router();

roomRouter.use(authMiddleware);
roomRouter.post('/', createRoom);
roomRouter.post('/join', joinRoom);
roomRouter.get('/', getMyRooms);
roomRouter.get('/:id/today', getRoomToday);
