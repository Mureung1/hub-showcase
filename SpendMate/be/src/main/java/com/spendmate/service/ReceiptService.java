package com.spendmate.service;

import com.spendmate.domain.Category;
import com.spendmate.domain.Expense;
import com.spendmate.domain.ExpenseInputType;
import com.spendmate.domain.OcrStatus;
import com.spendmate.domain.Receipt;
import com.spendmate.domain.ReceiptSourceType;
import com.spendmate.domain.User;
import com.spendmate.repository.ExpenseRepository;
import com.spendmate.repository.ReceiptRepository;
import com.spendmate.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
public class ReceiptService {

    private static final Long SEED_USER_ID = 1L; // TODO: 로그인 붙으면 실제 로그인 유저로 교체
    private static final List<String> ALLOWED_CONTENT_TYPES = List.of("image/jpeg", "image/png", "image/jpg");

    // 실제 재료/상품 정보가 F11(레시피 추천)·F15(반복구매 감지)에 쓰이는 카테고리만 품목 단위로 쪼갠다.
    // 배달·카페·학식 등 이미 조리된 음식/서비스는 총액만 알면 되므로 Claude 호출 대상에서 제외.
    private static final Set<Category> ITEM_LEVEL_CATEGORIES = Set.of(
            Category.MART, Category.CONVENIENCE_STORE, Category.SHOPPING, Category.MEAL_KIT);

    private final FileStorageService fileStorageService;
    private final ReceiptRepository receiptRepository;
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final ClovaOcrClient clovaOcrClient;
    private final OcrResultParser ocrResultParser;
    private final CategoryClassifier categoryClassifier;
    private final ClaudeItemExtractor claudeItemExtractor;

    public record ExpenseDraft(String name, Integer amount, Category category) {}

    public record UploadResult(Long receiptId, OcrStatus ocrStatus, String storeName,
                                LocalDateTime spentAt, List<ExpenseDraft> items) {}

    public ReceiptService(FileStorageService fileStorageService,
                           ReceiptRepository receiptRepository,
                           ExpenseRepository expenseRepository,
                           UserRepository userRepository,
                           ClovaOcrClient clovaOcrClient,
                           OcrResultParser ocrResultParser,
                           CategoryClassifier categoryClassifier,
                           ClaudeItemExtractor claudeItemExtractor) {
        this.fileStorageService = fileStorageService;
        this.receiptRepository = receiptRepository;
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
        this.clovaOcrClient = clovaOcrClient;
        this.ocrResultParser = ocrResultParser;
        this.categoryClassifier = categoryClassifier;
        this.claudeItemExtractor = claudeItemExtractor;
    }

    /**
     * 업로드 + OCR + 파싱까지만 하고, Expense는 아직 저장하지 않는다 (미리보기).
     * 사용자가 fe에서 결과를 확인/수정한 뒤 confirm()을 호출해야 실제로 저장된다.
     */
    public UploadResult upload(MultipartFile file, ReceiptSourceType sourceType) throws IOException {
        if (file.isEmpty() || !ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
            throw new IllegalArgumentException("이미지 파일(jpg/png)만 업로드할 수 있습니다.");
        }

        User user = userRepository.findById(SEED_USER_ID)
                .orElseThrow(() -> new IllegalStateException("시드 유저가 없습니다. psql로 users 테이블 확인해보세요."));

        byte[] fileBytes = file.getBytes();
        String imageUrl = fileStorageService.store(fileBytes, file.getOriginalFilename());

        Receipt receipt = new Receipt(user, imageUrl, null, sourceType, OcrStatus.PENDING);
        receiptRepository.save(receipt);

        List<ExpenseDraft> drafts = new ArrayList<>();
        String storeName = null;
        LocalDateTime spentAt = LocalDateTime.now();

        try {
            String format = getExtension(file.getOriginalFilename());
            String ocrResult = clovaOcrClient.requestOcr(fileBytes, format);
            receipt.setOcrRawJson(ocrResult);
            receipt.setOcrStatus(OcrStatus.SUCCESS);

            OcrResultParser.ParsedReceipt parsed = ocrResultParser.parseSummary(ocrResult);
            storeName = parsed.storeName();
            spentAt = parsed.spentAt();
            Category category = categoryClassifier.classify(storeName, sourceType);

            if (ITEM_LEVEL_CATEGORIES.contains(category)) {
                String receiptText = String.join(" ", ocrResultParser.extractTexts(ocrResult));
                ClaudeItemExtractor.ExtractionResult result = claudeItemExtractor.extract(receiptText);
                if (result.items().isEmpty()) {
                    drafts.add(new ExpenseDraft(storeName, parsed.amount(), category));
                } else {
                    for (ClaudeItemExtractor.ExtractedItem item : result.items()) {
                        drafts.add(new ExpenseDraft(item.name(), item.amount(), category));
                    }
                    if (result.discount() != null && result.discount() < 0) {
                        drafts.add(new ExpenseDraft("할인", result.discount(), category));
                    }
                }
            } else {
                drafts.add(new ExpenseDraft(storeName, parsed.amount(), category));
            }
        } catch (Exception e) {
            receipt.setOcrStatus(OcrStatus.FAILED);
        }

        receiptRepository.save(receipt);
        return new UploadResult(receipt.getId(), receipt.getOcrStatus(), storeName, spentAt, drafts);
    }

    /**
     * 사용자가 확인(또는 수정)한 항목들을 실제 Expense로 저장한다.
     */
    public List<Expense> confirm(Long receiptId, List<ExpenseDraft> items, LocalDateTime spentAt) {
        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 영수증입니다: " + receiptId));
        User user = receipt.getUser();

        ExpenseInputType inputType = receipt.getSourceType() == ReceiptSourceType.PAPER_RECEIPT
                ? ExpenseInputType.PAPER_RECEIPT
                : ExpenseInputType.ORDER_SCREEN;

        List<Expense> saved = new ArrayList<>();
        for (ExpenseDraft item : items) {
            Category category = item.category() != null ? item.category() : Category.OTHER;
            Expense expense = new Expense(user, receipt, null, item.name(), item.amount(),
                    category, spentAt, inputType);
            saved.add(expenseRepository.save(expense));
        }
        return saved;
    }

    private String getExtension(String originalFilename) {
        if (originalFilename == null || !originalFilename.contains(".")) {
            return "jpg";
        }
        return originalFilename.substring(originalFilename.lastIndexOf('.') + 1);
    }
}
