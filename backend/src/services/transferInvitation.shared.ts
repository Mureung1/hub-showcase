export type SharedRecipe = {
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

export type RecipeSnapshot = {
  recipe: SharedRecipe;
  originalOwner: {
    name: string;
    profileImageUrl: string | null;
  };
};

export type FirebaseTransferUser = {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
};

export type AcceptTransferInvitationRequest = {
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

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ACCEPT_REQUEST_KEYS = [
  "senderDisplayName",
  "relationshipLabel",
  "memo",
] as const;

export function normalizeAcceptRequest(
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
