# Frontend source structure

```text
src/
|- app/                  # app entry, router, providers
|- assets/               # bundled static assets
|- components/
|  |- common/            # shared UI
|  `- layout/            # shared layouts
|- constants/            # routes and shared constants
|- features/
|  |- discord/           # Discord API and domain types
|  `- notice-config/     # API, UI, state, and types for notice configuration
|- api/                  # domain-agnostic REST API client
|- pages/                # route-level screens
|- styles/               # global styles and design tokens
|- types/                # shared types
`- main.tsx              # React bootstrap
```

Pages compose feature and shared components. Keep endpoint calls, domain types,
and domain state in the owning feature. Root `api` contains only the HTTP client,
base URL handling, and shared error conversion that do not know any domain. Move
code to root `types` or `components` only when multiple features share it.
