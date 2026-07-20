import {
  MOCK_COURSES,
  type BodyPart,
  type Course,
  type Goal,
} from '../data/userMock';
import { apiGet } from './api';

interface ApiCourse {
  id: string;
  title: string;
  bodyPart: string | null;
  goal: string | null;
  durationMin: number | null;
  level: string | null;
  trainerName: string | null;
  videoUrl: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ListCoursesResponse {
  success: boolean;
  data: ApiCourse[];
  meta: { total: number; page: number; limit: number };
}

interface CourseResponse {
  success: boolean;
  data: ApiCourse;
}

export interface ListCoursesParams {
  bodyPart?: string;
  goal?: string;
  q?: string;
  page?: number;
  limit?: number;
}

const THUMBNAIL_BY_BODY_PART: Record<BodyPart, Course['thumbnailTone']> = {
  가슴: 'red',
  등: 'purple',
  하체: 'yellow',
  어깨: 'yellow',
  코어: 'green',
};

function toBodyPart(value: string | null): BodyPart {
  const allowed: BodyPart[] = ['가슴', '등', '하체', '어깨', '코어'];
  if (value && allowed.includes(value as BodyPart)) {
    return value as BodyPart;
  }
  return '가슴';
}

function toGoal(value: string | null): Goal {
  const allowed: Goal[] = ['다이어트', '벌크업', '근력', '입문'];
  if (value && allowed.includes(value as Goal)) {
    return value as Goal;
  }
  return '입문';
}

function toLevel(value: string | null): Course['level'] {
  if (value === '초급' || value === '중급' || value === '고급') {
    return value;
  }
  return '초급';
}

/** API 응답 + userMock 보조 데이터(제목 매칭) → FE Course */
export function mapApiCourseToCourse(api: ApiCourse): Course {
  const supplement = MOCK_COURSES.find((mock) => mock.title === api.title);
  const bodyPart = toBodyPart(api.bodyPart);

  return {
    id: api.id,
    title: api.title,
    bodyPart,
    goal: toGoal(api.goal),
    durationMin: api.durationMin ?? supplement?.durationMin ?? 0,
    level: toLevel(api.level),
    trainer: api.trainerName ?? supplement?.trainer ?? '',
    description: api.description ?? supplement?.description ?? '',
    videoUrl: api.videoUrl ?? supplement?.videoUrl ?? '',
    thumbnailTone: THUMBNAIL_BY_BODY_PART[bodyPart],
    cues: supplement?.cues ?? [],
    warnings: supplement?.warnings ?? [],
    setsGuide: supplement?.setsGuide ?? [],
  };
}

function buildQuery(params: ListCoursesParams): string {
  const search = new URLSearchParams();
  if (params.bodyPart) search.set('bodyPart', params.bodyPart);
  if (params.goal) search.set('goal', params.goal);
  if (params.q) search.set('q', params.q);
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchCourses(
  params: ListCoursesParams = {},
): Promise<{ courses: Course[]; meta: ListCoursesResponse['meta'] }> {
  const res = await apiGet<ListCoursesResponse>(
    `/api/v1/courses${buildQuery({ limit: 50, ...params })}`,
  );
  return {
    courses: res.data.map(mapApiCourseToCourse),
    meta: res.meta,
  };
}

export async function fetchCourseById(id: string): Promise<Course> {
  const res = await apiGet<CourseResponse>(`/api/v1/courses/${id}`);
  return mapApiCourseToCourse(res.data);
}

export function getRelatedCourses(course: Course, allCourses: Course[], limit = 3): Course[] {
  return allCourses
    .filter(
      (item) =>
        item.id !== course.id &&
        (item.bodyPart === course.bodyPart || item.goal === course.goal),
    )
    .slice(0, limit);
}
