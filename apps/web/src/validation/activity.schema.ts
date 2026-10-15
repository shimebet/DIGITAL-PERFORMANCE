import { z } from "zod";

// ============================================================================
// COMMON COUNT VALIDATION
// ============================================================================

const countSchema = z
  .number({
    error: "A number is required",
  })
  .int("Must be a whole number")
  .min(0, "Cannot be negative");

// ============================================================================
// PRODUCT ACTIVITY
// ============================================================================

export const activityProductSchema = z.object({
  productId: z.string().min(1, "Product is required"),

  customersEngaged: countSchema,

  activations: countSchema,

  reactivations: countSchema,

  transactions: countSchema,

  failedActivations: countSchema,

  remarks: z
    .string()
    .max(1000, "Product remarks cannot exceed 1000 characters")
    .optional(),
});

// ============================================================================
// ACTIVITY
// ============================================================================

export const activitySchema = z
  .object({
    activityDate: z.string().min(1, "Activity date is required"),

    customerVisits: countSchema,

    phoneCalls: countSchema,

    customersContacted: countSchema,

    customersEducated: countSchema,

    // Calculated automatically from product rows.
    activations: countSchema,

    reactivations: countSchema,

    transactions: countSchema,

    remarks: z
      .string()
      .max(2000, "Remarks cannot exceed 2000 characters")
      .optional(),

    challenges: z
      .string()
      .max(2000, "Challenges cannot exceed 2000 characters")
      .optional(),

    products: z
      .array(activityProductSchema)
      .min(1, "At least one product is required"),
  })

  // ==========================================================================
  // CROSS-FIELD BUSINESS VALIDATION
  // ==========================================================================

  .superRefine((data, ctx) => {
    // ----------------------------------------------------------------------
    // GENERAL ACTIVITY VALIDATION
    // ----------------------------------------------------------------------

    if (data.customersEducated > data.customersContacted) {
      ctx.addIssue({
        code: "custom",

        path: ["customersEducated"],

        message: "Educated customers cannot exceed contacted customers",
      });
    }

    if (data.activations > data.customersEducated) {
      ctx.addIssue({
        code: "custom",

        path: ["activations"],

        message: "Activations cannot exceed educated customers",
      });
    }

    if (data.transactions > data.activations) {
      ctx.addIssue({
        code: "custom",

        path: ["transactions"],

        message: "Transactions cannot exceed activations",
      });
    }

    // ----------------------------------------------------------------------
    // DUPLICATE PRODUCT VALIDATION
    // ----------------------------------------------------------------------

    const productIds = data.products
      .map((product) => product.productId)
      .filter((productId) => productId.length > 0);

    if (new Set(productIds).size !== productIds.length) {
      ctx.addIssue({
        code: "custom",

        path: ["products"],

        message: "The same product cannot be entered more than once",
      });
    }

    // ----------------------------------------------------------------------
    // PRODUCT LEVEL BUSINESS VALIDATION
    // ----------------------------------------------------------------------

    for (let index = 0; index < data.products.length; index += 1) {
      const product = data.products[index];

      if (product.customersEngaged > data.customersEducated) {
        ctx.addIssue({
          code: "custom",

          path: ["products", index, "customersEngaged"],

          message:
            "Product engaged customers cannot exceed total educated customers",
        });
      }

      if (product.activations > product.customersEngaged) {
        ctx.addIssue({
          code: "custom",

          path: ["products", index, "activations"],

          message: "Product activations cannot exceed engaged customers",
        });
      }

      if (product.transactions > product.activations) {
        ctx.addIssue({
          code: "custom",

          path: ["products", index, "transactions"],

          message: "Product transactions cannot exceed product activations",
        });
      }
    }

    // ----------------------------------------------------------------------
    // PRODUCT TOTALS
    // ----------------------------------------------------------------------

    const productActivations = data.products.reduce(
      (total, product) => total + product.activations,
      0,
    );

    const productReactivations = data.products.reduce(
      (total, product) => total + product.reactivations,
      0,
    );

    const productTransactions = data.products.reduce(
      (total, product) => total + product.transactions,
      0,
    );

    if (productActivations !== data.activations) {
      ctx.addIssue({
        code: "custom",

        path: ["products"],

        message: `Product activations total (${productActivations}) must equal activity activations (${data.activations})`,
      });
    }

    if (productReactivations !== data.reactivations) {
      ctx.addIssue({
        code: "custom",

        path: ["products"],

        message: `Product reactivations total (${productReactivations}) must equal activity reactivations (${data.reactivations})`,
      });
    }

    if (productTransactions !== data.transactions) {
      ctx.addIssue({
        code: "custom",

        path: ["products"],

        message: `Product transactions total (${productTransactions}) must equal activity transactions (${data.transactions})`,
      });
    }
  });

export type ActivityFormValues = z.infer<typeof activitySchema>;
