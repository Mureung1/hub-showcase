package com.chasewar.global.exception.errorcode;

import org.springframework.http.HttpStatus;

public interface ErrorCode {

    String name();

    HttpStatus getStatus();
}
