# 008 — AY Node·common CLI work environment의 구조를 검증한다

## Wayfinder ticket

- Type: prototype
- State: open
- Blocked by: [이번 effort의 support envelope와 성공 조건을 결정한다](004-target-support-envelope.md), [App host와 AY work environment의 ownership seam을 정한다](005-environment-ownership-seam.md), [Rich environment의 dependency 선정 정책을 정한다](006-rich-environment-policy.md)

## Question

현재 host `process.execPath`에서 우연히 들어오는 Node/npm/npx와 macOS `/usr/bin`·bundled helper를 어떤 provenance 정책으로 바꾸고, AY가 익숙한 CLI와 Node library를 안정적으로 발견하게 할 것인가?

## Expected evidence

- App host Node와 AY command Node의 같은-binary·separate-binary·host-prerequisite 대안 비교
- SemesterWorkspace `cwd`에서 Node module resolution, package manager와 `NODE_PATH` behavior prototype
- bundled `rg`·zsh, system Git·jq·file·Quick Look와 product-managed native tool의 허용 기준
- `pdftotext` 같은 high-prior CLI를 포함할 때 binary closure·rpath·license·platform 영향
- npm/npx의 network·cache·workspace mutation disposition
- exact command resolution과 missing-tool negative control
