import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { getSupabaseClient } from '../db/supabaseClient.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads');

// uploads 폴더 없으면 생성
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${timestamp}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('이미지 파일만 업로드 가능합니다 (JPG, PNG, GIF, WebP)'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// 이미지 업로드
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded'
      });
    }

    // store_id 검증
    const storeId = req.body.store_id;
    if (!storeId || isNaN(storeId)) {
      // 파일 삭제 (실패 시)
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'store_id is required and must be a number'
      });
    }

    const supabase = getSupabaseClient();

    // store_id가 존재하는지 확인
    const { data: storeExists, error: storeCheckError } = await supabase
      .from('store_info')
      .select('store_id')
      .eq('store_id', parseInt(storeId))
      .single();

    if (storeCheckError && storeCheckError.code !== 'PGRST116') {
      fs.unlinkSync(req.file.path);
      console.error('[POST /api/upload] 가게 정보 조회 오류:', storeCheckError);
      return res.status(500).json({
        error: 'Failed to check store information',
        message: storeCheckError.message
      });
    }

    if (!storeExists) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        error: 'Store not found',
        message: `store_id ${storeId}는 존재하지 않습니다`
      });
    }

    // 파일 정보
    const fileUrl = `/uploads/${req.file.filename}`;
    const filePath = req.file.path;

    // Supabase에 업로드 정보 저장
    const { data, error } = await supabase
      .from('uploaded_images')
      .insert([{
        store_id: parseInt(storeId),
        filename: req.file.filename,
        original_filename: req.file.originalname,
        file_path: filePath,
        file_url: fileUrl,
        file_size: req.file.size,
        mimetype: req.file.mimetype
      }])
      .select();

    if (error) {
      // DB 저장 실패 시 파일 삭제
      fs.unlinkSync(req.file.path);
      console.error('[POST /api/upload] DB 저장 오류:', error);
      return res.status(500).json({
        error: 'Failed to save image information',
        message: error.message
      });
    }

    const imageRecord = data[0];

    console.log(`[POST /api/upload] 이미지 업로드 완료: store_id=${storeId}, image_id=${imageRecord.image_id}`);

    res.status(201).json({
      success: true,
      message: '이미지가 업로드되었습니다',
      data: {
        image_id: imageRecord.image_id,
        store_id: imageRecord.store_id,
        filename: imageRecord.filename,
        original_filename: imageRecord.original_filename,
        file_size: imageRecord.file_size,
        mimetype: imageRecord.mimetype,
        url: imageRecord.file_url,
        uploaded_at: imageRecord.uploaded_at
      }
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('[POST /api/upload] 오류:', error);
    res.status(500).json({
      error: 'Failed to upload image',
      message: error.message
    });
  }
});

// 가게별 업로드된 이미지 목록 조회 (선택사항)
router.get('/:storeId', async (req, res) => {
  try {
    const { storeId } = req.params;

    if (!storeId || isNaN(storeId)) {
      return res.status(400).json({
        error: 'Invalid store ID'
      });
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('uploaded_images')
      .select('*')
      .eq('store_id', parseInt(storeId))
      .order('uploaded_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[GET /api/upload/:storeId] 조회 오류:', error);
      return res.status(500).json({
        error: 'Failed to fetch images',
        message: error.message
      });
    }

    res.status(200).json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('[GET /api/upload/:storeId] 오류:', error);
    res.status(500).json({
      error: 'Failed to fetch images',
      message: error.message
    });
  }
});

export default router;
