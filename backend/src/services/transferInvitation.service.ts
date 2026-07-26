import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
} from "node:crypto";
import type { Pool } from "pg";
import {
  TransferInvitationError,
  UUID_PATTERN,
  type RecipeSnapshot,
  type SharedRecipe,
} from "./transferInvitation.shared.js";

export { acceptTransferInvitation } from "./transferInvitationAccept.service.js";
export {
  TransferInvitationError,
  type TransferInvitationErrorCode,
} from "./transferInvitation.shared.js";

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

const INVITATION_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1_000;

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
