import type { GymPlace } from '../data/userMock';

export function isNaverSourcedGym(gym: GymPlace): boolean {
  return gym.source === 'naver';
}

export function hasGymRating(gym: GymPlace): boolean {
  return gym.rating > 0;
}

export function hasGymDetailProfile(gym: GymPlace): boolean {
  return Boolean(
    gym.hours.trim() ||
      gym.price.trim() ||
      gym.equipment.length > 0 ||
      gym.amenities.length > 0 ||
      gym.photos.length > 0,
  );
}

export function hasNaverExternalLink(gym: GymPlace): boolean {
  return Boolean(gym.externalLink?.trim());
}
