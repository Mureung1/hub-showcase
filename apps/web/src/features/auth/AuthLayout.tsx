import type { ReactNode } from "react";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/Layout";
import "./auth.css";

interface AuthLayoutProps {
  title: string;
  /** 제목 아래 보조 설명 (선택). */
  description?: string;
  children: ReactNode;
  /** 카드 하단 전환 링크 등 (선택). */
  footer?: ReactNode;
}

/** 인증 화면 공통 레이아웃: 화면 중앙 카드형 (SPEC-AUTH-001 2장). */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <Center axis="both" minHeight="100vh" className="auth-screen">
      <Card variant="default" width="100%" maxWidth={400} className="auth-card">
        <VStack gap={4}>
          <VStack gap={1}>
            <span className="brand-dot" aria-hidden />
            <Heading level={1}>{title}</Heading>
            {description && (
              <Text type="supporting" color="secondary">
                {description}
              </Text>
            )}
          </VStack>
          {children}
          {footer && <div className="auth-footer">{footer}</div>}
        </VStack>
      </Card>
    </Center>
  );
}
