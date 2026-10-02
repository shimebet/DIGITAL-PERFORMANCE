import {
  z,
} from 'zod';

export const changePasswordSchema =
  z
    .object({
      currentPassword:
        z
          .string()
          .min(
            1,
            'Current password is required',
          ),

      newPassword:
        z
          .string()
          .min(
            8,
            'New password must contain at least 8 characters',
          ),

      confirmPassword:
        z
          .string()
          .min(
            1,
            'Confirm password is required',
          ),
    })
    .refine(
      (values) =>
        values.newPassword ===
        values.confirmPassword,
      {
        path: [
          'confirmPassword',
        ],

        message:
          'Passwords do not match',
      },
    )
    .refine(
      (values) =>
        values.currentPassword !==
        values.newPassword,
      {
        path: [
          'newPassword',
        ],

        message:
          'New password must be different from current password',
      },
    );

export type ChangePasswordFormValues =
  z.infer<
    typeof changePasswordSchema
  >;