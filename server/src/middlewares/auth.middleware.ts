import { Request, Response, NextFunction } from 'express';
import supabase from '../utils/supabaseClient.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: '인증 토큰이 누락되었습니다.'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: '인증 토큰이 누락되었습니다.'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        status: 'error',
        message: 'Supabase 서비스가 초기화되지 않았습니다.'
      });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        status: 'error',
        message: '유효하지 않거나 만료된 인증 토큰입니다.'
      });
    }

    (req as any).user = user;
    (req as any).token = token;
    next();
  } catch (error: any) {
    console.error('❌ Authentication middleware error:', error.message || error);
    return res.status(401).json({
      status: 'error',
      message: '인증 검증 처리 중 오류가 발생했습니다.'
    });
  }
}
