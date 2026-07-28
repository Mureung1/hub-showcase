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
    // 파일명을 영문으로 변환 (한글/특수문자 제거)
    const safeName = `upload_${timestamp}`;
    cb(null, `${safeName}${ext}`);
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

    // file_url을 url로 매핑해서 반환
    const formattedData = (data || []).map(img => ({
      ...img,
      url: img.file_url
    }));

    res.status(200).json({
      success: true,
      data: formattedData
    });
  } catch (error) {
    console.error('[GET /api/upload/:storeId] 오류:', error);
    res.status(500).json({
      error: 'Failed to fetch images',
      message: error.message
    });
  }
});

// 이미지 삭제
router.delete('/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;

    if (!imageId || isNaN(imageId)) {
      return res.status(400).json({
        error: 'Invalid image ID'
      });
    }

    const supabase = getSupabaseClient();

    // 1. 이미지 정보 조회
    const { data: imageData, error: fetchError } = await supabase
      .from('uploaded_images')
      .select('file_path, file_url')
      .eq('image_id', parseInt(imageId))
      .single();

    if (fetchError || !imageData) {
      return res.status(404).json({
        error: 'Image not found'
      });
    }

    // 2. Supabase Storage에서 파일 삭제
    if (imageData.file_path) {
      const { error: storageError } = await supabase.storage
        .from('uploads')
        .remove([imageData.file_path]);

      if (storageError) {
        console.warn('[DELETE /api/upload] Storage 삭제 경고:', storageError);
        // Storage 삭제 실패는 계속 진행 (DB 삭제는 함)
      }
    }

    // 3. DB에서 레코드 삭제
    const { error: deleteError } = await supabase
      .from('uploaded_images')
      .delete()
      .eq('image_id', parseInt(imageId));

    if (deleteError) {
      console.error('[DELETE /api/upload] DB 삭제 오류:', deleteError);
      return res.status(500).json({
        error: 'Failed to delete image',
        message: deleteError.message
      });
    }

    console.log(`[DELETE /api/upload] 이미지 삭제 완료: image_id=${imageId}`);

    res.status(200).json({
      success: true,
      message: '이미지가 삭제되었습니다'
    });
  } catch (error) {
    console.error('[DELETE /api/upload] 오류:', error);
    res.status(500).json({
      error: 'Failed to delete image',
      message: error.message
    });
  }
});

export default router;
