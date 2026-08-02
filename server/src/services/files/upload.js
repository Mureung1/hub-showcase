import multer from 'multer';
import { MAX_FILE_BYTES, MAX_FILES } from './extractText.js';
import { AppError } from '../../utils/errors.js';

// 파일을 디스크에 쓰지 않고 메모리 버퍼로만 다룬다. 검사 후 버리는 데이터라 디스크에
// 남길 이유가 없고, 남기면 그 자체가 유출 표면이 된다(검사 로그 원문 저장 문제와 같은 맥락).
const handler = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
}).array('files', MAX_FILES);

// multer의 raw 에러(MulterError)를 프로젝트 공통 에러 포맷으로 변환한다.
// multipart 요청이 아니면 multer는 그냥 통과시키므로 기존 JSON 요청 경로는 영향받지 않는다.
export function uploadFiles(req, res, next) {
  handler(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(413, 'file_too_large', `파일이 너무 큽니다 (최대 ${Math.floor(MAX_FILE_BYTES / 1024)}KB).`));
    }
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError(400, 'too_many_files', `첨부 파일은 최대 ${MAX_FILES}개까지 가능합니다.`));
    }
    next(err);
  });
}
