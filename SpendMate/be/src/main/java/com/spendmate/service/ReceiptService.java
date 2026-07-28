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

@Service
public class ReceiptService {

    private static final List<String> ALLOWED_CONTENT_TYPES = List.of("image/jpeg", "image/png", "image/jpg");

    private final FileStorageService fileStorageService;
    private final ReceiptRepository receiptRepository;
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final ClovaOcrClient clovaOcrClient;
    private final OcrResultParser ocrResultParser;
    private final CategoryClassifier categoryClassifier;

    public record ExpenseDraft(String name, Integer amount, Category category) {}

    public record UploadResult(Long receiptId, OcrStatus ocrStatus, String storeName,
                                LocalDateTime spentAt, List<ExpenseDraft> items) {}

    public ReceiptService(FileStorageService fileStorageService,
                           ReceiptRepository receiptRepository,
                           ExpenseRepository expenseRepository,
                           UserRepository userRepository,
                           ClovaOcrClient clovaOcrClient,
                           OcrResultParser ocrResultParser,
                           CategoryClassifier categoryClassifier) {
        this.fileStorageService = fileStorageService;
        this.receiptRepository = receiptRepository;
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
        this.clovaOcrClient = clovaOcrClient;
        this.ocrResultParser = ocrResultParser;
        this.categoryClassifier = categoryClassifier;
    }

    /**
     * 업로드 + OCR + 파싱까지만 하고, Expense는 아직 저장하지 않는다 (미리보기).
     * 사용자가 fe에서 결과를 확인/수정한 뒤 confirm()을 호출해야 실제로 저장된다.
     */
    public UploadResult upload(Long userId, MultipartFile file, ReceiptSourceType sourceType) throws IOException {
        if (file.isEmpty() || !ALLOWED_CONTENT_TYPES.contains(file.getContentType())) {
            throw new IllegalArgumentException("이미지 파일(jpg/png)만 업로드할 수 있습니다.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));

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

            drafts.add(new ExpenseDraft(storeName, parsed.amount(), category));
        } catch (Exception e) {
            e.printStackTrace();
            receipt.setOcrStatus(OcrStatus.FAILED);
        }

        receiptRepository.save(receipt);
        return new UploadResult(receipt.getId(), receipt.getOcrStatus(), storeName, spentAt, drafts);
    }

    /**
     * 사용자가 확인(또는 수정)한 항목들을 실제 Expense로 저장한다.
     */
    public List<Expense> confirm(Long userId, Long receiptId, List<ExpenseDraft> items, LocalDateTime spentAt) {
        Receipt receipt = receiptRepository.findById(receiptId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 영수증입니다: " + receiptId));
        User user = receipt.getUser();
        if (!user.getId().equals(userId)) {
            throw new IllegalArgumentException("존재하지 않는 영수증입니다: " + receiptId);
        }

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
