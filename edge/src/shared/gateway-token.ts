import {
  SignJWT,
  importJWK,
  jwtVerify,
  type JWK,
  type JWTPayload
} from "jose";
import {
  GATEWAY_TOKEN_LIFETIME_SECONDS,
  PROVIDER_GATEWAY_AUDIENCE,
  PROVIDER_GATEWAY_BLOG_SCOPE,
  PROVIDER_GATEWAY_LOCAL_SCOPE,
  PROVIDER_GATEWAY_SCOPE,
  RELEASE_GATE_TOKEN_ISSUER,
  SHA_PATTERN,
  UUID_V4_PATTERN
} from "./constants";
import { SecurityBoundaryError } from "./errors";
import { isPlainObject } from "./http";

export interface GatewayAuthorizationClaims {
  approvedSha: string;
  expiresAtEpochSeconds: number;
  jti: string;
  scope: GatewayScope;
}

export type GatewayScope =
  | typeof PROVIDER_GATEWAY_SCOPE
  | typeof PROVIDER_GATEWAY_LOCAL_SCOPE
  | typeof PROVIDER_GATEWAY_BLOG_SCOPE;

export interface GatewayTokenIssuer {
  issue(approvedSha: string, nowEpochSeconds: number): Promise<string>;
}

export interface GatewayTokenVerifier {
  verify(token: string, nowEpochSeconds: number): Promise<GatewayAuthorizationClaims>;
}

export class JoseGatewayTokenIssuer implements GatewayTokenIssuer {
  readonly #key: CryptoKey;
  readonly #keyId: string;
  readonly #randomUuid: () => string;

  private constructor(key: CryptoKey, keyId: string, randomUuid: () => string) {
    this.#key = key;
    this.#keyId = keyId;
    this.#randomUuid = randomUuid;
  }

  static async fromPrivateJwk(
    serializedJwk: string | undefined,
    keyId: string | undefined,
    randomUuid: () => string = () => crypto.randomUUID()
  ): Promise<JoseGatewayTokenIssuer> {
    const jwk = parseJwk(serializedJwk, true);
    if (typeof keyId !== "string" || keyId.length === 0 || jwk.kid !== keyId) {
      throw configurationError();
    }
    const key = await importJWK(jwk, "ES256");
    if (key instanceof Uint8Array) {
      throw configurationError();
    }
    return new JoseGatewayTokenIssuer(key, keyId, randomUuid);
  }

  async issue(approvedSha: string, nowEpochSeconds: number): Promise<string> {
    if (!SHA_PATTERN.test(approvedSha)) {
      throw new SecurityBoundaryError(500, "INVALID_APPROVED_SHA", "승인 SHA가 올바르지 않습니다.");
    }

    const jti = this.#randomUuid();
    if (!UUID_V4_PATTERN.test(jti)) {
      throw new SecurityBoundaryError(
        500,
        "INVALID_GATEWAY_JTI",
        "Gateway token 식별자를 만들 수 없습니다."
      );
    }

    return new SignJWT({ approvedSha, scope: PROVIDER_GATEWAY_SCOPE })
      .setProtectedHeader({ alg: "ES256", kid: this.#keyId, typ: "JWT" })
      .setIssuer(RELEASE_GATE_TOKEN_ISSUER)
      .setAudience(PROVIDER_GATEWAY_AUDIENCE)
      .setSubject("github-actions-naver-live-check")
      .setJti(jti)
      .setIssuedAt(nowEpochSeconds)
      .setNotBefore(nowEpochSeconds - 2)
      .setExpirationTime(nowEpochSeconds + GATEWAY_TOKEN_LIFETIME_SECONDS)
      .sign(this.#key);
  }
}

export class JoseGatewayTokenVerifier implements GatewayTokenVerifier {
  readonly #key: CryptoKey;
  readonly #keyId: string;

  private constructor(key: CryptoKey, keyId: string) {
    this.#key = key;
    this.#keyId = keyId;
  }

  static async fromPublicJwk(
    serializedJwk: string | undefined,
    keyId: string | undefined
  ): Promise<JoseGatewayTokenVerifier> {
    const jwk = parseJwk(serializedJwk, false);
    if (typeof keyId !== "string" || keyId.length === 0 || jwk.kid !== keyId) {
      throw configurationError();
    }
    const key = await importJWK(jwk, "ES256");
    if (key instanceof Uint8Array) {
      throw configurationError();
    }
    return new JoseGatewayTokenVerifier(key, keyId);
  }

  async verify(token: string, nowEpochSeconds: number): Promise<GatewayAuthorizationClaims> {
    let payload: JWTPayload;
    try {
      const verified = await jwtVerify(token, this.#key, {
        algorithms: ["ES256"],
        audience: PROVIDER_GATEWAY_AUDIENCE,
        clockTolerance: 2,
        currentDate: new Date(nowEpochSeconds * 1000),
        issuer: RELEASE_GATE_TOKEN_ISSUER,
        requiredClaims: ["exp", "iat", "jti", "scope", "approvedSha"],
        typ: "JWT"
      });
      if (verified.protectedHeader.kid !== this.#keyId) {
        throw new Error("unexpected key id");
      }
      payload = verified.payload;
    } catch {
      throw new SecurityBoundaryError(
        401,
        "GATEWAY_TOKEN_REJECTED",
        "Release Gate 인증을 확인할 수 없습니다."
      );
    }

    if (
      !isGatewayScope(payload.scope) ||
      payload.sub !== "github-actions-naver-live-check" ||
      typeof payload.approvedSha !== "string" ||
      !SHA_PATTERN.test(payload.approvedSha) ||
      typeof payload.jti !== "string" ||
      !UUID_V4_PATTERN.test(payload.jti) ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      payload.iat > nowEpochSeconds + 2 ||
      payload.exp <= nowEpochSeconds ||
      payload.exp - payload.iat > GATEWAY_TOKEN_LIFETIME_SECONDS
    ) {
      throw new SecurityBoundaryError(
        403,
        "GATEWAY_TOKEN_POLICY_REJECTED",
        "Release Gate 권한 범위와 일치하지 않습니다."
      );
    }

    return {
      approvedSha: payload.approvedSha,
      expiresAtEpochSeconds: payload.exp,
      jti: payload.jti,
      scope: payload.scope
    };
  }
}

function isGatewayScope(value: unknown): value is GatewayScope {
  return (
    value === PROVIDER_GATEWAY_SCOPE ||
    value === PROVIDER_GATEWAY_LOCAL_SCOPE ||
    value === PROVIDER_GATEWAY_BLOG_SCOPE
  );
}

function parseJwk(serializedJwk: string | undefined, requirePrivate: boolean): JWK {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serializedJwk ?? "");
  } catch {
    throw configurationError();
  }

  if (
    !isPlainObject(parsed) ||
    parsed.kty !== "EC" ||
    parsed.crv !== "P-256" ||
    typeof parsed.kid !== "string" ||
    typeof parsed.x !== "string" ||
    typeof parsed.y !== "string" ||
    (requirePrivate ? typeof parsed.d !== "string" : parsed.d !== undefined)
  ) {
    throw configurationError();
  }
  return parsed as JWK;
}

function configurationError(): SecurityBoundaryError {
  return new SecurityBoundaryError(
    503,
    "GATEWAY_SIGNING_KEY_UNAVAILABLE",
    "Gateway 서명 키가 준비되지 않았습니다."
  );
}
