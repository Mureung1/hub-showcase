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

// AI Transcript detailed grade analysis API
app.post('/api/credits/analyze-transcript', upload.single('transcript'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const studentType = req.body.studentType || 'transfer';
    console.log(`[OCR Transcript] File received: ${req.file.filename} for studentType: ${studentType}`);

    // Simulate OCR processing delay
    setTimeout(() => {
      let responseData = {};

      if (studentType === 'transfer') {
        responseData = {
          success: true,
          message: '성적표 상세 분석 및 AI 진단 완료',
          data: {
            studentName: '김경상',
            overallGpa: '3.90',
            extractedGrades: [
              { course: '자료구조 및 실습', grade: 'C+', credit: 3, type: '전공필수' },
              { course: '데이터베이스 시스템', grade: 'A0', credit: 3, type: '전공필수' },
              { course: '컴퓨터네트워크', grade: 'A+', credit: 3, type: '전공선택' },
              { course: '소프트웨어공학', grade: 'B+', credit: 3, type: '전공선택' },
              { course: '이산수학', grade: 'A+', credit: 3, type: '전공선택' }
            ],
            advisory: {
              gpaStatus: 'high',
              recommendRetake: false,
              targetCourse: '자료구조 및 실습',
              title: '재수강 비권장 (타 전공심화 이수 추천)',
              message: '김경상님은 자료구조 및 실습 과목에서 C+를 취득하셨으나, 전체 누적 평점이 3.90으로 매우 높은 우수 학생입니다. 취업 및 대학원 진학 시 개별 과목의 C+ 하나보다는 전체 평점의 균형이 훨씬 긍정적으로 작용합니다. 따라서 재수강으로 인한 학점 중복보다는 다른 전공 선택 및 심화 과목을 수강하여 지식의 폭을 넓히는 것을 적극 추천합니다.'
            }
          }
        };
      } else if (studentType === 'general') {
        responseData = {
          success: true,
          message: '성적표 상세 분석 및 AI 진단 완료',
          data: {
            studentName: '박경상',
            overallGpa: '3.20',
            extractedGrades: [
              { course: '자료구조 및 실습', grade: 'B0', credit: 3, type: '전공필수' },
              { course: '데이터베이스 시스템', grade: 'B+', credit: 3, type: '전공필수' },
              { course: '컴퓨터네트워크', grade: 'A0', credit: 3, type: '전공선택' },
              { course: '소프트웨어공학', grade: 'C+', credit: 3, type: '전공선택' }
            ],
            advisory: {
              gpaStatus: 'medium',
              recommendRetake: true,
              targetCourse: '소프트웨어공학',
              title: '재수강 선택적 권장 (평점 3.5 진입 전략)',
              message: '박경상님은 현재 전체 평점이 3.20인 상태로, 3.5(상위 장학금 및 우수 취업 기준선) 진입을 목표로 설계가 필요합니다. 전공선택 과목인 소프트웨어공학(C+)을 재수강하여 A학점 이상으로 업그레이드할 경우 전체 GPA 상승에 큰 보탬이 됩니다. 단, 이번 학기 수강에 여유가 없을 경우 다음 학기로 미루어 수강하시는 것도 대안입니다.'
            }
          }
        };
      } else {
        // double-major (이경상)
        responseData = {
          success: true,
          message: '성적표 상세 분석 및 AI 진단 완료',
          data: {
            studentName: '이경상',
            overallGpa: '2.85',
            extractedGrades: [
              { course: '자료구조 및 실습', grade: 'B0', credit: 3, type: '전공필수' },
              { course: '데이터베이스 시스템', grade: 'C+', credit: 3, type: '전공필수' },
              { course: '컴퓨터네트워크', grade: 'C0', credit: 3, type: '전공선택' }
            ],
            advisory: {
              gpaStatus: 'low',
              recommendRetake: true,
              targetCourse: '데이터베이스 시스템',
              title: '재수강 강력 권장 (핵심 전필 평점 복구)',
              message: '이경상님은 전체 평점이 2.85로 졸업 학점 하한선 경고 상태에 가깝습니다. 특히 다전공 및 주전공 복합 설계에 있어 핵심 전공필수인 데이터베이스 시스템(C+)의 평점 타격이 매우 큽니다. 본 과목은 재수강 시 기존 낮은 학점이 즉시 소멸되므로, 평점 복구를 위해 이번 학기에 반드시 재수강하여 학점을 A등급 이상으로 취득하시는 것을 강력히 권장합니다.'
            }
          }
        };
      }

      res.json(responseData);
    }, 1500);

  } catch (error) {
    console.error('OCR Transcript Error:', error);
    res.status(500).json({ error: 'Internal server error during transcript analysis' });
  }
});

module.exports = app;
