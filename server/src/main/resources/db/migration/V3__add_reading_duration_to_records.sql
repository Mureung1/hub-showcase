ALTER TABLE reading_records
    ADD COLUMN reading_duration_seconds INT NULL AFTER impression,
    ADD CONSTRAINT chk_reading_records_duration CHECK (reading_duration_seconds IS NULL OR reading_duration_seconds >= 0);
