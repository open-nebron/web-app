import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .max(128, 'Password must not exceed 128 characters')
      .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const usernameRegex = /^[a-z][a-z0-9._]{2,19}$/;

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(/^[a-z]/, 'Username must start with a lowercase letter')
  .regex(/^[a-z0-9._]+$/, 'Username can only contain lowercase letters, numbers, underscores, and dots')
  .refine((val) => !/[._]$/.test(val), {
    message: 'Username cannot end with a period or underscore',
  })
  .refine((val) => !/[._]{2,}/.test(val), {
    message: 'Username cannot contain consecutive punctuation (e.g. .., __, ._)',
  });

export const profileEditSchema = z.object({
  name: z
    .string()
    .max(80, 'Name must not exceed 80 characters')
    .nullable()
    .optional(),
  username: usernameSchema,
  bio: z
    .string()
    .max(300, 'Bio must not exceed 300 characters')
    .nullable()
    .optional(),
  about: z
    .string()
    .max(2000, 'About must not exceed 2000 characters')
    .nullable()
    .optional(),
  dateOfBirth: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        const d = new Date(val);
        if (isNaN(d.getTime())) return false;
        const now = new Date();
        const minThirteenYearsAgo = new Date(
          now.getFullYear() - 13,
          now.getMonth(),
          now.getDate()
        );
        return d <= minThirteenYearsAgo;
      },
      {
        message: 'You must be at least 13 years old',
      }
    ),
  language: z.string().min(2, 'Please select a language'),
  theme: z.enum(['light', 'dark', 'system']),
});

export type ProfileEditFormData = z.infer<typeof profileEditSchema>;

