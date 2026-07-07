# SemesterOps Context

SemesterOps is a local-first academic agent app for college students who struggle to manage a semester. This context captures the product language used to discuss the academic workspace and agent runtime decisions.

## Language

**SemesterOps**:
A local-first academic agent app that helps a student manage one semester's schedules, materials, tasks, and AI-assisted planning from a workspace on their own computer.
_Avoid_: Codex wrapper, developer tool

**Runtime Spike**:
A narrow, throwaway investigation used to decide whether SemesterOps can create an isolated local runtime boundary around an agent engine before committing to product architecture.
_Avoid_: MVP implementation, full app, production prototype

**Local Runtime Boundary**:
The boundary that keeps SemesterOps' bundled agent binary, runtime state, configuration, credentials, logs, and workspace access separate from the user's global agent installation and global home directory.
_Avoid_: Local install, sandbox, workspace

**Runtime Ownership**:
SemesterOps' ability to choose, launch, configure, and observe its agent runtime without depending on the user's globally installed Codex binary or default Codex home.
_Avoid_: Agent capability, task success, model quality

**Isolation Proof**:
Evidence that SemesterOps used its own pinned agent binary and app-managed runtime state even when the user's global Codex command or default Codex home would have produced a different result.
_Avoid_: Successful agent response, happy-path demo

**Runtime Ownership Spike**:
The throwaway spike under `spikes/codex-runtime-ownership/` that proves SemesterOps can own the Codex binary, version, state root, and app-server lifecycle before product code depends on them.
_Avoid_: Product runtime, SemesterOps server, MVP slice

**Subscription Auth Proof**:
Evidence that SemesterOps can authenticate its app-owned Codex runtime through ChatGPT subscription login inside the app-managed runtime boundary.
_Avoid_: API key proof, unauthenticated app-server startup

**Spike Auth Store**:
The file-based Codex credential storage used by the Runtime Ownership Spike so subscription login can be proven inside the app-managed `CODEX_HOME`.
_Avoid_: Default auth store, macOS keychain, global auth cache

**Semi-automated Spike**:
A spike whose environment setup and verification are automated, but whose ChatGPT OAuth login step intentionally allows user interaction.
_Avoid_: Fully automated test, CI test, manual checklist

**Non-destructive Global Check**:
An isolation check that observes the user's global Codex home before and after the spike without renaming, deleting, chmodding, or otherwise disrupting it.
_Avoid_: Global reset, destructive isolation, moving `~/.codex`

**Spike Report**:
A Korean Markdown report that records the Runtime Ownership Spike result, including observed evidence, failures, and remaining risks without storing secrets or raw credential files.
_Avoid_: Test log dump, English-only report, auth artifact

**Ping-pong Smoke Run**:
A minimal app-server check that proves the isolated runtime can start and complete a protocol handshake without asking the agent to perform real SemesterOps work.
_Avoid_: Agent task run, file-changing turn, product workflow
