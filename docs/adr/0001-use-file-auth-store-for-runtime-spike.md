# Use file-based Codex auth storage for the runtime ownership spike

The Runtime Ownership Spike will force `cli_auth_credentials_store = "file"` inside its app-managed `CODEX_HOME` so ChatGPT subscription login can be proven by the presence of `auth.json` in the isolated runtime home. This deliberately favors observable isolation proof over the default `auto` behavior, which may store credentials in the OS keychain and make it harder to prove that the spike did not rely on the user's global Codex state.
