const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const Tesseract = require('tesseract.js');

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

// AI Transcript detailed grade analysis API (Real OCR Integration)
app.post('/api/credits/analyze-transcript', upload.single('transcript'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const studentType = req.body.studentType || 'transfer';
    const imagePath = req.file.path;
    console.log(`[OCR Transcript] File received: ${req.file.filename} for studentType: ${studentType}. Starting OCR...`);

    // Run Tesseract OCR Text Recognition (Language: Korean + English)
    const { data: { text } } = await Tesseract.recognize(imagePath, 'kor+eng');
    console.log(`[OCR Transcript] OCR Text Recognition Complete. Extracted character count: ${text.length}`);

    // Parse lines and extract grades
    const lines = text.split('\n');
    const extractedGrades = [];
    const gradeRegex = /\b([A-D][0\+]|F)\b/i; // Matches A+, A0, B+, B0, C+, C0, D+, D0, F
    const gradeLooseRegex = /([A-D][0\+]|F)/i;

    lines.forEach(line => {
      const cleanLine = line.replace(/\s+/g, '');
      if (!cleanLine) return;

      let matchedSubject = null;
      let matchedCategory = '전공선택';

      // Academic subject matching rules
      if (cleanLine.includes('자료구조')) {
        matchedSubject = '자료구조 및 실습';
        matchedCategory = '전공필수';
      } else if (cleanLine.includes('데이터베이스')) {
        matchedSubject = '데이터베이스 시스템';
        matchedCategory = '전공필수';
      } else if (cleanLine.includes('네트워크')) {
        matchedSubject = '컴퓨터네트워크';
      } else if (cleanLine.includes('소프트웨어')) {
        matchedSubject = '소프트웨어공학';
      } else if (cleanLine.includes('이산수학')) {
        matchedSubject = '이산수학';
      } else if (cleanLine.includes('수학') || cleanLine.includes('MATH')) {
        matchedSubject = '기초수학';
      } else if (cleanLine.includes('컴퓨터') || cleanLine.includes('COMPUTER')) {
        matchedSubject = '컴퓨터과학개론';
      } else if (cleanLine.includes('알고리즘') || cleanLine.includes('ALGORITHM')) {
        matchedSubject = '알고리즘 및 실습';
      } else if (cleanLine.includes('영어') || cleanLine.includes('ENGLISH')) {
        matchedSubject = '대학영어';
        matchedCategory = '기초교양';
      } else if (cleanLine.includes('현대사회') || cleanLine.includes('인류')) {
        matchedSubject = '기술과 현대사회';
        matchedCategory = '융합교양';
      }

      if (matchedSubject) {
        // Extract grade from this line
        let grade = 'A+'; // default
        const gradeMatch = line.match(gradeRegex) || line.match(gradeLooseRegex);
        if (gradeMatch) {
          grade = gradeMatch[1].toUpperCase();
        } else {
          // Loose lookup if OCR glued it
          const upperLine = cleanLine.toUpperCase();
          const grades = ['A+', 'A0', 'B+', 'B0', 'C+', 'C0', 'D+', 'D0', 'F'];
          for (let g of grades) {
            if (upperLine.includes(g)) {
              grade = g;
              break;
            }
          }
        }

        // Extract credit (1, 2, 3)
        let credit = 3;
        const creditMatch = line.match(/\b([1-3])\b/);
        if (creditMatch) {
          credit = parseInt(creditMatch[1]);
        }

        // Avoid duplicate courses
        if (!extractedGrades.some(g => g.course === matchedSubject)) {
          extractedGrades.push({
            course: matchedSubject,
            grade: grade,
            credit: credit,
            type: matchedCategory
          });
        }
      }
    });

    // Fallback to simulated database profile if no grades were recognized (random image uploaded)
    let isFallback = false;
    if (extractedGrades.length === 0) {
      isFallback = true;
      console.log('[OCR Transcript] No courses recognized. Using fallback profile for studentType:', studentType);
      if (studentType === 'transfer') {
        extractedGrades.push(
          { course: '자료구조 및 실습', grade: 'C+', credit: 3, type: '전공필수' },
          { course: '데이터베이스 시스템', grade: 'A0', credit: 3, type: '전공필수' },
          { course: '컴퓨터네트워크', grade: 'A+', credit: 3, type: '전공선택' },
          { course: '소프트웨어공학', grade: 'B+', credit: 3, type: '전공선택' },
          { course: '이산수학', grade: 'A+', credit: 3, type: '전공선택' }
        );
      } else if (studentType === 'general') {
        extractedGrades.push(
          { course: '자료구조 및 실습', grade: 'B0', credit: 3, type: '전공필수' },
          { course: '데이터베이스 시스템', grade: 'B+', credit: 3, type: '전공필수' },
          { course: '컴퓨터네트워크', grade: 'A0', credit: 3, type: '전공선택' },
          { course: '소프트웨어공학', grade: 'C+', credit: 3, type: '전공선택' }
        );
      } else {
        extractedGrades.push(
          { course: '자료구조 및 실습', grade: 'B0', credit: 3, type: '전공필수' },
          { course: '데이터베이스 시스템', grade: 'C+', credit: 3, type: '전공필수' },
          { course: '컴퓨터네트워크', grade: 'C0', credit: 3, type: '전공선택' }
        );
      }
    }

    // Dynamic GPA calculation
    const gradePoints = {
      'A+': 4.5, 'A0': 4.0,
      'B+': 3.5, 'B0': 3.0,
      'C+': 2.5, 'C0': 2.0,
      'D+': 1.5, 'D0': 1.0,
      'F': 0.0
    };

    let totalPoints = 0;
    let totalCredits = 0;
    extractedGrades.forEach(g => {
      const pt = gradePoints[g.grade] !== undefined ? gradePoints[g.grade] : 4.0;
      totalPoints += pt * g.credit;
      totalCredits += g.credit;
    });

    const overallGpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '3.00';

    // Identify target low grade course (C+ or below)
    const lowGrades = ['C+', 'C0', 'D+', 'D0', 'F'];
    const targetCourseObj = extractedGrades.find(g => lowGrades.includes(g.grade)) || extractedGrades[0];
    const targetCourseName = targetCourseObj ? targetCourseObj.course : '자료구조 및 실습';
    const targetCourseGrade = targetCourseObj ? targetCourseObj.grade : 'C+';

    // Generate dynamic AI Advisory
    let advisory = {};
    const hasLowGrade = extractedGrades.some(g => lowGrades.includes(g.grade));

    if (hasLowGrade) {
      const gpaNum = parseFloat(overallGpa);
      if (gpaNum >= 3.7) {
        // High GPA with some low grade
        advisory = {
          gpaStatus: 'high',
          recommendRetake: false,
          targetCourse: targetCourseName,
          title: '재수강 비권장 (타 전공심화 이수 추천)',
          message: `${studentType === 'transfer' ? '김경상' : studentType === 'general' ? '박경상' : '이경상'}님은 ${targetCourseName} 과목에서 ${targetCourseGrade}를 취득하셨으나, 전체 누적 평점이 ${overallGpa}로 매우 우수한 상태입니다. 기업 선발이나 상위 과정 진학 시 개별 과목의 C+ 학점 하나보다는 전체 누적 평점의 완성도가 훨씬 높게 평가됩니다. 따라서 재수강 시간 대비 효율을 감안해 고급 전공 선택 과목을 이수하여 지식을 확장하시는 것을 권장합니다.`
        };
      } else if (gpaNum >= 3.2) {
        // Medium GPA
        advisory = {
          gpaStatus: 'medium',
          recommendRetake: true,
          targetCourse: targetCourseName,
          title: '재수강 선택적 권장 (평점 3.5 진입 전략)',
          message: `현재 전체 평점이 ${overallGpa}인 상태로, 상위 우수 취업 기준선인 3.5 진입이 목표입니다. 평점을 끌어내린 ${targetCourseName}(${targetCourseGrade}) 과목을 재수강하여 A등급 이상으로 취득할 경우 전체 GPA 상승에 매우 효과적입니다. 다만, 전공선택 부담이 클 경우 시기를 다음 학기로 조율하는 방법도 있습니다.`
        };
      } else {
        // Low GPA
        advisory = {
          gpaStatus: 'low',
          recommendRetake: true,
          targetCourse: targetCourseName,
          title: '재수강 강력 권장 (전공 평점 긴급 복구)',
          message: `전체 평점이 ${overallGpa}로 졸업 평점 안정선에 미치지 못합니다. 특히 전공 핵심이자 낮은 학점을 가진 ${targetCourseName}(${targetCourseGrade})의 평점 보완이 시급합니다. 재수강 시 기존 등급이 완전히 소멸되어 전체 GPA 세탁 효과가 가장 높은 과목이므로, 이번 학기 최우선적으로 수강신청에 반영하여 성적을 만회하시기 바랍니다.`
        };
      }
    } else {
      // Good grades overall
      advisory = {
        gpaStatus: 'high',
        recommendRetake: false,
        targetCourse: targetCourseName,
        title: '모든 과목 성적 양호 (재수강 불필요)',
        message: `축하합니다! 판독된 성적표 내역 중 C+ 이하의 저조한 과목이 발견되지 않았습니다. 전체 평점 평균이 ${overallGpa}로 훌륭하고 안정적이므로 재수강 없이 본래 계획대로 신규 전공 설계 및 남은 졸업 학점 취득을 이어가시기 바랍니다.`
      };
    }

    // Set correct student name depending on profile
    const studentName = studentType === 'transfer' ? '김경상' : studentType === 'general' ? '박경상' : '이경상';

    res.json({
      success: true,
      message: isFallback ? '성적표 스캔 완료 (모의 데이터 대체)' : '성적표 상세 분석 및 AI 진단 완료',
      data: {
        studentName: studentName,
        overallGpa: overallGpa,
        extractedGrades: extractedGrades,
        advisory: advisory
      }
    });

  } catch (error) {
    console.error('OCR Transcript Error:', error);
    res.status(500).json({ error: 'Internal server error during transcript analysis' });
  }
});

module.exports = app;
