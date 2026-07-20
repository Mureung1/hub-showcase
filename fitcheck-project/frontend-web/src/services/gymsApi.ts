import {
  MOCK_GYMS,
  type GymPlace,
  type GymTrainer,
} from '../data/userMock';
import { distanceKm } from '../utils/geo';
import { apiGet, apiPost } from './api';

interface ApiTrainer {
  id: string;
  gymId: string;
  profileId: string | null;
  name: string;
  specialty: string | null;
  bio: string | null;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ApiGym {
  id: string;
  name: string;
  type: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  hours: string | null;
  price: string | null;
  equipment: string[];
  amenities: string[];
  photos: string[];
  rating: number | null;
  isActive: boolean;
  createdAt: string;
  distanceKm?: number;
  category?: string | null;
  source?: string;
  externalLink?: string | null;
  trainers?: ApiTrainer[];
}

interface ListGymsResponse {
  success: boolean;
  data: ApiGym[];
  meta: { total: number; page: number; limit: number };
}

interface SyncNearbyResponse {
  success: boolean;
  data: {
    synced: number;
    queries: string[];
    gyms: ApiGym[];
    meta: ListGymsResponse['meta'];
  };
}

interface GymResponse {
  success: boolean;
  data: ApiGym;
}

interface ListTrainersResponse {
  success: boolean;
  data: ApiTrainer[];
}

export interface ListGymsParams {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  type?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export interface FetchGymsOptions extends ListGymsParams {
  userLat?: number;
  userLng?: number;
}

export interface SyncNearbyParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  areaLabel?: string;
}

const GYM_TYPES: GymPlace['type'][] = [
  '골목 헬스장',
  '1인 PT숍',
  '개인 트레이너',
  '기타',
];

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function toGymType(value: string): GymPlace['type'] {
  if (GYM_TYPES.includes(value as GymPlace['type'])) {
    return value as GymPlace['type'];
  }
  return '기타';
}

function deriveTags(
  amenities: string[],
  equipment: string[],
  category?: string | null,
): string[] {
  const fromCategory = category
    ? category
        .split('>')
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(-2)
    : [];
  const combined = [...fromCategory, ...amenities, ...equipment];
  if (combined.length === 0) return [];
  return [...new Set(combined)].slice(0, 2);
}

function mapApiTrainer(api: ApiTrainer): GymTrainer {
  const supplement = MOCK_GYMS.flatMap((gym) => gym.trainers).find(
    (trainer) => trainer.name === api.name,
  );

  return {
    id: api.id,
    name: api.name,
    specialty: api.specialty ?? supplement?.specialty ?? '',
    bio: api.bio ?? supplement?.bio ?? '',
    photoUrl: api.photoUrl ?? supplement?.photoUrl ?? '',
  };
}

export function mapApiGymToGymPlace(
  api: ApiGym,
  userLat?: number,
  userLng?: number,
): GymPlace {
  const isNaver = api.source === 'naver';
  const supplement = isNaver ? undefined : MOCK_GYMS.find((mock) => mock.name === api.name);
  const lat = api.lat ?? supplement?.lat ?? 0;
  const lng = api.lng ?? supplement?.lng ?? 0;
  const amenities = api.amenities.length > 0 ? api.amenities : (supplement?.amenities ?? []);
  const equipment = api.equipment.length > 0 ? api.equipment : (supplement?.equipment ?? []);
  const computedDistance =
    userLat !== undefined && userLng !== undefined && api.lat != null && api.lng != null
      ? distanceKm(userLat, userLng, api.lat, api.lng)
      : (api.distanceKm ?? supplement?.distanceKm ?? 0);

  const source =
    api.source === 'seed' || api.source === 'naver' || api.source === 'manual'
      ? api.source
      : undefined;

  return {
    id: api.id,
    name: decodeHtmlEntities(api.name),
    type: toGymType(api.type),
    distanceKm: computedDistance,
    rating: api.rating ?? supplement?.rating ?? 0,
    tags: deriveTags(amenities, equipment, api.category),
    address: api.address ?? supplement?.address ?? '',
    lat,
    lng,
    photos: api.photos.length > 0 ? api.photos : (supplement?.photos ?? []),
    hours: api.hours ?? supplement?.hours ?? '',
    price: api.price ?? supplement?.price ?? '',
    equipment,
    amenities,
    trainers: (api.trainers ?? []).map(mapApiTrainer),
    source,
    externalLink: api.externalLink ?? undefined,
    category: api.category ?? undefined,
  };
}

function buildQuery(params: ListGymsParams): string {
  const search = new URLSearchParams();
  if (params.lat !== undefined) search.set('lat', String(params.lat));
  if (params.lng !== undefined) search.set('lng', String(params.lng));
  if (params.radiusKm !== undefined) search.set('radiusKm', String(params.radiusKm));
  if (params.type) search.set('type', params.type);
  if (params.q) search.set('q', params.q);
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchGyms(
  options: FetchGymsOptions = {},
): Promise<{ gyms: GymPlace[]; meta: ListGymsResponse['meta'] }> {
  const { userLat, userLng, lat, lng, ...params } = options;
  const queryLat = lat ?? userLat;
  const queryLng = lng ?? userLng;

  const res = await apiGet<ListGymsResponse>(
    `/api/v1/gyms${buildQuery({
      limit: 50,
      ...params,
      lat: queryLat,
      lng: queryLng,
      radiusKm: params.radiusKm ?? (queryLat !== undefined ? 3 : undefined),
    })}`,
  );

  const gyms = res.data
    .map((gym) => mapApiGymToGymPlace(gym, queryLat, queryLng))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return { gyms, meta: res.meta };
}

export async function fetchGymById(
  id: string,
  userLat?: number,
  userLng?: number,
): Promise<GymPlace> {
  const res = await apiGet<GymResponse>(`/api/v1/gyms/${id}`);
  return mapApiGymToGymPlace(res.data, userLat, userLng);
}

export async function fetchGymTrainers(gymId: string): Promise<GymTrainer[]> {
  const res = await apiGet<ListTrainersResponse>(`/api/v1/gyms/${gymId}/trainers`);
  return res.data.map(mapApiTrainer);
}

export async function syncNearbyGyms(
  params: SyncNearbyParams,
): Promise<{
  gyms: GymPlace[];
  synced: number;
  queries: string[];
  meta: ListGymsResponse['meta'];
}> {
  const res = await apiPost<SyncNearbyResponse>('/api/v1/gyms/sync-nearby', {
    lat: params.lat,
    lng: params.lng,
    radiusKm: params.radiusKm ?? 3,
    areaLabel: params.areaLabel,
  });

  const gyms = res.data.gyms
    .map((gym) => mapApiGymToGymPlace(gym, params.lat, params.lng))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    gyms,
    synced: res.data.synced,
    queries: res.data.queries,
    meta: res.data.meta,
  };
}
