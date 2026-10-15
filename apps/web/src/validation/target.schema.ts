import { z } from "zod";

export const targetSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Target name is required")
      .max(191, "Target name must not exceed 191 characters"),

    description: z
      .string()
      .trim()
      .optional(),

    metricType: z.enum([
      "CUSTOMER_VISIT",
      "PHONE_CALL",
      "CUSTOMER_CONTACT",
      "CUSTOMER_ENGAGEMENT",
      "ACTIVATION",
      "REACTIVATION",
      "TRANSACTION",
      "FOLLOW_UP",
      "CONVERSION_RATE",
      "ACHIEVEMENT_RATE",
    ]),

    periodType: z.enum([
      "DAILY",
      "WEEKLY",
      "MONTHLY",
      "QUARTERLY",
      "YEARLY",
      "CUSTOM",
    ]),

    startDate: z
      .string()
      .min(1, "Start date is required"),

    endDate: z
      .string()
      .min(1, "End date is required"),

    defaultTargetValue: z
      .number()
      .min(
        0,
        "Default target value cannot be negative",
      ),
  })
  .refine(
    (data) =>
      !data.startDate ||
      !data.endDate ||
      data.endDate >= data.startDate,
    {
      message:
        "End date must be on or after the start date",
      path: ["endDate"],
    },
  );

export type TargetFormValues =
  z.infer<typeof targetSchema>;

export const targetAssignmentSchema =
  z.object({
    scopeType: z.enum([
      "GLOBAL",
      "REGION",
      "DISTRICT",
      "BRANCH",
      "STAFF",
    ]),

    regionId: z
      .string()
      .optional(),

    districtId: z
      .string()
      .optional(),

    branchId: z
      .string()
      .optional(),

    userId: z
      .string()
      .optional(),

    productId: z
      .string()
      .optional(),

    targetValue: z
      .number()
      .min(
        0,
        "Target value cannot be negative",
      ),
  })
  .superRefine(
    (data, context) => {
      if (
        data.scopeType === "REGION" &&
        !data.regionId
      ) {
        context.addIssue({
          code: "custom",
          path: ["regionId"],
          message: "Region is required",
        });
      }

      if (
        data.scopeType === "DISTRICT" &&
        !data.districtId
      ) {
        context.addIssue({
          code: "custom",
          path: ["districtId"],
          message: "District is required",
        });
      }

      if (
        data.scopeType === "BRANCH" &&
        !data.branchId
      ) {
        context.addIssue({
          code: "custom",
          path: ["branchId"],
          message: "Branch is required",
        });
      }

      if (
        data.scopeType === "STAFF" &&
        !data.userId
      ) {
        context.addIssue({
          code: "custom",
          path: ["userId"],
          message: "Staff member is required",
        });
      }
    },
  );

export type TargetAssignmentFormValues =
  z.infer<typeof targetAssignmentSchema>;