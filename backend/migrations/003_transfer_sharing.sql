CREATE TABLE transfer_invitations (
    id uuid PRIMARY KEY,
    source_recipe_id uuid NOT NULL REFERENCES recipes (id) ON DELETE RESTRICT,
    link_token_hash char(64) NOT NULL UNIQUE,
    invitation_code_hash char(64) NOT NULL UNIQUE,
    snapshot_version smallint NOT NULL DEFAULT 1,
    snapshot jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamptz NOT NULL,
    used_at timestamptz
);

CREATE TABLE received_recipe_details (
    recipe_id uuid PRIMARY KEY REFERENCES recipes (id) ON DELETE RESTRICT,
    transfer_invitation_id uuid NOT NULL UNIQUE
        REFERENCES transfer_invitations (id) ON DELETE RESTRICT,
    original_owner_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    original_owner_name text NOT NULL,
    original_owner_profile_image_url text,
    sender_display_name text NOT NULL,
    relationship_label text NOT NULL,
    received_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transfer_invitations_source ON transfer_invitations (
    source_recipe_id
);

CREATE INDEX idx_transfer_invitations_expires ON transfer_invitations (
    expires_at
);
