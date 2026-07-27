import type { AnalyzedClass } from "./analyzer";

export interface RefactorTarget {
  className: string;
  filePath: string;
  reason: string;
}

const GOD_CLASS_METHOD_THRESHOLD = 30;

// Deterministic, rule-based flagging only — no AI judgment call on whether code
// "looks problematic". The flagged list is what gets handed to Gemini afterward,
// which only explains *why* each entry was already flagged.
export function findRefactorTargets(classes: AnalyzedClass[]): RefactorTarget[] {
  const targets: RefactorTarget[] = [];

  for (const cls of classes) {
    if (cls.methodCount > GOD_CLASS_METHOD_THRESHOLD) {
      targets.push({
        className: cls.name,
        filePath: cls.filePath,
        reason: `God Class 의심 — 메서드 ${cls.methodCount}개 (기준: ${GOD_CLASS_METHOD_THRESHOLD}개 초과)`,
      });
    }
  }

  // Simple A<->B circular dependency check. "Depends on" is narrowed to
  // baseTypes/referencedTypes entries that match another known class's name —
  // referencedTypes is a noisy syntactic approximation (it also picks up
  // variable/method names), so this filter keeps only plausibly-real edges.
  const classNames = new Set(classes.map((c) => c.name));
  const dependsOn = new Map<string, Set<string>>();
  for (const cls of classes) {
    const deps = [...cls.baseTypes, ...cls.referencedTypes].filter(
      (name) => name !== cls.name && classNames.has(name)
    );
    dependsOn.set(cls.name, new Set(deps));
  }

  const reportedPairs = new Set<string>();
  for (const [className, deps] of dependsOn) {
    for (const dep of deps) {
      if (dependsOn.get(dep)?.has(className)) {
        const pairKey = [className, dep].sort().join("<->");
        if (reportedPairs.has(pairKey)) continue;
        reportedPairs.add(pairKey);

        targets.push({
          className,
          filePath: classes.find((c) => c.name === className)?.filePath ?? "",
          reason: `순환 의존성 의심 — ${className} <-> ${dep}`,
        });
      }
    }
  }

  return targets;
}
