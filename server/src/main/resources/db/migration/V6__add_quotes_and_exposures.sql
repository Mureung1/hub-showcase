ALTER TABLE books
    ADD COLUMN page_count INT NULL;

ALTER TABLE books
    ADD CONSTRAINT chk_books_page_count CHECK (page_count IS NULL OR page_count >= 1);

CREATE TABLE quotes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    book_id BIGINT NOT NULL,
    quote_text VARCHAR(300) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_quotes_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_quotes_book FOREIGN KEY (book_id) REFERENCES books (id),
    INDEX idx_quotes_user_book_created (user_id, book_id, created_at DESC, id DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE quote_exposures (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    quote_id BIGINT NULL,
    book_id BIGINT NOT NULL,
    quote_text_snapshot VARCHAR(300) NOT NULL,
    exposed_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    opened_at TIMESTAMP(6) NULL,
    completed_reading_record_id BIGINT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_quote_exposures_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_quote_exposures_quote FOREIGN KEY (quote_id) REFERENCES quotes (id) ON DELETE SET NULL,
    CONSTRAINT fk_quote_exposures_book FOREIGN KEY (book_id) REFERENCES books (id),
    CONSTRAINT fk_quote_exposures_record FOREIGN KEY (completed_reading_record_id) REFERENCES reading_records (id),
    INDEX idx_quote_exposures_user_exposed (user_id, exposed_at DESC, id DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
