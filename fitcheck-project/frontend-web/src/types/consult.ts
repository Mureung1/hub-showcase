export const CONSULT_TOPICS = [
  '벌크업',
  '다이어트',
  '자세 교정',
  '입문',
  '기타',
] as const;

export type ConsultTopic = (typeof CONSULT_TOPICS)[number];

export type ConsultStatus = 'pending' | 'read';

export interface ConsultRequest {
  id: string;
  gymId: string;
  gymName: string;
  trainerId: string | null;
  trainerName: string | null;
  name: string;
  phone: string;
  date: string;
  time: string;
  topic: ConsultTopic;
  topicDetail: string;
  memo: string;
  /** Whether the member agreed to share diet/workout history with the trainer */
  shareHistoryConsent: boolean;
  status: ConsultStatus;
  createdAt: string;
  notificationId: string;
  /** Offline consult notes written by the trainer */
  trainerReportMemo?: string;
  /** One-line summary feedback delivered to the member */
  userFeedback?: string;
  /** When true, trainerReportMemo is visible on the member app */
  shareMemoWithMember?: boolean;
  reportSavedAt?: string;
}

export type ConsultRequestInput = Omit<
  ConsultRequest,
  | 'id'
  | 'status'
  | 'createdAt'
  | 'notificationId'
  | 'trainerReportMemo'
  | 'userFeedback'
  | 'shareMemoWithMember'
  | 'reportSavedAt'
>;

export interface ConsultReportInput {
  trainerReportMemo: string;
  userFeedback: string;
  shareMemoWithMember: boolean;
}
