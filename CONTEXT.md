# SemesterOps Context

SemesterOps is a local-first academic agent app for college students who struggle to manage a semester. This context captures the product language used to discuss the academic workspace and agent runtime decisions.

## Language

**SemesterOps**:
A local-first academic agent app that helps a student manage one semester's schedules, materials, tasks, and AI-assisted planning from a workspace on their own computer.
_Avoid_: Codex wrapper, developer tool

**Init**:
The stage where a student fixes the confirmed courses for a semester and SemesterOps creates the initial semester workspace and model.
_Avoid_: Generic onboarding, account setup

**MaterialIntake**:
The stage where a student drops unorganized semester materials into SemesterOps without having to classify or clean them first.
_Avoid_: Dump, manual filing, upload-only flow

**RawMaterial**:
An original course or semester artifact, such as an LMS notice, syllabus, PDF, slide deck, document, image, or note, preserved before SemesterOps interprets it.
_Avoid_: Clean data, parsed result, attachment

**SourceList**:
The GUI list of RawMaterial available for a student to inspect, select, and explicitly send into AgentModeling.
_Avoid_: File explorer, automatic inbox

**SourceSelection**:
The student-chosen set of RawMaterial that becomes the input to a ModelingRun.
_Avoid_: Implicit batch, background queue

**RawState**:
The persistence layer for original RawMaterial and provenance before SemesterOps interprets or trusts it.
_Avoid_: Draft, trusted data

**AgentModeling**:
The stage where SemesterOps turns RawMaterial into the app's structured understanding of courses, materials, notices, schedules, tasks, and uncertainties.
_Avoid_: Summarization, AI cleanup, simple extraction

**AgentLedProcessing**:
The product principle that the Agent chooses how to process a SourceSelection at runtime using built-in Skills, local scripts, files, and user interaction instead of the app hard-coding every material type or case.
_Avoid_: Static file routing, case-based import, automatic classification

**ProcessingGuardrail**:
A bounded rule or app-provided affordance that helps AgentLedProcessing stay safe and understandable without replacing the Agent's judgment.
_Avoid_: Full workflow automation, hard-coded parser route

**ModelingRun**:
A user-initiated AgentModeling operation against a SourceSelection, started from the GUI or conversation and allowed to plan or split work internally.
_Avoid_: Automatic background import, global reindex

**DraftState**:
The provisional SemesterModel interpretation produced by AgentModeling before a student has reviewed or corrected it.
_Avoid_: Final state, trusted state

**SemesterModel**:
The structured state SemesterOps uses to represent a semester after RawMaterial has been interpreted, reviewed, and connected to courses.
_Avoid_: Calendar, folder structure, chat history

**MarkdownProjection**:
A human-readable Markdown document generated from SemesterModel state under a built-in heading template, where the section content may use tables, bullets, Mermaid, or other suitable presentation formats without becoming the source of truth.
_Avoid_: Source document, freeform Markdown state

**Review**:
The stage where a student confirms, corrects, or rejects proposed changes before they become trusted SemesterModel state.
_Avoid_: Passive approval, final submission

**ReviewState**:
The set of AgentModeling outputs and uncertainties that need student confirmation, correction, or rejection.
_Avoid_: Notification list, final task list

**TrustedState**:
The user-confirmed SemesterModel state that SemesterOps can use for WorkspaceQuery, UI rendering, and artifact generation.
_Avoid_: Agent guess, draft

**UserCorrection**:
A student's interactive correction to AgentModeling output that changes draft or trusted SemesterModel state before final artifacts are accepted.
_Avoid_: Chat feedback, comment, manual override

**UserConfirmation**:
The student's explicit decision that makes a proposed SemesterModel change trusted.
_Avoid_: Agent approval, automatic acceptance

**ArtifactState**:
The persisted record of MarkdownProjection and other generated outputs derived from draft or trusted SemesterModel state.
_Avoid_: Source of truth, raw material

**FinalArtifact**:
A user-accepted output produced after AgentModeling and UserCorrection, such as a trusted SemesterModel update or MarkdownProjection.
_Avoid_: First draft, raw agent output

**WorkspaceQuery**:
The stage where a student asks questions against the SemesterModel and linked RawMaterial to understand what matters now.
_Avoid_: Generic chat, search box, Q&A bot

**ChatSidecar**:
The persistent conversational surface that lets a student talk with the Agent in the context of the current SourceSelection, ModelingRun, ReviewState, or MarkdownProjection.
_Avoid_: Standalone chatbot, separate AI tab

**CoControl**:
The interaction model where a student uses GUI controls and Agent conversation against the same live SemesterModel, so neither surface feels separate from the other.
_Avoid_: Chat-only assistant, GUI-only app, split brain UX

**UIPrototypeSpike**:
A focused prototype used to decide the user-facing layout after the required UX capabilities are known.
_Avoid_: Final product design, implementation sprint

**LiveStateSync**:
The app-mediated flow that turns GUI decisions into Agent-visible context and Agent work into GUI-visible state changes without relying on passive file changes alone.
_Avoid_: File watcher magic, stale agent context, manual refresh

**StatePatch**:
A structured proposed change to DraftState, ReviewState, TrustedState, or ArtifactState that can originate from GUI actions, UserCorrection, or AgentModeling.
_Avoid_: Freeform chat instruction, direct database mutation

**RecommendedChoice**:
The Agent's suggested option for a UserConfirmation so the student can accept a sensible default instead of making every decision from scratch.
_Avoid_: Automatic choice, hidden default

**AgentRuntimeAdapter**:
The app-owned adapter that starts, initializes, and controls an agent runtime such as Codex app-server while hiding transport and protocol details from the product.
_Avoid_: Direct Codex dependency, model client, MCP surface

**AppCapabilitySurface**:
The small live app control surface exposed to an Agent for cases that need app-mediated interaction, especially requesting a user decision from the GUI.
_Avoid_: General feature API, direct database access, everything-as-MCP

**MCP Tool**:
A concrete callable capability in the AppCapabilitySurface for live app-mediated interaction that cannot be handled cleanly by files, scripts, hooks, or server events.
_Avoid_: Skill, prompt, raw shell command, default extension point

**UserDecisionRequest**:
A live request from an Agent to the student through the GUI when AgentModeling cannot safely continue without user judgment.
_Avoid_: Review item, notification, background task

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
