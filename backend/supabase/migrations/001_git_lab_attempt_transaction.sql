CREATE UNIQUE INDEX IF NOT EXISTS uq_mistake_notes_open_duplicate
  ON mistake_notes (source, lesson_id, command, reason)
  WHERE status = 'open';

ALTER TABLE mistake_notes ALTER COLUMN status SET DEFAULT 'open';

CREATE OR REPLACE FUNCTION record_git_lab_attempt_with_mistake_note(
  p_attempt JSONB,
  p_mistake_note JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  saved_attempt git_lab_attempts%ROWTYPE;
  saved_mistake_note mistake_notes%ROWTYPE;
BEGIN
  INSERT INTO git_lab_attempts (id, lesson_id, command, result, reason, created_at)
  VALUES (
    p_attempt->>'id',
    p_attempt->>'lesson_id',
    p_attempt->>'command',
    p_attempt->>'result',
    p_attempt->>'reason',
    (p_attempt->>'created_at')::TIMESTAMPTZ
  )
  RETURNING * INTO saved_attempt;

  IF p_mistake_note IS NOT NULL THEN
    INSERT INTO mistake_notes (
      id,
      source,
      lesson_id,
      lesson_title,
      command,
      reason,
      correction,
      created_at,
      reviewed_at,
      status
    )
    VALUES (
      p_mistake_note->>'id',
      p_mistake_note->>'source',
      p_mistake_note->>'lesson_id',
      p_mistake_note->>'lesson_title',
      p_mistake_note->>'command',
      p_mistake_note->>'reason',
      p_mistake_note->>'correction',
      (p_mistake_note->>'created_at')::TIMESTAMPTZ,
      (p_mistake_note->>'reviewed_at')::TIMESTAMPTZ,
      p_mistake_note->>'status'
    )
    ON CONFLICT (source, lesson_id, command, reason) WHERE status = 'open'
    DO UPDATE SET id = mistake_notes.id
    RETURNING * INTO saved_mistake_note;
  END IF;

  RETURN jsonb_build_object(
    'attempt', to_jsonb(saved_attempt),
    'mistake_note', CASE
      WHEN p_mistake_note IS NULL THEN NULL
      ELSE to_jsonb(saved_mistake_note)
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION record_git_lab_attempt_with_mistake_note(JSONB, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_git_lab_attempt_with_mistake_note(JSONB, JSONB)
  TO service_role;
