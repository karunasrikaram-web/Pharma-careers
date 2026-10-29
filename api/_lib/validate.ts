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

export const applicationStatus = z.enum([
  "new",
  "reviewing",
  "shortlisted",
  "interviewed",
  "offered",
  "hired",
  "rejected",
]);

export const createApplicationSchema = z.object({
  jobId: z.string().uuid(),
  name: z.string().min(1).max(200),
  surname: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().min(5).max(50),
  location: z.string().min(2).max(300),
  coverNote: z.string().max(5000).optional().nullable(),
  resume: z.object({
    filename: z.string().min(1).max(255),
    contentType: z.string().min(1).max(150),
    // Base64 payload; a 3 MB file encodes to ~4 MB of base64. The exact
    // decoded byte cap is re-checked in the handler after decoding.
    dataBase64: z.string().min(1).max(4_500_000),
  }),
});

/**
 * Duplicate check the apply form runs as the candidate types their email:
 * returns the role titles this email has already applied for (any company),
 * which drives the "+" badges and the friendly "you already applied" message.
 * Only the email is ever sent — no other candidate data leaves the server.
 */
export const checkApplicationsSchema = z.object({
  email: z.string().email().max(200),
});

export const updateApplicationSchema = z.object({
  id: z.string().uuid(),
  status: applicationStatus,
});
