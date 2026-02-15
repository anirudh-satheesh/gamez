import { z } from 'zod';

/**
 * Schema for listing commentary entries via query parameters
 */
export const listCommentaryQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(100).optional(),
});

/**
 * Schema for creating a new commentary entry
 */
export const createCommentarySchema = z.object({
    minute: z.coerce.number().int().nonnegative(),
    sequence: z.coerce.number().int().nonnegative(),
    period: z.string(),
    eventType: z.string(),
    actor: z.string(),
    team: z.string(),
    message: z.string().min(1, "Message is required"),
    metadata: z.record(z.string(), z.any()).optional(),
    tags: z.array(z.string()).optional(),
});
