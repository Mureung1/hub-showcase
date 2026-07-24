import { Router } from 'express';
import { z } from 'zod';
import { IntentSchema, ItemTypeSchema } from '@shared/schemas';
import { parseText, resolveCandidate } from '../services/parseService';

const router = Router();

const ParseRequestSchema = z.object({ message: z.string().min(1) });

router.post('/', async (req, res) => {
  const parsedBody = ParseRequestSchema.safeParse(req.body);
  if (!parsedBody.success) {
    res
      .status(400)
      .json({ error: { code: 'VALIDATION_ERROR', message: parsedBody.error.message } });
    return;
  }
  try {
    const result = await parseText(parsedBody.data.message);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

const ResolveRequestSchema = z.object({
  intent: IntentSchema,
  type: ItemTypeSchema,
  fields: z.record(z.string(), z.union([z.string(), z.boolean()])),
  rawInput: z.string().min(1),
});

router.post('/resolve', async (req, res) => {
  const parsedBody = ResolveRequestSchema.safeParse(req.body);
  if (!parsedBody.success) {
    res
      .status(400)
      .json({ error: { code: 'VALIDATION_ERROR', message: parsedBody.error.message } });
    return;
  }
  try {
    const { intent, type, fields, rawInput } = parsedBody.data;
    const result = await resolveCandidate(intent, type, fields, rawInput);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

export default router;
