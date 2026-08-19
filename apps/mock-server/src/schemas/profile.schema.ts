import { z } from 'zod';
import { imageResourceSchema } from './common.schema';

const profileUserSchema = z.object({
  chineseName: z.string().min(1),
  name: z.string().min(1),
  titleCn: z.string().min(1),
  titleEn: z.string().min(1),
  department: z.string().min(1),
  role: z.string().min(1),
  avatar: imageResourceSchema,
});

const profileFieldSchema = z.object({
  id: z.string().min(1),
  labelCn: z.string().min(1),
  labelEn: z.string().min(1),
  value: z.string().min(1),
  icon: imageResourceSchema,
});

export const profileSchema = z.object({
  isLoggedIn: z.boolean(),
  user: profileUserSchema.nullable(),
  fields: z.array(profileFieldSchema),
  roleOptions: z.array(
    z.object({
      key: z.enum(['Edward', 'Customer', 'Visitor']),
      label: z.string().min(1),
    }),
  ),
});
