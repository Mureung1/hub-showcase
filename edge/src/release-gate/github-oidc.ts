import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey
} from "jose";
import {
  GITHUB_OIDC_ISSUER,
  GITHUB_OIDC_JWKS_URL,
  RELEASE_GATE_AUDIENCE
} from "../shared/constants";
import { SecurityBoundaryError } from "../shared/errors";

export interface GithubOidcVerifier {
  verify(token: string): Promise<JWTPayload>;
}

const remoteGithubKeys = createRemoteJWKSet(GITHUB_OIDC_JWKS_URL);

export class JoseGithubOidcVerifier implements GithubOidcVerifier {
  readonly #keyResolver: JWTVerifyGetKey;

  constructor(keyResolver: JWTVerifyGetKey = remoteGithubKeys) {
    this.#keyResolver = keyResolver;
  }

  async verify(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, this.#keyResolver, {
        algorithms: ["RS256"],
        audience: RELEASE_GATE_AUDIENCE,
        clockTolerance: 5,
        issuer: GITHUB_OIDC_ISSUER,
        typ: "JWT"
      });
      return payload;
    } catch {
      throw new SecurityBoundaryError(
        401,
        "GITHUB_OIDC_REJECTED",
        "GitHub OIDC 인증을 확인할 수 없습니다."
      );
    }
  }
}
