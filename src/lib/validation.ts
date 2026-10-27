import { z } from "zod";
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, QUALIFICATIONS, REPORT_REASONS, USER_DETAIL_KINDS } from "@/lib/constants";
import { safeExternalUrl } from "@/lib/urls";
import { validatePasswordStrength } from "@/lib/password";
import type { Job } from "@/lib/types";

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const optionalInteger = (max: number) =>
  z.preprocess(
    (value) => {
      const empty = emptyToUndefined(value);
      return empty === undefined ? undefined : Number(empty);
    },
    z.number().int("Enter a whole number.").min(0, "Cannot be negative.").max(max).optional(),
  );

const optionalUrl = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .max(2000, "URL is too long.")
    .refine((value) => safeExternalUrl(value) !== null, "Enter a valid http(s) application URL.")
    .optional(),
);

const optionalDate = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD format.")
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, "Enter a valid calendar date.")
    .optional(),
);

export const jobInputSchema = z
  .object({
    title: z.string().trim().min(3, "Enter a job title.").max(140, "Title is too long."),
    company_name: z
      .string()
      .trim()
      .min(2, "Enter the company name.")
      .max(120, "Company name is too long."),
    department: z
      .string()
      .trim()
      .min(2, "Enter a department.")
      .max(80, "Department is too long."),
    city: z.string().trim().min(2, "Enter the city.").max(80, "City is too long."),
    state: z.string().trim().min(2, "Enter the state.").max(80, "State is too long."),
    description: z
      .string()
      .trim()
      .min(30, "Write at least 30 characters describing the role.")
      .max(12000, "Description is too long."),
    status: z.enum(["draft", "published", "archived"]),
    experience_min: optionalInteger(60),
    experience_max: optionalInteger(60),
    employment_type: z.preprocess(
      emptyToUndefined,
      z.enum(EMPLOYMENT_TYPES).optional(),
    ),
    salary_range: optionalText(120),
    responsibilities: optionalText(8000),
    qualifications: optionalText(8000),
    skills: optionalText(8000),
    application_instructions: optionalText(5000),
    application_url: optionalUrl,
    application_deadline: optionalDate,
    is_featured: z.preprocess(
      (value) => value === "on" || value === "true" || value === true,
      z.boolean(),
    ),
  })
  .superRefine((data, ctx) => {
    if (
      data.experience_min != null &&
      data.experience_max != null &&
      data.experience_min > data.experience_max
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["experience_max"],
        message: "Maximum experience must be greater than or equal to the minimum.",
      });
    }
  });

export type JobInput = z.infer<typeof jobInputSchema>;

export interface JobFormValues {
  id: string;
  title: string;
  company_name: string;
  department: string;
  city: string;
  state: string;
  description: string;
  status: string;
  experience_min: string;
  experience_max: string;
  employment_type: string;
  salary_range: string;
  responsibilities: string;
  qualifications: string;
  skills: string;
  application_instructions: string;
  application_url: string;
  application_deadline: string;
  is_featured: string;
  intent: string;
}

export const EMPTY_JOB_FORM: JobFormValues = {
  id: "",
  title: "",
  company_name: "",
  department: "",
  city: "",
  state: "",
  description: "",
  status: "draft",
  experience_min: "",
  experience_max: "",
  employment_type: "",
  salary_range: "",
  responsibilities: "",
  qualifications: "",
  skills: "",
  application_instructions: "",
  application_url: "",
  application_deadline: "",
  is_featured: "",
  intent: "",
};

function formValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function jobToFormValues(job: Job): JobFormValues {
  return {
    id: job.id,
    title: job.title,
    company_name: job.company_name,
    department: job.department,
    city: job.city,
    state: job.state,
    description: job.description,
    status: job.status,
    experience_min: job.experience_min == null ? "" : String(job.experience_min),
    experience_max: job.experience_max == null ? "" : String(job.experience_max),
    employment_type: job.employment_type ?? "",
    salary_range: job.salary_range ?? "",
    responsibilities: job.responsibilities ?? "",
    qualifications: job.qualifications ?? "",
    skills: job.skills ?? "",
    application_instructions: job.application_instructions ?? "",
    application_url: job.application_url ?? "",
    application_deadline: job.application_deadline ?? "",
    is_featured: job.is_featured ? "on" : "",
    intent: "",
  };
}

export function valuesFromFormData(formData: FormData): JobFormValues {
  return {
    id: formValue(formData, "id"),
    title: formValue(formData, "title"),
    company_name: formValue(formData, "company_name"),
    department: formValue(formData, "department"),
    city: formValue(formData, "city"),
    state: formValue(formData, "state"),
    description: formValue(formData, "description"),
    status: formValue(formData, "status") || "draft",
    experience_min: formValue(formData, "experience_min"),
    experience_max: formValue(formData, "experience_max"),
    employment_type: formValue(formData, "employment_type"),
    salary_range: formValue(formData, "salary_range"),
    responsibilities: formValue(formData, "responsibilities"),
    qualifications: formValue(formData, "qualifications"),
    skills: formValue(formData, "skills"),
    application_instructions: formValue(formData, "application_instructions"),
    application_url: formValue(formData, "application_url"),
    application_deadline: formValue(formData, "application_deadline"),
    is_featured: formData.get("is_featured") ? "on" : "",
    intent: formValue(formData, "intent"),
  };
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const flattened = z.flattenError(error) as {
    formErrors: string[];
    fieldErrors: Record<string, string[] | undefined>;
  };
  const errors: Record<string, string> = {};
  for (const [key, messages] of Object.entries(flattened.fieldErrors)) {
    if (messages && messages.length > 0) errors[key] = messages[0];
  }
  return errors;
}

export function parseJobForm(formData: FormData): {
  success: true;
  data: JobInput;
  values: JobFormValues;
} | {
  success: false;
  errors: Record<string, string>;
  values: JobFormValues;
} {
  const values = valuesFromFormData(formData);
  const parsed = jobInputSchema.safeParse({
    title: values.title,
    company_name: values.company_name,
    department: values.department,
    city: values.city,
    state: values.state,
    description: values.description,
    status: values.status,
    experience_min: values.experience_min,
    experience_max: values.experience_max,
    employment_type: values.employment_type,
    salary_range: values.salary_range,
    responsibilities: values.responsibilities,
    qualifications: values.qualifications,
    skills: values.skills,
    application_instructions: values.application_instructions,
    application_url: values.application_url,
    application_deadline: values.application_deadline,
    is_featured: values.is_featured,
  });

  if (!parsed.success) {
    return { success: false, errors: fieldErrors(parsed.error), values };
  }

  return { success: true, data: parsed.data, values };
}

export const loginSchema = z.object({
  email: z.email("Enter a valid email address.").max(254),
  password: z.string().min(1, "Enter your password.").max(200),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(100, "Name is too long."),
  email: z.email("Enter a valid email address.").max(254),
  subject: z.string().trim().min(3, "Enter a subject.").max(150, "Subject is too long."),
  message: z
    .string()
    .trim()
    .min(20, "Please write at least 20 characters.")
    .max(5000, "Message is too long."),
  website: z.string().max(0, "Submission could not be completed.").optional(),
});

export const reportSchema = z
  .object({
    job_id: z.string().trim().min(1).max(64),
    reason: z.enum(REPORT_REASONS),
    details: z.string().trim().max(2000, "Details are too long.").optional(),
    reporter_email: z.preprocess(
      emptyToUndefined,
      z.email("Enter a valid email address.").max(254).optional(),
    ),
    website: z.string().max(0, "Submission could not be completed.").optional(),
  })
  .superRefine((data, ctx) => {
    if (data.reason === "Other" && (!data.details || data.details.length < 10)) {
      ctx.addIssue({
        code: "custom",
        path: ["details"],
        message: "Please describe the issue (at least 10 characters).",
      });
    }
  });

export const userDetailsSchema = z.object({
  kind: z.enum(USER_DETAIL_KINDS),
  job_id: z.preprocess(emptyToUndefined, z.string().trim().max(64).optional()),
  name: z.string().trim().min(2, "Enter your full name.").max(100, "Name is too long."),
  email: z.email("Enter a valid email address.").max(254),
  phone: z
    .string()
    .trim()
    .min(7, "Enter your phone number.")
    .max(25, "Phone number is too long.")
    .refine(
      (value) => /^[+]?[0-9][0-9\s().-]{5,24}$/.test(value),
      "Enter a valid phone number.",
    ),
  city: z.string().trim().min(2, "Enter your city.").max(80, "City is too long."),
  state: z.string().trim().min(2, "Enter your state.").max(80, "State is too long."),
  qualification: z
    .string()
    .trim()
    .refine(
      (value) => (QUALIFICATIONS as readonly string[]).includes(value),
      "Select your highest qualification.",
    ),
  experience: z
    .string()
    .trim()
    .refine(
      (value) => (EXPERIENCE_LEVELS as readonly string[]).includes(value),
      "Select your experience level.",
    ),
  preferred_departments: optionalText(120),
  message: optionalText(2000),
  consent: z.preprocess(
    (value) => value === "on" || value === true,
    z.boolean().refine((value) => value, "Please confirm that you agree to the privacy notice."),
  ),
  website: z.string().max(0, "Submission could not be completed.").optional(),
});

export type UserDetailsInput = z.infer<typeof userDetailsSchema>;

const optionalHttpUrl = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .max(2000, "URL is too long.")
    .refine((value) => safeExternalUrl(value) !== null, "Enter a valid http(s) URL.")
    .optional(),
);

const optionalDateTime = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date and time.")
    .optional(),
);

export const articleInputSchema = z.object({
  title: z.string().trim().min(3, "Enter an article title.").max(180, "Title is too long."),
  slug: z
    .string()
    .trim()
    .max(120)
    .regex(/^[a-z0-9-]*$/, "Use lowercase letters, numbers and hyphens only.")
    .optional(),
  excerpt: optionalText(400),
  content: z
    .string()
    .trim()
    .min(30, "Write at least 30 characters of article content.")
    .max(120_000, "Article content is too long."),
  cover_image_url: optionalHttpUrl,
  category_id: z.preprocess(emptyToUndefined, z.string().trim().max(64).optional()),
  author_name: optionalText(120),
  tags: optionalText(400),
  seo_title: optionalText(180),
  seo_description: optionalText(300),
  status: z.enum(["draft", "published", "archived"]),
  is_featured: z.preprocess(
    (value) => value === "on" || value === "true" || value === true,
    z.boolean(),
  ),
  scheduled_at: optionalDateTime,
  intent: z.string().optional(),
});

export type ArticleInput = z.infer<typeof articleInputSchema>;

export interface ArticleFormValues {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  category_id: string;
  author_name: string;
  tags: string;
  seo_title: string;
  seo_description: string;
  status: string;
  is_featured: string;
  scheduled_at: string;
  intent: string;
}

export const EMPTY_ARTICLE_FORM: ArticleFormValues = {
  id: "",
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  category_id: "",
  author_name: "Pharma Careers Editorial Team",
  tags: "",
  seo_title: "",
  seo_description: "",
  status: "draft",
  is_featured: "",
  scheduled_at: "",
  intent: "",
};

export function articleToFormValues(article: import("@/lib/types").Article): ArticleFormValues {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt ?? "",
    content: article.content,
    cover_image_url: article.cover_image_url ?? "",
    category_id: article.category_id ?? "",
    author_name: article.author_name ?? "",
    tags: article.tags ?? "",
    seo_title: article.seo_title ?? "",
    seo_description: article.seo_description ?? "",
    status: article.status,
    is_featured: article.is_featured ? "on" : "",
    scheduled_at: article.scheduled_at ? article.scheduled_at.slice(0, 16) : "",
    intent: "",
  };
}

export function articleValuesFromFormData(formData: FormData): ArticleFormValues {
  return {
    id: formValue(formData, "id"),
    title: formValue(formData, "title"),
    slug: formValue(formData, "slug"),
    excerpt: formValue(formData, "excerpt"),
    content: formValue(formData, "content"),
    cover_image_url: formValue(formData, "cover_image_url"),
    category_id: formValue(formData, "category_id"),
    author_name: formValue(formData, "author_name"),
    tags: formValue(formData, "tags"),
    seo_title: formValue(formData, "seo_title"),
    seo_description: formValue(formData, "seo_description"),
    status: formValue(formData, "status") || "draft",
    is_featured: formData.get("is_featured") ? "on" : "",
    scheduled_at: formValue(formData, "scheduled_at"),
    intent: formValue(formData, "intent"),
  };
}

export function parseArticleForm(formData: FormData): {
  success: true;
  data: ArticleInput;
  values: ArticleFormValues;
} | {
  success: false;
  errors: Record<string, string>;
  values: ArticleFormValues;
} {
  const values = articleValuesFromFormData(formData);
  const intent = values.intent;
  const status =
    intent === "draft"
      ? "draft"
      : intent === "publish"
        ? "published"
        : intent === "archive"
          ? "archived"
          : values.status;

  const parsed = articleInputSchema.safeParse({
    title: values.title,
    slug: values.slug,
    excerpt: values.excerpt,
    content: values.content,
    cover_image_url: values.cover_image_url,
    category_id: values.category_id,
    author_name: values.author_name,
    tags: values.tags,
    seo_title: values.seo_title,
    seo_description: values.seo_description,
    status,
    is_featured: values.is_featured,
    scheduled_at: values.scheduled_at,
    intent,
  });

  if (!parsed.success) {
    return { success: false, errors: fieldErrors(parsed.error), values: { ...values, status } };
  }

  return { success: true, data: parsed.data, values: { ...values, status } };
}

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Enter a category name.").max(100, "Name is too long."),
  content_type: z.enum(["article", "job"]).default("article"),
});

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password.").max(200),
    new_password: z.string().min(1, "Enter a new password.").max(200),
    confirm_password: z.string().min(1, "Confirm your new password.").max(200),
  })
  .superRefine((data, ctx) => {
    const strength = validatePasswordStrength(data.new_password);
    if (strength) {
      ctx.addIssue({ code: "custom", path: ["new_password"], message: strength });
    }
    if (data.new_password !== data.confirm_password) {
      ctx.addIssue({
        code: "custom",
        path: ["confirm_password"],
        message: "Passwords do not match.",
      });
    }
    if (data.current_password === data.new_password) {
      ctx.addIssue({
        code: "custom",
        path: ["new_password"],
        message: "Choose a password different from your current one.",
      });
    }
  });
