import { z } from 'zod';

export const identityBindRegistrySchema = z.object({
  allowedDomains: z.array(z.string().min(1)),
  entries: z.array(
    z.object({
      email: z.string().email(),
      displayName: z.string().min(1),
      department: z.string().min(1),
      roleLabel: z.string().min(1),
    }),
  ),
});

export const identityBindingSubmitSchema = z.object({
  companyEmail: z.string().email(),
  loginCode: z.string().min(1),
});
