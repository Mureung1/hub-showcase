ALTER TABLE users
    ADD COLUMN provider VARCHAR(30) NULL AFTER nickname,
    ADD COLUMN provider_subject VARCHAR(255) NULL AFTER provider,
    ADD COLUMN email VARCHAR(320) NULL AFTER provider_subject;

CREATE UNIQUE INDEX uq_users_provider_subject ON users (provider, provider_subject);
