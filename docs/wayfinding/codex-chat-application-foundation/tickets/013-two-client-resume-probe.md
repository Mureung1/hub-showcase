# 013 — Adopted stack의 two-client와 restart continuity를 검증한다

## Wayfinder ticket

- Type: prototype
- State: out-of-scope
- Blocked by: None

## Question

009가 채택한 official·first-party·OSS·platform composition은 두 Browser client가 서로의 conversation selection과 accepted work를 손상시키지 않게 하고, Browser reload와 Server restart 뒤 workspace-scoped catalog → read·resume → follow-up을 native identity remap이나 raw protocol 노출 없이 수행하는가? Donor behavior와 다른 관찰만 confirmed residual로 남긴다.

## Resolution evidence

- Thin client A/B, native identity와 local service restart를 사용한 bounded representative trace
- Adopted owner·isolation behavior에 대한 wrong-client·wrong-workspace와 active work navigation negative control
- Restart 전후 catalog/read/resume/follow-up sequence와 native·donor·current state owner 비교
- Direct reuse·adaptation으로 충족한 동작과 evidence로 확인한 residual
- Production 구현이 아닌 throwaway `/prototype` evidence, falsifying result와 후속 022+ ticket 필요 여부

## Out-of-scope rationale

첫 Assignment vertical은 두 Browser client를 사용자 journey나 runtime 선행조건으로 요구하지 않는다. Product-bound companion에서 실제 multi-client need가 확인될 때 별도 질문으로 다시 admission한다.
