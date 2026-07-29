# 007 — AY Python work environment의 구조를 검증한다

## Wayfinder ticket

- Type: prototype
- State: open
- Blocked by: [App host와 AY work environment의 ownership seam을 정한다](005-environment-ownership-seam.md), [Rich environment의 dependency 선정 정책을 정한다](006-rich-environment-policy.md)

## Question

Bundled CPython을 재사용하면서 Bridge-private site-packages와 AY가 shell에서 사용하는 rich Python environment를 격리하고, common import가 자연스럽게 성공하며, exact materialization·non-mutation verification을 유지하는 가장 작은 구조는 무엇인가?

## Expected evidence

- base interpreter site-packages, verified virtual environment, separate tool interpreter 대안 prototype
- `sys.executable`, `sys.path`, `site.ENABLE_USER_SITE`, pip behavior와 representative import trace
- pure-Python·native wheel closure, dependency conflict와 architecture pin 처리
- Turn 중 install, workspace-local venv와 runtime immutable tree의 disposition
- clean materialization 두 회와 actual child import smoke
- Bridge와 AY package가 서로 shadow하지 않는 negative control
