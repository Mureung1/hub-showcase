package com.spendmate.service;

import com.spendmate.domain.OcrStatus;
import com.spendmate.domain.Receipt;
import com.spendmate.domain.ReceiptSourceType;
import com.spendmate.domain.User;
import com.spendmate.repository.ReceiptRepository;
import com.spendmate.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class ReceiptService {

    private static final Long SEED_USER_ID = 1L; // TODO: 로그인 붙으면 실제 로그인 유저로 교체

    private final FileStorageService fileStorageService;
    private final ReceiptRepository receiptRepository;
    private final UserRepository userRepository;

    public ReceiptService(FileStorageService fileStorageService,
                          ReceiptRepository receiptRepository,
                          UserRepository userRepository) {
        this.fileStorageService = fileStorageService;
        this.receiptRepository = receiptRepository;
        this.userRepository = userRepository;
    }

    public Receipt upload(MultipartFile file, ReceiptSourceType sourceType) throws IOException {
        User user = userRepository.findById(SEED_USER_ID)
                .orElseThrow(() -> new IllegalStateException("시드 유저가 없습니다. psql로 users 테이블 확인해보세요."));

        String imageUrl = fileStorageService.store(file);

        Receipt receipt = new Receipt(user, imageUrl, null, sourceType, OcrStatus.PENDING);
        return receiptRepository.save(receipt);
    }
}