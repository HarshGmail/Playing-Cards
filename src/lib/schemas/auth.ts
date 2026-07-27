import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().min(1).max(100),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-z0-9_]+$/, 'Username must contain only lowercase letters, numbers, and underscores'),
  email: z.string().email(),
  phone: z.string().regex(/^\+?[0-9]{10,}$/, 'Invalid phone number'),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[0-9]/, 'Password must contain a number')
    .regex(/[!@#$%^&*]/, 'Password must contain a special character'),
});

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export const recoverIdentitySchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8)
    .regex(/[0-9]/)
    .regex(/[!@#$%^&*]/),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RecoverIdentityInput = z.infer<typeof recoverIdentitySchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
