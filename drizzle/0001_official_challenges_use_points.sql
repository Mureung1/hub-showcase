ALTER TABLE "challenges" DROP CONSTRAINT "kind_deposit_consistency";--> statement-breakpoint

-- Empty official challenges can be converted safely in place. Challenges with
-- historical paid participations remain untouched so old settlement records
-- are not reinterpreted as point deposits.
UPDATE "reward_pools"
SET "deposit_kind" = 'point'
WHERE "challenge_id" IN (
  SELECT "id"
  FROM "challenges"
  WHERE "kind" = 'official'
    AND "deposit_kind" = 'cash'
    AND "participant_count" = 0
);--> statement-breakpoint

UPDATE "challenges"
SET "deposit_kind" = 'point'
WHERE "kind" = 'official'
  AND "deposit_kind" = 'cash'
  AND "participant_count" = 0;--> statement-breakpoint

-- Existing cash rows remain readable for historical settlement, while every
-- new or updated official challenge is required to use points.
ALTER TABLE "challenges" ADD CONSTRAINT "kind_deposit_consistency" CHECK (
    ("challenges"."kind" = 'official' AND "challenges"."deposit_kind" = 'point' AND "challenges"."host_id" IS NULL)
    OR ("challenges"."kind" = 'user' AND "challenges"."deposit_kind" = 'point' AND "challenges"."host_id" IS NOT NULL)
) NOT VALID;
