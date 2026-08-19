import { z } from 'zod';
import { imageResourceSchema } from './common.schema';

export const kbLifeEntriesSchema = z.object({
  banners: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      subtitle: z.string().min(1),
      image: imageResourceSchema,
    }),
  ),
  locations: z.array(z.string().min(1)),
  campusServices: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      subtitle: z.string().min(1),
      icon: imageResourceSchema,
      path: z.string().optional(),
    }),
  ),
  employeeServices: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      subtitle: z.string().min(1),
      icon: imageResourceSchema,
      path: z.string().optional(),
    }),
  ),
});

export const canteenSchema = z.object({
  intro: z.string().min(1),
  menuItems: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
      image: imageResourceSchema,
    }),
  ),
});

export const shuttleSchema = z.object({
  notice: z.string().min(1),
  routes: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      stops: z.array(
        z.object({
          time: z.string().optional(),
          name: z.string().min(1),
          note: z.string().optional(),
        }),
      ),
      stationsText: z.string().min(1),
    }),
  ),
});

export const activitiesSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      subtitle: z.string().min(1),
      icon: imageResourceSchema,
      iconBg: z.string().min(1),
      path: z.string().min(1),
    }),
  ),
  annualDinner: z.object({
    title: z.string().min(1),
    subtitle: z.string().min(1),
    time: z.string().min(1),
    location: z.string().min(1),
  }),
  outings: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      descriptionCn: z.string().min(1),
      descriptionEn: z.string().min(1),
      timeLabel: z.string().min(1),
      status: z.enum(['open', 'closed']),
      statusText: z.string().min(1),
    }),
  ),
  health: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
  }),
});
