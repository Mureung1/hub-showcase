import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
} from "node:crypto";
import type { Pool } from "pg";

type RecipeType = "OWNED" | "EXTERNAL" | "RECEIVED";

type RecipeRow = {
  id: string;
  type: RecipeType;
  title: string;
  description: string | null;
  servings: string | null;
  cooking_time_minutes: number | null;
  source_url: string | null;
  source_title: string | null;
  source_author: string | null;
  owner_name: string;
  owner_profile_image_url: string | null;
};

type IngredientRow = {
  name: string;
  amount: string | null;
  unit: string | null;
  position: number;
};

type RecipeStepRow = {
  description: string;
  position: number;
};

type SharedRecipe = {
  title: string;
  description: string | null;
  servings: string | null;
  cookingTimeMinutes: number | null;
  ingredients: Array<{
    name: string;
    amount: string | null;
    unit: string | null;
    order: number;
  }>;
  steps: Array<{
    order: number;
    description: string;
  }>;
  source: {
    url: string;
    title: string | null;
    author: string | null;
  } | null;
};

type RecipeSnapshot = {
  recipe: SharedRecipe;
  originalOwner: {
    name: string;
    profileImageUrl: string | null;
  };
};

type TransferInvitationCreated = {
  invitationId: string;
  transferPath: string;
  invitationCode: string;
  createdAt: string;
  expiresAt: string;
};

type TransferInvitationPreview = {
  invitationId: string;
  recipe: SharedRecipe;
  originalOwner: RecipeSnapshot["originalOwner"];
  expiresAt: string;
  canReshare: false;
};

type TransferInvitationRow = {
  id: string;
  snapshot: RecipeSnapshot;
  expires_at: Date;
  used_at: Date | null;
};

type AcceptTransferInvitationRow = TransferInvitationRow & {
  source_recipe_id: string;
  original_owner_id: string;
};

type FirebaseTransferUser = {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
};

type AcceptTransferInvitationRequest = {
  senderDisplayName: string;
  relationshipLabel: string;
  memo: string | null;
};

export type TransferInvitationErrorCode =
  | "VALIDATION_ERROR"
  | "RECIPE_NOT_FOUND"
  | "RECIPE_NOT_SHAREABLE"
  | "TRANSFER_INVITATION_NOT_FOUND"
  | "TRANSFER_INVITATION_USED"
  | "TRANSFER_INVITATION_EXPIRED"
  | "TRANSFER_INVITATION_SELF_ACCEPT_NOT_ALLOWED";

export class TransferInvitationError extends Error {
  constructor(readonly code: TransferInvitationErrorCode) {
    super(code);
  }
}

const INVITATION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1_000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACCEPT_REQUEST_KEYS = [
  "senderDisplayName",
  "relationshipLabel",
  "memo",
] as const;

function hashLinkToken(linkToken: string) {
  return createHash("sha256").update(linkToken).digest("hex");
}

function hashInvitationCode(invitationCode: string, codeSecret: string) {
  return createHmac("sha256", codeSecret)
    .update(invitationCode)
    .digest("hex");
}

function createInvitationCode() {
  let invitationCode = "";

  for (let index = 0; index < 8; index += 1) {
    invitationCode +=
      INVITATION_CODE_ALPHABET[randomInt(INVITATION_CODE_ALPHABET.length)];
  }

  return `${invitationCode.slice(0, 4)}-${invitationCode.slice(4)}`;
}

function normalizeInvitationCode(invitationCode: unknown) {
  if (typeof invitationCode !== "string") {
    throw new TransferInvitationError("VALIDATION_ERROR");
  }

  const normalizedCode = invitationCode
    .toUpperCase()
    .replace(/[\s-]/g, "");

  if (normalizedCode.length === 0) {
    throw new TransferInvitationError("VALIDATION_ERROR");
  }

  return normalizedCode;
}

function normalizeAcceptRequest(
  requestBody: unknown,
): AcceptTransferInvitationRequest {
  if (
    typeof requestBody !== "object" ||
    requestBody === null ||
    Array.isArray(requestBody)
  ) {
    throw new TransferInvitationError("VALIDATION_ERROR");
  }

  const request = requestBody as Record<string, unknown>;
  const requestKeys = Object.keys(request);

  if (
    requestKeys.length !== ACCEPT_REQUEST_KEYS.length ||
    !requestKeys.every((key) =>
      ACCEPT_REQUEST_KEYS.includes(
        key as (typeof ACCEPT_REQUEST_KEYS)[number],
      ),
    ) ||
    typeof request.senderDisplayName !== "string" ||
    request.senderDisplayName.trim().length === 0 ||
    typeof request.relationshipLabel !== "string" ||
    request.relationshipLabel.trim().length === 0 ||
    (request.memo !== null && typeof request.memo !== "string")
  ) {
    throw new TransferInvitationError("VALIDATION_ERROR");
  }

  return {
    senderDisplayName: request.senderDisplayName.trim(),
    relationshipLabel: request.relationshipLabel.trim(),
    memo:
      typeof request.memo === "string" &&
      request.memo.trim().length > 0
        ? request.memo.trim()
        : null,
  };
}

export function getTransferInvitationCodeSecret() {
  const codeSecret = process.env.TRANSFER_INVITATION_CODE_SECRET;

  if (!codeSecret || codeSecret.trim().length < 32) {
    throw new Error(
      "TRANSFER_INVITATION_CODE_SECRET은 32자 이상이어야 합니다.",
    );
  }

  return codeSecret;
}

export async function createTransferInvitation(
  pool: Pick<Pool, "connect">,
  firebaseUid: string,
  recipeId: string,
  codeSecret: string,
): Promise<TransferInvitationCreated> {
  if (!UUID_PATTERN.test(recipeId)) {
    throw new TransferInvitationError("RECIPE_NOT_FOUND");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ");

    const recipeResult = await client.query<RecipeRow>(
      `
        SELECT
          recipes.id,
          recipes.type,
          recipes.title,
          recipes.description,
          recipes.servings,
          recipes.cooking_time_minutes,
          recipe_sources.url AS source_url,
          recipe_sources.title AS source_title,
          recipe_sources.author AS source_author,
          COALESCE(users.name, '사용자') AS owner_name,
          users.profile_image_url AS owner_profile_image_url
        FROM recipes
        INNER JOIN users ON users.id = recipes.owner_id
        LEFT JOIN recipe_sources ON recipe_sources.recipe_id = recipes.id
        WHERE recipes.id = $1
          AND users.firebase_uid = $2
          AND recipes.deleted_at IS NULL
      `,
      [recipeId, firebaseUid],
    );
    const recipe = recipeResult.rows[0];

    if (!recipe) {
      throw new TransferInvitationError("RECIPE_NOT_FOUND");
    }

    if (recipe.type !== "OWNED") {
      throw new TransferInvitationError("RECIPE_NOT_SHAREABLE");
    }

    const ingredientsResult = await client.query<IngredientRow>(
      `
        SELECT name, amount, unit, position
        FROM ingredients
        WHERE recipe_id = $1
        ORDER BY position
      `,
      [recipeId],
    );
    const stepsResult = await client.query<RecipeStepRow>(
      `
        SELECT description, position
        FROM recipe_steps
        WHERE recipe_id = $1
        ORDER BY position
      `,
      [recipeId],
    );
    const snapshot: RecipeSnapshot = {
      recipe: {
        title: recipe.title,
        description: recipe.description,
        servings: recipe.servings,
        cookingTimeMinutes: recipe.cooking_time_minutes,
        ingredients: ingredientsResult.rows.map((ingredient) => ({
          name: ingredient.name,
          amount: ingredient.amount,
          unit: ingredient.unit,
          order: ingredient.position,
        })),
        steps: stepsResult.rows.map((step) => ({
          order: step.position,
          description: step.description,
        })),
        source:
          recipe.source_url === null
            ? null
            : {
                url: recipe.source_url,
                title: recipe.source_title,
                author: recipe.source_author,
              },
      },
      originalOwner: {
        name: recipe.owner_name,
        profileImageUrl: recipe.owner_profile_image_url,
      },
    };
    const invitationId = randomUUID();
    const linkToken = randomBytes(32).toString("base64url");
    const invitationCode = createInvitationCode();
    const normalizedCode = normalizeInvitationCode(invitationCode);
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + INVITATION_LIFETIME_MS);

    await client.query(
      `
        INSERT INTO transfer_invitations (
          id,
          source_recipe_id,
          link_token_hash,
          invitation_code_hash,
          snapshot,
          created_at,
          expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        invitationId,
        recipeId,
        hashLinkToken(linkToken),
        hashInvitationCode(normalizedCode, codeSecret),
        snapshot,
        createdAt,
        expiresAt,
      ],
    );

    await client.query("COMMIT");

    return {
      invitationId,
      transferPath: `/transfer-invitations/${linkToken}`,
      invitationCode,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
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

async function getTransferInvitationPreview(
  pool: Pick<Pool, "query">,
  invitationHash: string,
): Promise<TransferInvitationPreview> {
  const result = await pool.query<TransferInvitationRow>(
    `
      SELECT id, snapshot, expires_at, used_at
      FROM transfer_invitations
      WHERE (
        link_token_hash = $1
        OR invitation_code_hash = $1
      )
        AND snapshot_version = 1
    `,
    [invitationHash],
  );
  const invitation = result.rows[0];

  if (!invitation) {
    throw new TransferInvitationError("TRANSFER_INVITATION_NOT_FOUND");
  }

  if (invitation.used_at !== null) {
    throw new TransferInvitationError("TRANSFER_INVITATION_USED");
  }

  if (invitation.expires_at.getTime() <= Date.now()) {
    throw new TransferInvitationError("TRANSFER_INVITATION_EXPIRED");
  }

  return {
    invitationId: invitation.id,
    recipe: invitation.snapshot.recipe,
    originalOwner: invitation.snapshot.originalOwner,
    expiresAt: invitation.expires_at.toISOString(),
    canReshare: false,
  };
}

export async function getTransferInvitationByLink(
  pool: Pick<Pool, "query">,
  linkToken: string,
) {
  return getTransferInvitationPreview(pool, hashLinkToken(linkToken));
}

export async function getTransferInvitationByCode(
  pool: Pick<Pool, "query">,
  invitationCode: unknown,
  codeSecret: string,
) {
  const normalizedCode = normalizeInvitationCode(invitationCode);

  return getTransferInvitationPreview(
    pool,
    hashInvitationCode(normalizedCode, codeSecret),
  );
}

export async function acceptTransferInvitation(
  pool: Pick<Pool, "connect">,
  firebaseUser: FirebaseTransferUser,
  invitationId: string,
  requestBody: unknown,
): Promise<{ recipeId: string; type: "RECEIVED" }> {
  if (!UUID_PATTERN.test(invitationId)) {
    throw new TransferInvitationError("TRANSFER_INVITATION_NOT_FOUND");
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
      throw new TransferInvitationError("TRANSFER_INVITATION_EXPIRED");
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
      throw new TransferInvitationError("TRANSFER_INVITATION_USED");
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
