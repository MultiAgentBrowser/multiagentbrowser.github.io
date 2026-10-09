import { z } from 'zod';

export class IPCValidator {
  /**
   * Safely parses and validates an input payload against a Zod schema.
   * Throws a descriptive validation error if validation fails.
   */
  public static validate<T>(schema: z.ZodSchema<T>, payload: unknown, contextName = 'IPC Payload'): T {
    const result = schema.safeParse(payload);
    if (!result.success) {
      const errorDetails = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(`[Security Error] Invalid ${contextName}: ${errorDetails}`);
    }
    return result.data;
  }
}

