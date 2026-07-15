export type SignalStatus = 'red' | 'yellow' | 'green';

export type MealType = '아침' | '점심' | '저녁' | '간식';

export type CommunicationType = 'alert' | 'message' | 'guide' | 'feedback';

export type MacroType = '+2.5kg' | '+1세트' | '+2 reps';

export interface Member {
  id: string;
  name: string;
  avatar: string;
  lastContactDate: string;
  goal: string;
  /** Daily calorie target used by nutrition charts */
  calorieGoal: number;
}

export interface Exercise {
  id: string;
  name: string;
  weight: number;
  sets: number;
  reps: number;
}

export interface MealEntry {
  id: string;
  memberId: string;
  date: string;
  mealType: MealType;
  time: string;
  memo: string;
  pending: boolean;
  feedback?: string;
  feedbackAt?: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
}

export interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
  createdAt: string;
}

export interface CommunicationLog {
  id: string;
  memberId: string;
  type: CommunicationType;
  message: string;
  createdAt: string;
}

export interface SentGuide {
  id: string;
  memberId: string;
  exercises: Exercise[];
  sentAt: string;
  text: string;
}

export interface WorkoutRecord {
  id: string;
  memberId: string;
  date: string;
  exercises: Exercise[];
}

export interface AppData {
  members: Member[];
  routines: Record<string, Exercise[]>;
  meals: MealEntry[];
  notifications: Notification[];
  communicationLogs: CommunicationLog[];
  sentGuides: SentGuide[];
  workoutHistory: WorkoutRecord[];
}

export interface MemberWithStatus extends Member {
  daysSinceContact: number;
  status: SignalStatus;
}
