import type { Metadata } from 'next';
import { LandingExperience } from './landing-experience';

export const metadata: Metadata = {
  title: '오늘을 증명하고, 끝까지 이어가세요',
  description: '매일의 목표, 몰입, 인증이 하나의 생존 루프가 되는 학습 챌린지.',
};

export default function Home() {
  return <LandingExperience />;
}
