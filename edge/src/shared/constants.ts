export const GITHUB_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
export const GITHUB_OIDC_JWKS_URL = new URL(
  "https://token.actions.githubusercontent.com/.well-known/jwks"
);
export const RELEASE_GATE_AUDIENCE = "placepick-edge-release-gate";
export const PROVIDER_GATEWAY_AUDIENCE = "placepick-provider-gateway";
export const RELEASE_GATE_TOKEN_ISSUER = "placepick-edge-release-gate";
export const PROVIDER_GATEWAY_SCOPE = "naver:live-check";
export const PROVIDER_GATEWAY_LOCAL_SCOPE = "naver:search:local";
export const PROVIDER_GATEWAY_BLOG_SCOPE = "naver:search:blog";

export const EXPECTED_REPOSITORY = "gdh0730/hub";
export const EXPECTED_REPOSITORY_ID = "1292154032";
export const EXPECTED_REPOSITORY_OWNER = "gdh0730";
export const EXPECTED_REPOSITORY_OWNER_ID = "83577923";
export const EXPECTED_ACTOR = "gdh0730";
export const EXPECTED_ACTOR_ID = "83577923";
export const EXPECTED_REF = "refs/heads/main";
export const EXPECTED_WORKFLOW_REF =
  "gdh0730/hub/.github/workflows/naver-live-check.yml@refs/heads/main";

export const NAVER_API_HUB_ORIGIN = "https://naverapihub.apigw.ntruss.com";
export const NAVER_LOCAL_PATH = "/search/v1/local";
export const NAVER_BLOG_PATH = "/search/v1/blog";
export const NAVER_CANARY_QUERY = "서울 카페";
export const NAVER_CANARY_DISPLAY = 1;

export const GITHUB_TOKEN_MAX_LIFETIME_SECONDS = 10 * 60;
export const GATEWAY_TOKEN_LIFETIME_SECONDS = 60;
export const PROVIDER_TIMEOUT_MILLISECONDS = 5_000;
export const PROVIDER_MIN_INTERVAL_MILLISECONDS = 1_000;
export const PROVIDER_RESPONSE_MAX_BYTES = 1024 * 1024;
export const JSON_REQUEST_MAX_BYTES = 4 * 1024;
export const GATEWAY_RESPONSE_MAX_BYTES = 32 * 1024;
export const GITHUB_CONTENTS_RESPONSE_MAX_BYTES = 512 * 1024;
export const GITHUB_WORKFLOW_MAX_BYTES = 256 * 1024;
export const GITHUB_CONTENTS_TIMEOUT_MILLISECONDS = 5_000;
export const EXPECTED_WORKFLOW_PATH = ".github/workflows/naver-live-check.yml";
export const SHA256_PATTERN = /^[0-9a-f]{64}$/u;

export const SHA_PATTERN = /^[0-9a-f]{40}$/u;
export const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
