export interface BusinessHoursDay {
  dayOfWeek: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
  breakStartTime: string | null;
  breakEndTime: string | null;
  lastOrderTime: string | null;
}

export interface RegularHoliday {
  dayOfWeek: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
}

export interface TemporaryHoliday {
  id: string;
  date: string;
  reason: string;
}

export interface Store {
  id: string;
  name: string;
  businessHours: BusinessHoursDay[];
  regularHolidays: RegularHoliday[];
  temporaryHolidays: TemporaryHoliday[];
}
