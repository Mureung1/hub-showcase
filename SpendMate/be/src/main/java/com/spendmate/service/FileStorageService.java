package com.spendmate.service;
import java.io.IOException;

public interface FileStorageService {
    String store(byte[] bytes, String originalFilename) throws IOException;
}
