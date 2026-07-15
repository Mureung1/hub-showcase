package com.spendmate.service;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class LocalFileStorageService implements FileStorageService {

    private static final String UPLOAD_DIR = "uploads";

    @Override
    public String store(byte[] bytes, String originalFilename) throws IOException {
        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String extension = getExtension(originalFilename);
        String savedFileName = UUID.randomUUID() + extension;
        Path targetPath = uploadPath.resolve(savedFileName);
        Files.write(targetPath, bytes);

        return "/" + UPLOAD_DIR + "/" + savedFileName;
    }

    private String getExtension(String originalFilename) {
        if (originalFilename == null || !originalFilename.contains(".")) {
            return "";
        }
        return originalFilename.substring(originalFilename.lastIndexOf('.'));
    }
}