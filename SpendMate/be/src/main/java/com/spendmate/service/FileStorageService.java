package com.spendmate.service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

public class FileStorageService
{
    String store(MultipartFile file) throws IOException;
}
