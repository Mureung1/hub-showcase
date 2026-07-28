const profileImages = {
  1: 'https://i.pravatar.cc/160?img=47',
  2: 'https://i.pravatar.cc/160?img=12',
  3: 'https://i.pravatar.cc/160?img=32',
};

export const defaultProfileImageUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='32' fill='%23E8F0EB'/%3E%3Ccircle cx='32' cy='25' r='11' fill='%2386A092'/%3E%3Cpath d='M13 57c2-12 10-18 19-18s17 6 19 18' fill='%2386A092'/%3E%3C/svg%3E";

export function getProfileImageUrl(userId) {
  return profileImages[userId] || `https://i.pravatar.cc/160?img=${(Number(userId) % 60) + 1}`;
}
