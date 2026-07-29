import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

/**
 * Sharp를 사용한 스마트 크롭
 * 1080x1920 숏폼 비율(9:16)에 맞춰 이미지를 리사이징하고 크롭
 * entropy 전략으로 시각적으로 중요한 영역이 자동으로 선택됨
 *
 * @param {string} imagePath - 절대 경로로 전달받은 이미지 파일 경로
 * @param {string} outputDir - 출력 디렉토리 (기본값: ai-pipeline/output)
 * @returns {Promise<Object>} 크롭 결과 객체
 */
export async function cropImageToVertical(imagePath, outputDir = null) {
  try {
    // 입력값 검증: 절대 경로 확인
    if (!path.isAbsolute(imagePath)) {
      throw new Error(`[Crop] 절대 경로만 받아야 합니다: ${imagePath}`);
    }

    // 파일 존재 확인
    if (!fs.existsSync(imagePath)) {
      throw new Error(`[Crop] 파일을 찾을 수 없습니다: ${imagePath}`);
    }

    // 출력 디렉토리 설정
    if (outputDir === null) {
      outputDir = path.resolve(process.cwd(), 'ai-pipeline/output');
    }

    // 출력 디렉토리 생성 (없으면)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('[Crop] 입력 이미지:', imagePath);
    console.log('[Crop] 출력 디렉토리:', outputDir);

    // 이미지 메타데이터 조회 (크기, 포맷 등)
    const metadata = await sharp(imagePath).metadata();
    const { width, height, format } = metadata;

    console.log(`[Crop] 원본 이미지 크기: ${width}x${height} (포맷: ${format})`);

    // 목표 크기: 1080x1920 (9:16 비율)
    const targetWidth = 1080;
    const targetHeight = 1920;

    // Sharp의 resize + crop with entropy strategy
    // entropy 전략: 이미지에서 시각적으로 중요한 부분을 자동으로 감지하여 크롭
    const timestamp = Date.now();
    const outputPath = path.join(outputDir, `cropped_${timestamp}.jpg`);

    // Sharp 파이프라인 실행
    await sharp(imagePath)
      .resize(targetWidth, targetHeight, {
        fit: 'cover',        // 비율 유지하면서 채우기
        position: sharp.strategy.entropy,  // 엔트로피 기반 중앙 선택
        withoutEnlargement: false
      })
      .jpeg({ quality: 95, progressive: true })
      .toFile(outputPath);

    // 출력 파일 검증
    if (!fs.existsSync(outputPath)) {
      throw new Error(`[Crop] 크롭된 이미지 생성 실패: ${outputPath}`);
    }

    const outputFileSize = fs.statSync(outputPath).size;
    if (outputFileSize === 0) {
      throw new Error(`[Crop] 크롭된 이미지가 비어있습니다: ${outputPath}`);
    }

    console.log(`[Crop] 크롭 완료: ${outputPath}`);
    console.log(`[Crop] 크롭된 이미지 크기: ${targetWidth}x${targetHeight}, 파일 크기: ${outputFileSize} bytes`);

    // 성공 결과 반환
    return {
      status: 'success',
      cropped_image_path: outputPath,
      original_dimensions: {
        width: width,
        height: height
      },
      cropped_dimensions: {
        width: targetWidth,
        height: targetHeight,
        aspect_ratio: (targetWidth / targetHeight).toFixed(4)
      },
      file_size: outputFileSize,
      strategy: 'entropy-based-center-crop'
    };

  } catch (error) {
    console.error('[Crop] 오류 발생:', error.message);
    return {
      status: 'error',
      message: error.message,
      error_details: error.stack
    };
  }
}
