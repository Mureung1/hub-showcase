package com.punchman.devpulse.api;

import com.punchman.devpulse.service.CertificationNotFoundException;
import com.punchman.devpulse.service.CertificationProgressNotFoundException;
import com.punchman.devpulse.service.CertificationRankingNotFoundException;
import com.punchman.devpulse.service.DuplicateCertificationProgressException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler({
            CertificationRankingNotFoundException.class,
            CertificationNotFoundException.class,
            CertificationProgressNotFoundException.class
    })
    public ResponseEntity<ErrorResponse> handleNotFound(RuntimeException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler({MissingServletRequestParameterException.class, IllegalArgumentException.class})
    public ResponseEntity<ErrorResponse> handleBadRequest(Exception e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(DuplicateCertificationProgressException.class)
    public ResponseEntity<ErrorResponse> handleConflict(DuplicateCertificationProgressException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse(e.getMessage()));
    }
}
