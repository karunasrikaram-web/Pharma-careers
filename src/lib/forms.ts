export interface ContactState {
  ok: boolean;
  message?: string;
  errors: Record<string, string>;
  values: {
    name: string;
    email: string;
    subject: string;
    message: string;
  };
}

export interface ReportState {
  ok: boolean;
  message?: string;
  errors: Record<string, string>;
}

export interface UserDetailsFormValues {
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  qualification: string;
  experience: string;
  preferred_departments: string;
  message: string;
  consent: boolean;
}

export interface UserDetailsFormState {
  ok: boolean;
  message?: string;
  errors: Record<string, string>;
  values: UserDetailsFormValues;
}

export interface PasswordState {
  ok: boolean;
  message?: string;
  errors: Record<string, string>;
}

export interface LoginState {
  error?: string;
}

export interface JobFormState {
  errors: Record<string, string>;
  values: import("@/lib/validation").JobFormValues;
  message?: string;
}
