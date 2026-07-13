CREATE TABLE placepick_schema_metadata (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    initialized_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO placepick_schema_metadata (id) VALUES (1);
