import { z } from 'zod';

export const RoomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(6, 'Room code must be exactly 6 characters')
  .regex(/^[A-Z0-9]+$/, 'Room code must contain only letters and numbers');

export const UsernameSchema = z
  .string()
  .trim()
  .min(2, 'Username must be at least 2 characters')
  .max(16, 'Username must be at most 16 characters')
  .regex(/^[a-zA-Z0-9_ -]+$/, 'Username can only contain alphanumeric characters, hyphens, and underscores');

export const CalledNumberSchema = z
  .number()
  .int('Number must be an integer')
  .min(1, 'Number must be between 1 and 25')
  .max(25, 'Number must be between 1 and 25');

export const BoardSchema = z
  .array(z.number().int().min(1).max(25))
  .length(25, 'Board must have exactly 25 numbers')
  .refine(
    (arr: number[]) => {
      const set = new Set(arr);
      return set.size === 25 && Array.from({ length: 25 }, (_, i) => i + 1).every((n) => set.has(n));
    },
    { message: 'Board must contain all numbers from 1 to 25 exactly once' }
  );

export const CreateRoomInputSchema = z.object({
  username: UsernameSchema,
  avatarUrl: z.string().optional().default(''),
});

export const JoinRoomInputSchema = z.object({
  roomCode: RoomCodeSchema,
  username: UsernameSchema,
  avatarUrl: z.string().optional().default(''),
  playerId: z.string().optional(),
});

export const CallNumberInputSchema = z.object({
  number: CalledNumberSchema,
});
