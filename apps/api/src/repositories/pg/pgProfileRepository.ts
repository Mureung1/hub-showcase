import {
  accountStatusSchema,
  accountTypeSchema,
  e164PhoneNumberSchema,
} from "@baro-jinryo/shared";
import { z } from "zod";
import type { DatabaseExecutor } from "../../db/databaseExecutor.js";
import type {
  CreateProfileInput,
  Profile,
  ProfileRepository,
} from "../profileRepository.js";

const profileRowSchema = z.object({
  id: z.uuid(),
  phone_number: e164PhoneNumberSchema,
  account_type: accountTypeSchema,
  status: accountStatusSchema,
  created_at: z.date(),
  updated_at: z.date(),
});

type ProfileRow = z.infer<typeof profileRowSchema>;

const profileColumns = `
  id,
  phone_number,
  account_type,
  status,
  created_at,
  updated_at
`;

function toProfile(row: unknown): Profile {
  const profile = profileRowSchema.parse(row);

  return {
    id: profile.id,
    phoneNumber: profile.phone_number,
    accountType: profile.account_type,
    status: profile.status,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

export class PgProfileRepository implements ProfileRepository {
  async findById(executor: DatabaseExecutor, id: string): Promise<Profile | null> {
    const result = await executor.query<ProfileRow>(
      `SELECT ${profileColumns} FROM public.profiles WHERE id = $1`,
      [id],
    );

    const row = result.rows[0];
    return row ? toProfile(row) : null;
  }

  async findByPhoneNumber(
    executor: DatabaseExecutor,
    phoneNumber: string,
  ): Promise<Profile | null> {
    const result = await executor.query<ProfileRow>(
      `SELECT ${profileColumns} FROM public.profiles WHERE phone_number = $1`,
      [phoneNumber],
    );

    const row = result.rows[0];
    return row ? toProfile(row) : null;
  }

  async create(executor: DatabaseExecutor, input: CreateProfileInput): Promise<Profile> {
    const result = await executor.query<ProfileRow>(
      `
        INSERT INTO public.profiles (id, phone_number, account_type)
        VALUES ($1, $2, $3)
        RETURNING ${profileColumns}
      `,
      [input.id, input.phoneNumber, input.accountType],
    );

    const row = result.rows[0];
    if (!row) throw new Error("프로필 생성 결과를 찾을 수 없습니다.");
    return toProfile(row);
  }
}
