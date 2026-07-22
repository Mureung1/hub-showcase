DROP TABLE parking_realtime;

CREATE TABLE parking_lot_realtime
(
    id                BIGINT      NOT NULL AUTO_INCREMENT,
    pklt_cd           VARCHAR(20) NOT NULL,
    total_slots       INT         NOT NULL,
    available_slots   INT         NOT NULL,
    source_updated_at DATETIME,
    created_at        DATETIME    NOT NULL,
    updated_at        DATETIME    NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_parking_lot_realtime_pklt_cd (pklt_cd),
    CONSTRAINT fk_parking_lot_realtime_pklt_cd
        FOREIGN KEY (pklt_cd) REFERENCES parking_lot (pklt_cd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;