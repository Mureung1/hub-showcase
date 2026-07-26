import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import {
  normalizeAcceptRequest,
  TransferInvitationError,
  UUID_PATTERN,
  type FirebaseTransferUser,
  type RecipeSnapshot,
} from "./transferInvitation.shared.js";

type AcceptTransferInvitationRow = {
  id: string;
  snapshot: RecipeSnapshot;
  expires_at: Date;
  used_at: Date | null;
  source_recipe_id: string;
  original_owner_id: string;
};

export async function acceptTransferInvitation(
  pool: Pick<Pool, "connect">,
  firebaseUser: FirebaseTransferUser,
  invitationId: string,
  requestBody: unknown,
): Promise<{ recipeId: string; type: "RECEIVED" }> {
  if (!UUID_PATTERN.test(invitationId)) {
    throw new TransferInvitationError(
      "TRANSFER_INVITATION_NOT_FOUND",
    );
  }

  const request = normalizeAcceptRequest(requestBody);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const invitationResult =
      await client.query<AcceptTransferInvitationRow>(
        `
          SELECT
            transfer_invitations.id,
            transfer_invitations.source_recipe_id,
            recipes.owner_id AS original_owner_id,
            transfer_invitations.snapshot,
            transfer_invitations.expires_at,
            transfer_invitations.used_at
          FROM transfer_invitations
          INNER JOIN recipes
            ON recipes.id = transfer_invitations.source_recipe_id
          WHERE transfer_invitations.id = $1
            AND transfer_invitations.snapshot_version = 1
          FOR UPDATE OF transfer_invitations
        `,
        [invitationId],
      );
    const invitation = invitationResult.rows[0];

    if (!invitation) {
      throw new TransferInvitationError(
        "TRANSFER_INVITATION_NOT_FOUND",
      );
    }

    if (invitation.used_at !== null) {
      throw new TransferInvitationError("TRANSFER_INVITATION_USED");
    }

    if (invitation.expires_at.getTime() <= Date.now()) {
      throw new TransferInvitationError(
        "TRANSFER_INVITATION_EXPIRED",
      );
    }

    const userResult = await client.query<{ id: string }>(
      `
        INSERT INTO users (
          id,
          firebase_uid,
          email,
          name,
          profile_image_url
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (firebase_uid) DO UPDATE SET
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          profile_image_url = EXCLUDED.profile_image_url,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `,
      [
        randomUUID(),
        firebaseUser.uid,
        firebaseUser.email ?? null,
        firebaseUser.name ?? null,
        firebaseUser.picture ?? null,
      ],
    );
    const recipientId = userResult.rows[0]?.id;

    if (!recipientId) {
      throw new Error("Service user was not returned");
    }

    if (recipientId === invitation.original_owner_id) {
      throw new TransferInvitationError(
        "TRANSFER_INVITATION_SELF_ACCEPT_NOT_ALLOWED",
      );
    }

    const receivedRecipeId = randomUUID();
    const { recipe, originalOwner } = invitation.snapshot;

    await client.query(
      `
        INSERT INTO recipes (
          id,
          owner_id,
          type,
          title,
          description,
          servings,
          cooking_time_minutes,
          memo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        receivedRecipeId,
        recipientId,
        "RECEIVED",
        recipe.title,
        recipe.description,
        recipe.servings,
        recipe.cookingTimeMinutes,
        request.memo,
      ],
    );

    for (const ingredient of recipe.ingredients) {
      await client.query(
        `
          INSERT INTO ingredients (
            recipe_id,
            position,
            name,
            amount,
            unit
          )
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          receivedRecipeId,
          ingredient.order,
          ingredient.name,
          ingredient.amount,
          ingredient.unit,
        ],
      );
    }

    for (const step of recipe.steps) {
      await client.query(
        `
          INSERT INTO recipe_steps (
            recipe_id,
            position,
            description
          )
          VALUES ($1, $2, $3)
        `,
        [receivedRecipeId, step.order, step.description],
      );
    }

    if (recipe.source !== null) {
      await client.query(
        `
          INSERT INTO recipe_sources (
            recipe_id,
            url,
            title,
            author
          )
          VALUES ($1, $2, $3, $4)
        `,
        [
          receivedRecipeId,
          recipe.source.url,
          recipe.source.title,
          recipe.source.author,
        ],
      );
    }

    await client.query(
      `
        INSERT INTO received_recipe_details (
          recipe_id,
          transfer_invitation_id,
          original_owner_id,
          original_owner_name,
          original_owner_profile_image_url,
          sender_display_name,
          relationship_label
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        receivedRecipeId,
        invitation.id,
        invitation.original_owner_id,
        originalOwner.name,
        originalOwner.profileImageUrl,
        request.senderDisplayName,
        request.relationshipLabel,
      ],
    );

    const usedResult = await client.query(
      `
        UPDATE transfer_invitations
        SET used_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND used_at IS NULL
      `,
      [invitation.id],
    );

    if (usedResult.rowCount !== 1) {
      throw new TransferInvitationError(
        "TRANSFER_INVITATION_USED",
      );
    }

    await client.query("COMMIT");

    return {
      recipeId: receivedRecipeId,
      type: "RECEIVED",
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original database error.
    }

    throw error;
  } finally {
    client.release();
  }
}
