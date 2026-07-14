import { createLocalJWKSet, exportJWK, SignJWT, type JWK } from "jose";
import { describe, expect, it } from "vitest";
import { JoseGithubOidcVerifier } from "../src/release-gate/github-oidc";
import {
  GITHUB_OIDC_ISSUER,
  RELEASE_GATE_AUDIENCE
} from "../src/shared/constants";
import { SecurityBoundaryError } from "../src/shared/errors";

describe("GitHub OIDC JWT 검증", () => {
  it("RS256, 고정 issuer와 audience를 모두 검증한다", async () => {
    const keys = await rsaFixture();
    const verifier = new JoseGithubOidcVerifier(
      createLocalJWKSet({ keys: [keys.publicJwk] })
    );
    const token = await sign(keys.privateKey, RELEASE_GATE_AUDIENCE);

    await expect(verifier.verify(token)).resolves.toMatchObject({ fixture: "ok" });
  });

  it("다른 audience token을 거부한다", async () => {
    const keys = await rsaFixture();
    const verifier = new JoseGithubOidcVerifier(
      createLocalJWKSet({ keys: [keys.publicJwk] })
    );
    const token = await sign(keys.privateKey, "wrong-audience");

    await expect(verifier.verify(token)).rejects.toBeInstanceOf(SecurityBoundaryError);
  });
});

async function rsaFixture(): Promise<{
  privateKey: CryptoKey;
  publicJwk: JWK;
}> {
  const pair = (await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1])
    },
    true,
    ["sign", "verify"]
  )) as CryptoKeyPair;
  const publicJwk = await exportJWK(pair.publicKey);
  publicJwk.kid = "github-fixture";
  publicJwk.alg = "RS256";
  return { privateKey: pair.privateKey, publicJwk };
}

async function sign(privateKey: CryptoKey, audience: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ fixture: "ok" })
    .setProtectedHeader({ alg: "RS256", kid: "github-fixture", typ: "JWT" })
    .setIssuer(GITHUB_OIDC_ISSUER)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + 60)
    .sign(privateKey);
}
