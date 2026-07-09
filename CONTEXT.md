# AY-PLE Context

AY-PLE is a local-first academic agent app for college students who struggle to manage a semester. This context captures the product language used to discuss the academic workspace and agent runtime decisions.

## Language

**AY-PLE**:
The student-facing platform brand for a local-first academic agent app that helps a student manage one semester's schedules, materials, tasks, and AI-assisted planning from a workspace on their own computer. Pronounced "에이플", it echoes A+ while staying friendly enough for a college study tool.
_Avoid_: SemesterOps, Codex wrapper, developer tool

**AY**:
The student-facing agent name inside AY-PLE, pronounced "에이" and meant to feel like calling to someone for help.
_Avoid_: AI Agent, bot, assistant in visible product UI

**Student-facing Language**:
The product copy style for AY-PLE screens: plain wording that non-developer college students can understand, keeping implementation and agent-runtime terms out of the UI.
_Avoid_: Developer UI, internal state labels, English technical labels

**Light Academic Workspace**:
The visual direction for AY-PLE's default UI: bright paper-like surfaces, calm productivity density, and brand coral/green/yellow accents that feel approachable to college students without copying a dark IDE or terminal.
_Avoid_: Dark IDE default, terminal skin, generic AI SaaS gradient, mascot-only toy UI

**Init**:
The stage where a student fixes the confirmed courses for a semester and AY-PLE creates the initial semester workspace and model.
_Avoid_: Generic onboarding, account setup

**MaterialIntake**:
The stage where a student drops unorganized semester materials into AY-PLE without having to classify or clean them first.
_Avoid_: Dump, manual filing, upload-only flow

**RawMaterial**:
An original course or semester artifact, such as an LMS notice, syllabus, PDF, slide deck, document, image, or note, preserved before AY-PLE interprets it.
_Avoid_: Clean data, parsed result, attachment

**EvidenceRef**:
A field-level reference from a RawMaterial location or quote to a specific SemesterModel fact, used to explain why AY-PLE believes a proposed value.
_UI alias_: 근거 연결
_Avoid_: Generic citation, source file, footnote

**SourceList**:
The GUI list of RawMaterial available for a student to inspect, select, and explicitly send into AgentModeling.
_Avoid_: File explorer, automatic inbox

**SourceSelection**:
The student-chosen set of RawMaterial that becomes the input to a ModelingRun.
_Avoid_: Implicit batch, background queue

**RawState**:
The persistence layer for original RawMaterial and provenance before AY-PLE interprets or trusts it.
_Avoid_: Draft, trusted data

**AgentModeling**:
The stage where AY-PLE turns RawMaterial into the app's structured understanding of courses, materials, notices, schedules, tasks, and uncertainties.
_Avoid_: Summarization, AI cleanup, simple extraction

**AgentLedProcessing**:
The product principle that AY chooses how to process a SourceSelection at runtime using built-in Skills, local scripts, files, and user interaction instead of the app hard-coding every material type or case.
_Avoid_: Static file routing, case-based import, automatic classification

**ProcessingGuardrail**:
A bounded rule or app-provided affordance that helps AgentLedProcessing stay safe and understandable without replacing AY's judgment.
_Avoid_: Full workflow automation, hard-coded parser route

**ModelingRun**:
A user-initiated AgentModeling operation against a SourceSelection, started from the GUI or conversation and allowed to plan or split work internally.
_UI alias_: 선택한 자료 정리하기
_Avoid_: Automatic background import, global reindex

**DraftState**:
The provisional SemesterModel interpretation produced by AgentModeling before a student has reviewed or corrected it.
_Avoid_: Final state, trusted state

**SemesterModel**:
The structured state AY-PLE uses to represent a semester after RawMaterial has been interpreted, reviewed, and connected to courses.
_Avoid_: Calendar, folder structure, chat history

**Assignment**:
A first-class academic requirement in AY-PLE, representing coursework that asks the student to produce, submit, or complete something for a course. It owns assignment facts such as due dates, submission details, requirements, cautions, and evidence.
_UI alias_: 과제
_Avoid_: Generic task, calendar event, board card

**Exam**:
A first-class academic assessment in AY-PLE, representing a test, quiz, midterm, final, or similar evaluation with date, scope, location, allowed materials, preparation guidance, and evidence.
_UI alias_: 시험
_Avoid_: Generic event, study note, dashboard widget

**TaskCandidate**:
A proposed student action, such as reading, drafting, submitting, reviewing, or preparing, that may be derived from an Assignment, Exam, RawMaterial, or UserCorrection before it becomes trusted semester work.
_UI alias_: 추천 할 일
_Avoid_: Assignment, exam, deadline

**StudentTask**:
A trusted operational action that the student has accepted into their task list. When linked to an Assignment or Exam, it references the academic object's deadline instead of duplicating it.
_UI alias_: 내 할 일
_Avoid_: Assignment, exam, schedule event

**ScheduleEvent**:
A canonical standalone time fact that is not better owned by an Assignment or Exam, such as a class meeting, makeup class, cancelled class, office hour, or department event.
_UI alias_: 별도 일정
_Avoid_: Assignment deadline, exam time, task

**TimelineEntry**:
A derived calendar or timeline row generated from Assignment, Exam, ScheduleEvent, or StudentTask state. It is rebuildable read-model data, not the source of truth for academic facts.
_UI alias_: 타임라인 항목
_Avoid_: Schedule source of truth, assignment, exam

**MarkdownProjection**:
A human-readable Markdown document generated from SemesterModel state under a built-in heading template, where the section content may use tables, bullets, Mermaid, or other suitable presentation formats without becoming the source of truth.
_Avoid_: Source document, freeform Markdown state

**Review**:
The stage where a student confirms, corrects, or rejects proposed changes before they become trusted SemesterModel state.
_Avoid_: Passive approval, final submission

**ReviewState**:
The set of AgentModeling outputs and uncertainties that need student confirmation, correction, or rejection.
_UI alias_: 검토 대기
_Avoid_: Notification list, final task list

**TrustedState**:
The user-confirmed SemesterModel state that AY-PLE can use for WorkspaceQuery, UI rendering, and artifact generation.
_UI alias_: 반영됨
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

**WorkspaceHistory**:
The local-only app-managed history layer, likely backed by Git, that records user-meaningful checkpoints while presenting them to students as history, diff, and rollback instead of Git.
_Avoid_: User-facing Git workflow, manual commit flow, internal event log

**HistoryCheckpoint**:
A user-meaningful snapshot in WorkspaceHistory created by the app at clear branch points such as MaterialIntake, UserConfirmation, MarkdownProjection regeneration, or a manual snapshot.
_Avoid_: Arbitrary autosave, raw Git commit

**WorkspaceQuery**:
The stage where a student asks questions against the SemesterModel and linked RawMaterial to understand what matters now.
_Avoid_: Generic chat, search box, Q&A bot

**ChatSidecar**:
The persistent conversational surface that lets a student talk with AY in the context of the current SourceSelection, ModelingRun, ReviewState, or MarkdownProjection.
_Avoid_: Standalone chatbot, separate AI tab

**CoControl**:
The interaction model where a student uses GUI controls and AY conversation against the same live SemesterModel, so neither surface feels separate from the other.
_Avoid_: Chat-only assistant, GUI-only app, split brain UX

**Review-first Academic Workspace**:
The first AY-PLE workspace pattern where a student reviews AgentModeling proposals from a SourceSelection, checks linked RawMaterial and ChatSidecar context, and then confirms changes before derived timeline, task, and projection surfaces become trusted.
_UI alias_: 검토 중심 학업 워크스페이스
_Avoid_: Dashboard, calendar-first UI, chat-first UI

**UIPrototypeSpike**:
A focused prototype used to decide the user-facing layout after the required UX capabilities are known.
_Avoid_: Final product design, implementation sprint

**LiveStateSync**:
The app-mediated flow that turns GUI decisions into AY-visible context and AY work into GUI-visible state changes without relying on passive file changes alone.
_Avoid_: File watcher magic, stale agent context, manual refresh

**StatePatch**:
A structured proposed change to DraftState, ReviewState, TrustedState, or ArtifactState that can originate from GUI actions, UserCorrection, or AgentModeling.
_UI alias_: 변경 제안
_Avoid_: Freeform chat instruction, direct database mutation

**RecommendedChoice**:
AY's suggested option for a UserConfirmation so the student can accept a sensible default instead of making every decision from scratch.
_Avoid_: Automatic choice, hidden default

**AgentRuntimeAdapter**:
The app-owned adapter that starts, initializes, and controls an agent runtime such as Codex app-server while hiding transport and protocol details from the product.
_Avoid_: Direct Codex dependency, model client, MCP surface

**Runtime Harness**:
An internal desktop web workspace for proving that AY-PLE can start, observe, and control a Codex-based runtime before product-specific academic logic is layered on top.
_Avoid_: Final AY-PLE app, generic Codex client, student-facing product slice

**Runtime Inspector**:
The first Runtime Harness UI surface: a developer-facing view with prompt, transcript, runtime status, normalized events, raw/debug logs, cancellation, and run history for inspecting Codex app-server behavior. Its controls reserve runtime capabilities for later product design, but they are not commitments to expose the same controls in AY-PLE's student-facing UI.
_Avoid_: General chat app, AY-PLE student UI, polished assistant experience, product surface contract

**AgentRuntimeKernel**:
The stable runtime module that owns run lifecycle, normalized runtime events, cancellation, failure handling, and run logs so AY-PLE-specific flows do not depend directly on Codex raw protocol events.
_Avoid_: Product workflow, raw Codex wrapper, AY-PLE feature module

**AppCapabilitySurface**:
The small live app control surface exposed to AY for cases that need app-mediated interaction, especially requesting a user decision from the GUI.
_Avoid_: General feature API, direct database access, everything-as-MCP

**MCP Tool**:
A concrete callable capability in the AppCapabilitySurface for live app-mediated interaction that cannot be handled cleanly by files, scripts, hooks, or server events.
_Avoid_: Skill, prompt, raw shell command, default extension point

**UserDecisionRequest**:
A live request from AY to the student through the GUI when AgentModeling cannot safely continue without user judgment.
_Avoid_: Review item, notification, background task

**Runtime Spike**:
A narrow, throwaway investigation used to decide whether AY-PLE can create an isolated local runtime boundary around an agent engine before committing to product architecture.
_Avoid_: MVP implementation, full app, production prototype

**Local Runtime Boundary**:
The boundary that keeps AY-PLE's bundled agent binary, runtime state, configuration, credentials, logs, and workspace access separate from the user's global agent installation and global home directory.
_Avoid_: Local install, sandbox, workspace

**Runtime Ownership**:
AY-PLE's ability to choose, launch, configure, and observe its agent runtime without depending on the user's globally installed Codex binary or default Codex home.
_Avoid_: Agent capability, task success, model quality

**Isolation Proof**:
Evidence that AY-PLE used its own pinned agent binary and app-managed runtime state even when the user's global Codex command or default Codex home would have produced a different result.
_Avoid_: Successful agent response, happy-path demo

**Runtime Ownership Spike**:
The throwaway spike under `spikes/codex-runtime-ownership/` that proves AY-PLE can own the Codex binary, version, state root, and app-server lifecycle before product code depends on them.
_Avoid_: Product runtime, AY-PLE server, MVP slice

**Subscription Auth Proof**:
Evidence that AY-PLE can authenticate its app-owned Codex runtime through ChatGPT subscription login inside the app-managed runtime boundary.
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
A minimal app-server check that proves the isolated runtime can start and complete a protocol handshake without asking the agent to perform real AY-PLE work.
_Avoid_: Agent task run, file-changing turn, product workflow
