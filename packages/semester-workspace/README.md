# `@ay-ple/semester-workspace`

`@ay-ple/semester-workspace`는 app-owned v3 `SemesterWorkspace` admission, setup durability와 package-owned workspace instruction/Skill bundle을 맡을 Node-only Module의 workspace다.

현재 `Spine S0`에서는 package identity와 test·typecheck·build seam만 제공한다. Workspace schema, filesystem scaffold, durable setup state와 `resources/workspace/**`의 실제 bundle byte는 아직 구현하지 않는다.
