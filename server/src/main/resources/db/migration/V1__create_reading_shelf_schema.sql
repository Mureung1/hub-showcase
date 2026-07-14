CREATE TABLE users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nickname VARCHAR(40) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE books (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NULL,
    initial_page INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'READING',
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    completed_at TIMESTAMP(6) NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_books_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT chk_books_initial_page CHECK (initial_page >= 1),
    CONSTRAINT chk_books_status CHECK (status IN ('READING', 'COMPLETED', 'ARCHIVED')),
    INDEX idx_books_user_status_created (user_id, status, created_at DESC, id DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reading_records (
    id BIGINT NOT NULL AUTO_INCREMENT,
    book_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    start_page INT NOT NULL,
    end_page INT NOT NULL,
    impression TEXT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_reading_records_book FOREIGN KEY (book_id) REFERENCES books (id),
    CONSTRAINT fk_reading_records_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT chk_reading_records_pages CHECK (start_page >= 1 AND end_page >= start_page),
    INDEX idx_reading_records_book_latest (book_id, created_at DESC, id DESC),
    INDEX idx_reading_records_user_created (user_id, created_at DESC, id DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
