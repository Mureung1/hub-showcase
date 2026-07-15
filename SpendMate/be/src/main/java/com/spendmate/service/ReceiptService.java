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
import java.util.List;

@Service
public class ReceiptService {

    private static final Long SEED_USER_ID = 1L; // TODO: 로그인 붙으면 실제 로그인 유저로 교체

    private final FileStorageService fileStorageService;
    private final ReceiptRepository receiptRepository;
    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final ClovaOcrClient clovaOcrClient;
    private final OcrResultParser ocrResultParser;

    public ReceiptService(FileStorageService fileStorageService,
                           ReceiptRepository receiptRepository,
                           ExpenseRepository expenseRepository,
                           UserRepository userRepository,
                           ClovaOcrClient clovaOcrClient,
                           OcrResultParser ocrResultParser) {
        this.fileStorageService = fileStorageService;
        this.receiptRepository = receiptRepository;
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
        this.clovaOcrClient = clovaOcrClient;
        this.ocrResultParser = ocrResultParser;
    }

    public Receipt upload(MultipartFile file, ReceiptSourceType sourceType) throws IOException {
        User user = userRepository.findById(SEED_USER_ID)
                .orElseThrow(() -> new IllegalStateException("시드 유저가 없습니다. psql로 users 테이블 확인해보세요."));

        byte[] fileBytes = file.getBytes();
        String imageUrl = fileStorageService.store(fileBytes, file.getOriginalFilename());

        Receipt receipt = new Receipt(user, imageUrl, null, sourceType, OcrStatus.PENDING);
        receiptRepository.save(receipt);

        try {
            String format = getExtension(file.getOriginalFilename());
            String ocrResult = clovaOcrClient.requestOcr(fileBytes, format);
            receipt.setOcrRawJson(ocrResult);
            receipt.setOcrStatus(OcrStatus.SUCCESS);

            OcrResultParser.ParsedReceipt parsed = ocrResultParser.parseSummary(ocrResult);
            boolean isGroceryStore = sourceType == ReceiptSourceType.PAPER_RECEIPT
                    && ocrResultParser.looksLikeGroceryStore(parsed.storeName());

            if (isGroceryStore) {
                List<OcrResultParser.ParsedItem> items = ocrResultParser.parseItems(ocrResult);
                if (items.isEmpty()) {
                    // 마트로 보이는데 품목을 하나도 못 찾았으면, 총액 하나로라도 저장 (fallback)
                    Expense expense = new Expense(user, receipt, parsed.storeName(), null, parsed.amount(),
                            Category.OTHER, parsed.spentAt(), ExpenseInputType.PAPER_RECEIPT);
                    expenseRepository.save(expense);
                } else {
                    for (OcrResultParser.ParsedItem item : items) {
                        Expense expense = new Expense(user, receipt, null, item.name(), item.amount(),
                                Category.OTHER, parsed.spentAt(), ExpenseInputType.PAPER_RECEIPT);
                        expenseRepository.save(expense);
                    }

                    Integer discount = ocrResultParser.extractDiscount(ocrResult);
                    if (discount != null && discount < 0) {
                        Expense discountExpense = new Expense(user, receipt, null, "할인", discount,
                                Category.OTHER, parsed.spentAt(), ExpenseInputType.PAPER_RECEIPT);
                        expenseRepository.save(discountExpense);
                    }
                }
            } else {
                ExpenseInputType inputType = sourceType == ReceiptSourceType.PAPER_RECEIPT
                        ? ExpenseInputType.PAPER_RECEIPT
                        : ExpenseInputType.ORDER_SCREEN;
                Expense expense = new Expense(user, receipt, parsed.storeName(), null, parsed.amount(),
                        Category.OTHER, parsed.spentAt(), inputType);
                expenseRepository.save(expense);
            }
        } catch (Exception e) {
            receipt.setOcrStatus(OcrStatus.FAILED);
        }

        return receiptRepository.save(receipt);
    }

    private String getExtension(String originalFilename) {
        if (originalFilename == null || !originalFilename.contains(".")) {
            return "jpg";
        }
        return originalFilename.substring(originalFilename.lastIndexOf('.') + 1);
    }
}
