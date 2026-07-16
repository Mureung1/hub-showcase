import type { ReactNode } from "react";
import {
  Layout,
  LayoutContent,
  LayoutPanel,
} from "@astryxdesign/core/Layout";

interface WorkspaceLayoutProps {
  /** Left: Chat List 패널 */
  sidebar: ReactNode;
  /** Center: 컴포저·트랜스크립트 영역 */
  center: ReactNode;
  /** Right: Decision Notes 패널 */
  notes: ReactNode;
}

/** 3단 레이아웃 (docs/DESIGN.md 5장: Left Chat List / Center / Right Decision Notes) */
export function WorkspaceLayout({
  sidebar,
  center,
  notes,
}: WorkspaceLayoutProps) {
  return (
    <Layout
      height="fill"
      start={
        <LayoutPanel hasDivider width={260} padding={0} role="navigation">
          {sidebar}
        </LayoutPanel>
      }
      content={
        <LayoutContent role="main" padding={0} isScrollable={false}>
          {center}
        </LayoutContent>
      }
      end={
        <LayoutPanel
          hasDivider
          width={320}
          padding={0}
          isScrollable={false}
          role="complementary"
          label="Decision Notes"
        >
          {notes}
        </LayoutPanel>
      }
    />
  );
}
