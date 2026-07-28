CREATE TABLE users (
    id uuid PRIMARY KEY,
    firebase_uid varchar(128) NOT NULL UNIQUE,
    email varchar(320),
    name varchar(100),
    profile_image_url text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recipes (
    id uuid PRIMARY KEY,
    owner_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    type varchar(16) NOT NULL CHECK (
        type IN (
            'OWNED',
            'EXTERNAL',
            'RECEIVED'
        )
    ),
    title text NOT NULL,
    description text,
    servings text,
    cooking_time_minutes integer,
    memo text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamptz
);

CREATE TABLE ingredients (
    recipe_id uuid NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
    position integer NOT NULL CHECK (position > 0),
    name text NOT NULL,
    amount text,
    unit text,
    PRIMARY KEY (recipe_id, position)
);

CREATE TABLE recipe_steps (
    recipe_id uuid NOT NULL REFERENCES recipes (id) ON DELETE CASCADE,
    position integer NOT NULL CHECK (position > 0),
    description text NOT NULL,
    PRIMARY KEY (recipe_id, position)
);

CREATE TABLE recipe_sources (
    recipe_id uuid PRIMARY KEY REFERENCES recipes (id) ON DELETE CASCADE,
    url text NOT NULL,
    title text,
    author text
);

CREATE INDEX idx_recipes_owner_list ON recipes (
    owner_id,
    deleted_at,
    created_at DESC
);