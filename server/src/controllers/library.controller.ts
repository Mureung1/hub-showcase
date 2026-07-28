import { Request, Response } from 'express';
import { librarySchema } from '../schemas/curate.schema.js';
import supabase from '../utils/supabaseClient.js';
import { mapToCamelCase } from '../utils/mapToCamelCase.js';
import { DbPaper } from '../types/curate.types.js';

export async function addPaperToLibraryController(req: Request, res: Response) {
  try {
    const authenticatedUser = (req as any).user;
    if (!authenticatedUser || !authenticatedUser.id) {
      return res.status(401).json({
        status: 'error',
        message: '인증 정보가 올바르지 않습니다.'
      });
    }

    const validationResult = librarySchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        status: 'error',
        message: '요청 데이터의 유효성 검증에 실패했습니다.',
        errors: validationResult.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    const { paper } = validationResult.data;
    const authenticatedUserId = authenticatedUser.id;

    if (!supabase) {
      throw new Error('Supabase client is not initialized. Please configure env variables.');
    }

    const { data, error } = await supabase
      .from('saved_papers')
      .insert([
        {
          paper_id: paper.paperId,
          title: paper.title,
          authors: paper.authors,
          channel: paper.channel ? paper.channel.substring(0, 50).trim() : '',
          year: paper.year,
          match_score: paper.matchScore,
          user_id: authenticatedUserId,
          url: paper.url || null
        }
      ])
      .select();

    if (error) {
      throw error;
    }

    const formattedPaper = mapToCamelCase(data?.[0] as DbPaper);
    return res.status(201).json({ status: 'success', data: formattedPaper });
  } catch (error: any) {
    console.error('❌ Library insert error:', error.message || error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}

export async function getUserLibraryController(req: Request, res: Response) {
  try {
    const authenticatedUser = (req as any).user;
    if (!authenticatedUser || !authenticatedUser.id) {
      return res.status(401).json({
        status: 'error',
        message: '인증 정보가 올바르지 않습니다.'
      });
    }

    const targetUserId = authenticatedUser.id;

    if (!supabase) {
      throw new Error('Supabase client is not initialized.');
    }

    const { data, error } = await supabase
      .from('saved_papers')
      .select('*')
      .eq('user_id', targetUserId);

    if (error) {
      throw error;
    }

    const formattedPapers = mapToCamelCase(data as DbPaper[]);
    return res.json({ status: 'success', data: formattedPapers });
  } catch (error: any) {
    console.error('❌ Library select error:', error.message || error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}

export async function deletePaperFromLibraryController(req: Request, res: Response) {
  try {
    const authenticatedUser = (req as any).user;
    if (!authenticatedUser || !authenticatedUser.id) {
      return res.status(401).json({
        status: 'error',
        message: '인증 정보가 올바르지 않습니다.'
      });
    }

    const { paperId } = req.params;
    if (!paperId) {
      return res.status(400).json({ status: 'error', message: 'Paper ID is required.' });
    }

    const targetUserId = authenticatedUser.id;

    if (!supabase) {
      throw new Error('Supabase client is not initialized.');
    }

    const { error } = await supabase
      .from('saved_papers')
      .delete()
      .eq('user_id', targetUserId)
      .eq('paper_id', paperId);

    if (error) {
      throw error;
    }

    return res.json({ status: 'success', message: 'Paper deleted successfully.' });
  } catch (error: any) {
    console.error('❌ Library delete error:', error.message || error);
    return res.status(500).json({ status: 'error', message: error.message || 'Internal server error.' });
  }
}
