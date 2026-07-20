import { profileSchema } from "./analyzeSchemas.js";

export const profileRequestSchema = profileSchema.omit({
  id: true,
  updatedAt: true,
});
