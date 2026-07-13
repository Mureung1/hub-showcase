CREATE TABLE parking_lot
(
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    pklt_cd        VARCHAR(20)  NOT NULL,
    name           VARCHAR(100) NOT NULL,
    address        VARCHAR(200),
    district       VARCHAR(20),
    tel            VARCHAR(30),
    kind           VARCHAR(20),
    oper_type      VARCHAR(30),
    total_slots    INT,
    pay_type       VARCHAR(10),
    basic_charge   INT,
    basic_min      INT,
    add_charge     INT,
    add_min        INT,
    day_max_charge INT,
    wd_start       VARCHAR(4),
    wd_end         VARCHAR(4),
    we_start       VARCHAR(4),
    we_end         VARCHAR(4),
    hd_start       VARCHAR(4),
    hd_end         VARCHAR(4),
    has_realtime   BOOLEAN      NOT NULL DEFAULT FALSE,
    lat DOUBLE,
    lng DOUBLE,
    created_at     DATETIME     NOT NULL,
    updated_at     DATETIME     NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_parking_lot_pklt_cd (pklt_cd)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE parking_realtime
(
    id             BIGINT   NOT NULL AUTO_INCREMENT,
    parking_lot_id BIGINT   NOT NULL,
    now_cnt        INT      NOT NULL,
    updated_tm     DATETIME,
    created_at     DATETIME NOT NULL,
    updated_at     DATETIME NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_parking_realtime_lot (parking_lot_id),
    CONSTRAINT fk_parking_realtime_lot FOREIGN KEY (parking_lot_id) REFERENCES parking_lot (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;