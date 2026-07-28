CREATE TABLE recipe_audit_events (
    id uuid PRIMARY KEY,
    recipe_id uuid NOT NULL REFERENCES recipes (id) ON DELETE RESTRICT,
    actor_user_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    action varchar(16) NOT NULL CHECK (
        action IN (
            'DELETED',
            'RESTORED'
        )
    ),
    occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recipe_audits_recipe_time ON recipe_audit_events (
    recipe_id,
    occurred_at DESC
);
