const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Storage configuration for Multer (Uploaded files)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Save to an uploads folder inside backend
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend service is healthy' });
});

// Credits OCR image upload API placeholder
app.post('/api/credits/analyze-image', upload.single('transcript'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`[OCR] File received: ${req.file.filename}`);
    
    // Simulate OCR delay and response
    // Week 2 will integrate actual Tesseract.js processing here.
    setTimeout(() => {
      res.json({
        success: true,
        message: '성적표 분석 완료',
        filename: req.file.filename,
        data: {
          extractedCredits: {
            majorReq: 6, // 6 credits major required
            majorOpt: 0,
            convergeEdu: 3, // 3 credits convergence (fills the missing domain!)
          },
          details: [
            { course: '자료구조', credit: 3, type: '전공필수' },
            { course: '데이터베이스', credit: 3, type: '전공필수' },
            { course: '기술과 현대사회', credit: 3, type: '융합교양(3영역)' }
          ]
        }
      });
    }, 1500);

  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ error: 'Internal server error during analysis' });
  }
});

module.exports = app;
