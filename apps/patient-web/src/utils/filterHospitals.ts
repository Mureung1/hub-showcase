export interface SearchableHospital {
  id: string;
  name: string;
  department: string;
  district: string;
}

export interface HospitalRegionFilter {
  province: string;
  cityDistrict: string;
}

export function getHospitalRegion(district: string): HospitalRegionFilter {
  const [province = "", ...cityDistrictParts] = district.trim().split(/\s+/);

  return {
    province,
    cityDistrict: cityDistrictParts.join(" "),
  };
}

export function getValidHospitalRegionFilter<T extends SearchableHospital>(
  hospitals: T[],
  selectedRegion: HospitalRegionFilter,
): HospitalRegionFilter {
  const regions = hospitals.map(({ district }) => getHospitalRegion(district));
  const provinceExists = regions.some(
    ({ province }) => province === selectedRegion.province,
  );

  if (!selectedRegion.province || !provinceExists) {
    return { province: "", cityDistrict: "" };
  }

  const cityDistrictExists = regions.some(
    ({ province, cityDistrict }) =>
      province === selectedRegion.province &&
      cityDistrict === selectedRegion.cityDistrict,
  );

  return {
    province: selectedRegion.province,
    cityDistrict:
      selectedRegion.cityDistrict && cityDistrictExists
        ? selectedRegion.cityDistrict
        : "",
  };
}

export function filterHospitalsByQuery<T extends SearchableHospital>(
  hospitals: T[],
  query: string,
  region: HospitalRegionFilter = { province: "", cityDistrict: "" },
  department = "",
): T[] {
  const keywords = query
    .trim()
    .toLocaleLowerCase("ko-KR")
    .split(/\s+/)
    .filter(Boolean);

  return hospitals.filter((hospital) => {
    const hospitalRegion = getHospitalRegion(hospital.district);
    if (region.province && hospitalRegion.province !== region.province) return false;
    if (region.cityDistrict && hospitalRegion.cityDistrict !== region.cityDistrict) return false;
    if (department && hospital.department !== department) return false;

    if (keywords.length === 0) return true;

    const searchableText = [hospital.name, hospital.department, hospital.district]
      .join(" ")
      .toLocaleLowerCase("ko-KR");

    return keywords.every((keyword) => searchableText.includes(keyword));
  });
}
