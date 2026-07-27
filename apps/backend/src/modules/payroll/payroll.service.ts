import { findPayrollSchedules, findPayrollWorkerWages } from "./payroll.repository";
import { PayrollScheduleRecord, PayrollSummaryInput, PayrollSummaryResponse } from "./payroll.types";

type PayCalculationStrategy = {
  calculate(schedule: PayrollScheduleRecord, hourlyWage: number | null): {
    amount: number;
    hours: number;
    missingWage: boolean;
  };
};

const basicHourlyPayStrategy: PayCalculationStrategy = {
  calculate(schedule, hourlyWage) {
    const hours = getScheduleDurationHours(schedule);

    if (hourlyWage === null) {
      return {
        amount: 0,
        hours,
        missingWage: true
      };
    }

    return {
      amount: Math.round(hours * hourlyWage),
      hours,
      missingWage: false
    };
  }
};

function parseTimeToMinutes(time: string) {
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return 0;
  }

  return hour * 60 + minute;
}

function getScheduleDurationHours(schedule: Pick<PayrollScheduleRecord, "start_time" | "end_time">) {
  const durationMinutes = parseTimeToMinutes(schedule.end_time) - parseTimeToMinutes(schedule.start_time);

  return Math.max(0, durationMinutes / 60);
}

function normalizeHourlyWage(hourlyWage: number | string | null | undefined) {
  if (hourlyWage === null || hourlyWage === undefined) {
    return null;
  }

  const wage = Number(hourlyWage);

  return Number.isNaN(wage) ? null : wage;
}

export async function getPayrollSummary(input: PayrollSummaryInput): Promise<PayrollSummaryResponse> {
  const isWorkerScope = input.membership.role === "WORKER";
  const schedules = await findPayrollSchedules(
    input.storeId,
    input.fromDate,
    input.toDate,
    isWorkerScope ? input.membership.userId : undefined
  );
  const workerIds = [...new Set(schedules.map((schedule) => schedule.worker_id))];
  const wages = await findPayrollWorkerWages(input.storeId, workerIds);
  const wageMap = new Map(wages.map((wage) => [wage.user_id, wage.hourly_wage]));

  const summary = schedules.reduce(
    (result, schedule) => {
      const calculation = basicHourlyPayStrategy.calculate(schedule, normalizeHourlyWage(wageMap.get(schedule.worker_id)));

      return {
        estimatedPay: result.estimatedPay + calculation.amount,
        missingWageCount: result.missingWageCount + (calculation.missingWage ? 1 : 0),
        totalHours: result.totalHours + calculation.hours
      };
    },
    {
      estimatedPay: 0,
      missingWageCount: 0,
      totalHours: 0
    }
  );

  return {
    storeId: input.storeId,
    fromDate: input.fromDate,
    toDate: input.toDate,
    scope: isWorkerScope ? "WORKER" : "STORE",
    scheduleCount: schedules.length,
    totalHours: Number(summary.totalHours.toFixed(1)),
    estimatedPay: summary.estimatedPay,
    missingWageCount: summary.missingWageCount
  };
}
