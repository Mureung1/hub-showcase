ALTER TABLE books
    ADD COLUMN metadata_provider VARCHAR(30) NULL,
    ADD COLUMN metadata_provider_id VARCHAR(255) NULL,
    ADD COLUMN isbn10 VARCHAR(10) NULL,
    ADD COLUMN isbn13 VARCHAR(13) NULL,
    ADD COLUMN edition_key VARCHAR(255) NULL;

CREATE UNIQUE INDEX uq_books_user_edition_key ON books (user_id, edition_key);
