import { z } from "zod";

/** SPEC-SCHEMA-001 5.1 — Chat */
export const ChatSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(100),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type Chat = z.infer<typeof ChatSchema>;
