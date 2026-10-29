import { z } from "zod";

export const jobStatus = z.enum(["draft", "published", "archived"]);

export const createJobSchema = z.object({
  title: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  location: z.string().max(300).optional().nullable(),
  locationType: z.enum(["onsite", "remote", "hybrid"]).optional().nullable(),
  employmentType: z.enum(["full_time", "part_time", "contract", "internship"]).optional().nullable(),
  level: z.string().max(100).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  description: z.string().max(20000).optional().nullable(),
  requirements: z.string().max(20000).optional().nullable(),
  salaryMin: z.number().int().min(0).optional().nullable(),
  salaryMax: z.number().int().min(0).optional().nullable(),
  currency: z.string().max(10).optional().nullable(),
  status: jobStatus.default("draft"),
});

export const updateJobSchema = createJobSchema.partial().extend({
  id: z.string().min(1),
});

export const createArticleSchema = z.object({
  slug: z.string().min(1).max(200),
  title: z.string().min(1).max(300),
  excerpt: z.string().max(2000).optional().nullable(),
  content: z.string().max(100000).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  author: z.string().max(200).optional().nullable(),
  status: z.enum(["draft", "published"]).default("draft"),
});

export const updateArticleSchema = createArticleSchema.partial().extend({
  id: z.string().min(1),
});

export const siteContentKeySchema = z.object({
  key: z.string().min(1).max(200),
  value: z.record(z.unknown()).default({}),
  type: z.string().max(50).optional(),
});

export const leadStatus = z.enum(["new", "viewing", "contacted", "hired", "rejected"]);

export const createLeadSchema = z.object({
  jobId: z.string().min(1).optional(),
  candidateName: z.string().max(200).optional(),
  email: z.string().email().max(200).optional(),
  phone: z.string().max(50).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  status: leadStatus.default("viewing"),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateLeadSchema = createLeadSchema.partial().extend({
  id: z.string().min(1),
});

export const contactMessageSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  subject: z.string().max(300).optional(),
  message: z.string().min(1).max(10000),
});
