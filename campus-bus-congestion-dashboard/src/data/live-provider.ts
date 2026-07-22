import campusManifest from './live-campuses.json';
import generatedUsage from './generated-stop-usage.json';
import publicStopMappings from './public-stop-mappings.json';
import type { Campus, CampusDirections, DirectionKey, DirectionUsage, Stop } from '../types';
import type { BusDataProvider } from './provider';
import { formatUsagePeriod } from '../lib/usage';

interface PublicStopMapping {
  campusId: string;
  ctpvCd: string;
  sggCd: string;
  sttnId: string;
  sourceName: string;
  directions?: Partial<Record<DirectionKey, {
    sttnId: string;
    sourceName: string;
  }>>;
}

interface GeneratedStopUsage {
  status: 'ready' | 'no-data';
  period: string;
  fetchedAt: string;
  boardings: number[];
  alightings: number[];
  totals: number[];
  hours?: number[];
  campusReferenceP95?: number;
  aggregation?: 'single-stop' | 'sum-exact-name-platforms';
  sourceCount?: number;
}

interface DirectionalGeneratedStopUsage {
  directions: Partial<Record<DirectionKey, DirectionUsage>>;
}

interface MappingManifest {
  schemaVersion?: number;
  campuses?: Record<string, CampusDirections>;
  mappings: Record<string, PublicStopMapping>;
}
interface UsageManifest {
  schemaVersion?: number;
  period: string;
  fetchedAt: string | null;
  stops: Record<string, GeneratedStopUsage | DirectionalGeneratedStopUsage>;
}

const supportedCampusIds = new Set((campusManifest as Campus[]).map((campus) => campus.id));
const mappingManifest = publicStopMappings as MappingManifest;
const usageManifest = generatedUsage as UsageManifest;
const zeroHours = () => new Array<number>(24).fill(0);

const campuses = (campusManifest as Campus[]).map((campus) => ({
  ...campus,
  directionConfig: usageManifest.schemaVersion === 2 ? mappingManifest.campuses?.[campus.id] : undefined,
  stops: campus.stops.map((stop) => {
    const mapping = mappingManifest.mappings[stop.id];
    const generated = usageManifest.stops[stop.id] as GeneratedStopUsage | undefined;
    const directionalGenerated = usageManifest.schemaVersion === 2
      ? usageManifest.stops[stop.id] as DirectionalGeneratedStopUsage | undefined
      : undefined;
    const directionConfig = usageManifest.schemaVersion === 2 ? mappingManifest.campuses?.[campus.id] : undefined;
    const status: NonNullable<Stop['usage']>['status'] = generated?.status
      ?? (supportedCampusIds.has(campus.id) ? (mapping ? 'no-data' : 'unmapped') : 'unsupported-region');
    const readyHours = generated?.status === 'ready' && generated.hours?.length === 24 ? generated.hours : undefined;

    const directions = directionConfig ? Object.fromEntries((['a', 'c'] as DirectionKey[]).map((direction) => {
      const publicStop = mapping?.directions?.[direction];
      const directionUsage = directionalGenerated?.directions?.[direction];
      const directionStatus: DirectionUsage['status'] = directionUsage?.status ?? (publicStop ? 'no-data' : 'unmapped');
      return [direction, {
        publicData: publicStop ? {
          ctpvCd: mapping.ctpvCd,
          sggCd: mapping.sggCd,
          sttnId: publicStop.sttnId,
          sourceName: publicStop.sourceName,
        } : undefined,
        usage: {
          status: directionStatus,
          period: directionUsage?.period ?? usageManifest.period,
          fetchedAt: directionUsage?.fetchedAt ?? usageManifest.fetchedAt ?? '',
          boardings: directionUsage?.boardings ?? zeroHours(),
          alightings: directionUsage?.alightings ?? zeroHours(),
          totals: directionUsage?.totals ?? zeroHours(),
          hours: directionUsage?.hours,
          campusReferenceP95: directionUsage?.campusReferenceP95,
        },
      }];
    })) : undefined;

    return {
      ...stop,
      publicData: mapping ? {
        ctpvCd: mapping.ctpvCd,
        sggCd: mapping.sggCd,
        sttnId: mapping.sttnId,
        sourceName: mapping.sourceName,
      } : undefined,
      usage: {
        status,
        period: generated?.period ?? usageManifest.period,
        fetchedAt: generated?.fetchedAt ?? usageManifest.fetchedAt ?? '',
        boardings: generated?.boardings ?? zeroHours(),
        alightings: generated?.alightings ?? zeroHours(),
        totals: generated?.totals ?? zeroHours(),
        campusReferenceP95: generated?.campusReferenceP95,
        aggregation: generated?.aggregation,
        sourceCount: generated?.sourceCount,
      },
      hours: readyHours,
      directions,
    };
  }),
}));

export const liveProvider: BusDataProvider = {
  id: 'national-live',
  label: '공공데이터 기반',
  status: 'partial',
  campuses,
  notice: `${formatUsagePeriod(usageManifest.period)} AI 합성 교통카드 통계로 계산한 상대적 정류장 이용 집중도입니다. 차량 내부 혼잡도를 나타내지 않습니다.`,
};
