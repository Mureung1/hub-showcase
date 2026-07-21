import { getNaverMapClientId, loadNaverMaps } from './loadNaverMaps';

export async function reverseGeocodeAreaLabel(
  lat: number,
  lng: number,
): Promise<string | undefined> {
  const clientId = getNaverMapClientId();
  if (!clientId) return undefined;

  try {
    const maps = await loadNaverMaps(clientId);
    if (!maps.Service?.reverseGeocode) return undefined;

    return await new Promise<string | undefined>((resolve) => {
      maps.Service.reverseGeocode(
        {
          coords: new maps.LatLng(lat, lng),
          orders: [
            maps.Service.OrderType.ROAD_ADDR,
            maps.Service.OrderType.ADDR,
          ].join(','),
        },
        (status, response) => {
          if (status !== maps.Service.Status.OK) {
            resolve(undefined);
            return;
          }

          const results = response.v2?.results as
            | Array<{ region?: { area2?: { name?: string }; area3?: { name?: string } } }>
            | undefined;
          const first = results?.[0];
          const gu = first?.region?.area2?.name;
          const dong = first?.region?.area3?.name;
          const label = [gu, dong].filter(Boolean).join(' ');
          resolve(label || undefined);
        },
      );
    });
  } catch {
    return undefined;
  }
}
