# `@ay-ple/semester-workspace`

`@ay-ple/semester-workspace`는 app-owned v3 `SemesterWorkspace` admission, setup durability와 package-owned workspace instruction/Skill bundle을 맡을 Node-only Module의 workspace다.

현재 `Spine S0`에서는 package identity와 test·typecheck·build seam만 제공한다. Workspace schema, filesystem scaffold와 durable setup state는 아직 구현하지 않는다.

`resources/workspace/.spine-s0-placeholder.json`은 canonical resource root를 Git에 고정하기 위한 `releaseResource: false` marker다. 실제 bundle byte가 아니며 actual bundle entry를 추가하기 전에 제거해야 한다. Marker는 bundle entry와 공존할 수 없고, 공존하거나 다른 entry가 생기면 current scaffold test가 실패하므로 released workspace bundle로 취급할 수 없다.
