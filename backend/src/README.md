# Backend source structure

```text
src/
|- main.ts               # process entry and server startup
|- app.ts                # Express app and middleware composition
|- config/               # environment and runtime configuration
|- db/                   # Prisma client and database connection
|- shared/               # cross-domain errors, logger, HTTP helpers, types
|- modules/
|  |- notice-config/     # notice site and category configuration
|  |- crawling/          # crawling, crawl test, link normalization
|  |- discord/           # Discord client, resources, slash commands
|  |- subscription/      # category subscriptions
|  |- keyword/           # keyword alerts
|  |- notification/      # channel and DM notifications
|  `- summary/           # future on-demand AI summary extension
`- scheduler/            # scheduled notice crawling
```

Keep controllers, services, repositories, schemas, and types inside the owning
domain module. Put code in `shared` only when it is independent of every domain.
