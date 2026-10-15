import { z } from "zod";

export const createSubmissionSchema = z.object({
  submissionDate: z.string().min(1, "Submission date is required"),

  remarks: z.string().max(2000, "Remarks are too long").optional(),
});

export const returnSubmissionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Return reason is required")
    .max(2000, "Return reason is too long"),
});

export type CreateSubmissionFormValues = z.infer<typeof createSubmissionSchema>;

export type ReturnSubmissionFormValues = z.infer<typeof returnSubmissionSchema>;
