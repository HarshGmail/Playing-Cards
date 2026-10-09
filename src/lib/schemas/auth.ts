import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  username: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(/^[a-z0-9_]+$/, 'Username must contain only lowercase letters, numbers, and underscores'),
  email: z.string().trim().email(),
  phone: z.string().trim().regex(/^\+?[0-9]{10,}$/, 'Invalid phone number'),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[0-9]/, 'Password must contain a number')
    .regex(/[!@#$%^&*]/, 'Password must contain a special character'),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(1),
});

export const recoverIdentitySchema = z.object({
  username: z.string({ required_error: 'Username is required' }).trim().min(1, 'Username is required'),
  email: z.string({ required_error: 'Email is required' }).trim().email('Invalid email'),
  phone: z.string({ required_error: 'Phone is required' }).trim().min(1, 'Phone is required'),
  dob: z
    .string({ required_error: 'Date of birth is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
});

export const resetPasswordSchema = z.object({
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .regex(/[0-9]/, 'Password must contain a number')
    .regex(/[!@#$%^&*]/, 'Password must contain a special character'),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RecoverIdentityInput = z.infer<typeof recoverIdentitySchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
