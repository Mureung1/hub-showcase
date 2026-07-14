package com.hub.document;

/** 비동기 잡 상태. 프론트는 DONE 이 될 때까지 폴링한다. */
public enum DocStatus {
    PENDING,
    RUNNING,
    DONE,
    FAILED
}
