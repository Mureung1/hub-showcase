import { exportJWK, SignJWT, type JWK } from "jose";
import { describe, expect, it } from "vitest";
import {
  JoseGatewayTokenIssuer,
  JoseGatewayTokenVerifier
} from "../src/shared/gateway-token";
import {
  PROVIDER_GATEWAY_AUDIENCE,
  RELEASE_GATE_TOKEN_ISSUER
} from "../src/shared/constants";
import { SecurityBoundaryError } from "../src/shared/errors";
import { APPROVED_SHA, GATEWAY_JTI, NOW_EPOCH_SECONDS } from "./fixtures";

describe("Release Gate → Provider Gateway 단기 JWT", () => {
  it("ES256 audience, scope, exp, jti와 승인 SHA를 검증한다", async () => {
    const keys = await ecFixture();
    const issuer = await JoseGatewayTokenIssuer.fromPrivateJwk(
      JSON.stringify(keys.privateJwk),
      "release-gate-fixture",
      () => GATEWAY_JTI
    );
    const verifier = await JoseGatewayTokenVerifier.fromPublicJwk(
      JSON.stringify(keys.publicJwk),
      "release-gate-fixture"
    );

    const token = await issuer.issue(APPROVED_SHA, NOW_EPOCH_SECONDS);

    await expect(verifier.verify(token, NOW_EPOCH_SECONDS)).resolves.toEqual({
      approvedSha: APPROVED_SHA,
      expiresAtEpochSeconds: NOW_EPOCH_SECONDS + 60,
      jti: GATEWAY_JTI,
      scope: "naver:live-check"
    });
  });

  it.each([
    ["wrong-audience", "naver:live-check"],
    [PROVIDER_GATEWAY_AUDIENCE, "naver:admin"]
  ])("audience=%s, scope=%s token을 거부한다", async (audience, scope) => {
    const keys = await ecFixture();
    const verifier = await JoseGatewayTokenVerifier.fromPublicJwk(
      JSON.stringify(keys.publicJwk),
      "release-gate-fixture"
    );
    const token = await new SignJWT({ approvedSha: APPROVED_SHA, scope })
      .setProtectedHeader({ alg: "ES256", kid: "release-gate-fixture", typ: "JWT" })
      .setIssuer(RELEASE_GATE_TOKEN_ISSUER)
      .setAudience(audience)
      .setSubject("github-actions-naver-live-check")
      .setJti(GATEWAY_JTI)
      .setIssuedAt(NOW_EPOCH_SECONDS)
      .setExpirationTime(NOW_EPOCH_SECONDS + 60)
      .sign(keys.privateKey);

    await expect(verifier.verify(token, NOW_EPOCH_SECONDS)).rejects.toBeInstanceOf(
      SecurityBoundaryError
    );
  });

  it("만료된 token을 거부한다", async () => {
    const keys = await ecFixture();
    const issuer = await JoseGatewayTokenIssuer.fromPrivateJwk(
      JSON.stringify(keys.privateJwk),
      "release-gate-fixture",
      () => GATEWAY_JTI
    );
    const verifier = await JoseGatewayTokenVerifier.fromPublicJwk(
      JSON.stringify(keys.publicJwk),
      "release-gate-fixture"
    );
    const token = await issuer.issue(APPROVED_SHA, NOW_EPOCH_SECONDS);

    await expect(verifier.verify(token, NOW_EPOCH_SECONDS + 61)).rejects.toBeInstanceOf(
      SecurityBoundaryError
    );
  });
});

async function ecFixture(): Promise<{
  privateJwk: JWK;
  privateKey: CryptoKey;
  publicJwk: JWK;
}> {
  const pair = (await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  )) as CryptoKeyPair;
  const privateJwk = await exportJWK(pair.privateKey);
  const publicJwk = await exportJWK(pair.publicKey);
  privateJwk.kid = "release-gate-fixture";
  publicJwk.kid = "release-gate-fixture";
  return { privateJwk, privateKey: pair.privateKey, publicJwk };
}
