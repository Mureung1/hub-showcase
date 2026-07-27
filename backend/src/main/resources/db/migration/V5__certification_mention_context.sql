ALTER TABLE certification_mention
    ADD COLUMN essential_mention_count INT NOT NULL DEFAULT 0,
    ADD COLUMN preferred_mention_count INT NOT NULL DEFAULT 0;
