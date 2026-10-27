"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveJobAction } from "@/actions/jobs";
import { EMPLOYMENT_TYPES, DEPARTMENTS } from "@/lib/constants";
import type { JobFormState } from "@/lib/forms";
import type { JobFormValues } from "@/lib/validation";

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="field-error">{message}</span>;
}

export function JobForm({ initialValues }: { initialValues: JobFormValues }) {
  const initial: JobFormState = { errors: {}, values: initialValues };
  const [state, formAction, pending] = useActionState(saveJobAction, initial);
  const values = state.values ?? initialValues;
  const errors = state.errors ?? {};

  return (
    <form className="admin-form" action={formAction}>
      <input type="hidden" name="id" value={values.id} />
      <input type="hidden" name="intent" value="save" />

      {state.message ? (
        <p className="admin-form-error-summary" role="alert">
          {state.message}
        </p>
      ) : null}
      {errors.form ? <p className="admin-form-error-summary">{errors.form}</p> : null}

      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h2>Job details</h2>
            <p>The public title, employer and classification.</p>
          </div>
        </div>
        <div className="admin-panel-body">
          <div className="admin-form-grid">
            <div className="field full">
              <label className="label" htmlFor="job-title">
                Job title
              </label>
              <input
                className="input"
                id="job-title"
                name="title"
                defaultValue={values.title}
                maxLength={140}
                required
              />
              <ErrorText message={errors.title} />
            </div>

            <div className="field">
              <label className="label" htmlFor="job-company">
                Company name
              </label>
              <input
                className="input"
                id="job-company"
                name="company_name"
                defaultValue={values.company_name}
                maxLength={120}
                required
              />
              <ErrorText message={errors.company_name} />
            </div>

            <div className="field">
              <label className="label" htmlFor="job-department">
                Department
              </label>
              <input
                className="input"
                id="job-department"
                name="department"
                list="job-department-options"
                defaultValue={values.department}
                maxLength={80}
                required
              />
              <datalist id="job-department-options">
                {DEPARTMENTS.map((department) => (
                  <option key={department} value={department} />
                ))}
              </datalist>
              <ErrorText message={errors.department} />
            </div>

            <div className="field">
              <label className="label" htmlFor="job-city">
                City
              </label>
              <input
                className="input"
                id="job-city"
                name="city"
                defaultValue={values.city}
                maxLength={80}
                required
              />
              <ErrorText message={errors.city} />
            </div>

            <div className="field">
              <label className="label" htmlFor="job-state">
                State
              </label>
              <input
                className="input"
                id="job-state"
                name="state"
                defaultValue={values.state}
                maxLength={80}
                required
              />
              <ErrorText message={errors.state} />
            </div>

            <div className="field">
              <label className="label" htmlFor="job-type">
                Employment type <span className="optional">(optional)</span>
              </label>
              <select
                className="select"
                id="job-type"
                name="employment_type"
                defaultValue={values.employment_type}
              >
                <option value="">Not specified</option>
                {EMPLOYMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <ErrorText message={errors.employment_type} />
            </div>

            <div className="field">
              <label className="label" htmlFor="job-salary">
                Salary range <span className="optional">(optional)</span>
              </label>
              <input
                className="input"
                id="job-salary"
                name="salary_range"
                defaultValue={values.salary_range}
                maxLength={120}
                placeholder="Only enter a range supplied by the employer"
              />
              <ErrorText message={errors.salary_range} />
            </div>

            <div className="field">
              <label className="label" htmlFor="job-exp-min">
                Minimum experience (years)
              </label>
              <input
                className="input"
                id="job-exp-min"
                name="experience_min"
                type="number"
                min={0}
                max={60}
                step={1}
                defaultValue={values.experience_min}
              />
              <ErrorText message={errors.experience_min} />
            </div>

            <div className="field">
              <label className="label" htmlFor="job-exp-max">
                Maximum experience (years)
              </label>
              <input
                className="input"
                id="job-exp-max"
                name="experience_max"
                type="number"
                min={0}
                max={60}
                step={1}
                defaultValue={values.experience_max}
              />
              <ErrorText message={errors.experience_max} />
            </div>
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h2>Role content</h2>
            <p>Add one item per line for lists. Do not invent details.</p>
          </div>
        </div>
        <div className="admin-panel-body">
          <div className="admin-form-grid">
            <div className="field full">
              <label className="label" htmlFor="job-description">
                Job description
              </label>
              <textarea
                className="textarea"
                id="job-description"
                name="description"
                defaultValue={values.description}
                rows={6}
                maxLength={12000}
                required
              />
              <span className="field-hint">
                Separate paragraphs with a blank line. Minimum 30 characters.
              </span>
              <ErrorText message={errors.description} />
            </div>

            <div className="field">
              <label className="label" htmlFor="job-responsibilities">
                Responsibilities <span className="optional">(one per line)</span>
              </label>
              <textarea
                className="textarea"
                id="job-responsibilities"
                name="responsibilities"
                defaultValue={values.responsibilities}
                rows={6}
                maxLength={8000}
              />
              <ErrorText message={errors.responsibilities} />
            </div>

            <div className="field">
              <label className="label" htmlFor="job-qualifications">
                Qualifications <span className="optional">(one per line)</span>
              </label>
              <textarea
                className="textarea"
                id="job-qualifications"
                name="qualifications"
                defaultValue={values.qualifications}
                rows={6}
                maxLength={8000}
              />
              <ErrorText message={errors.qualifications} />
            </div>

            <div className="field">
              <label className="label" htmlFor="job-skills">
                Required skills <span className="optional">(one per line)</span>
              </label>
              <textarea
                className="textarea"
                id="job-skills"
                name="skills"
                defaultValue={values.skills}
                rows={5}
                maxLength={8000}
              />
              <ErrorText message={errors.skills} />
            </div>

            <div className="field">
              <label className="label" htmlFor="job-instructions">
                Application instructions
              </label>
              <textarea
                className="textarea"
                id="job-instructions"
                name="application_instructions"
                defaultValue={values.application_instructions}
                rows={5}
                maxLength={5000}
              />
              <ErrorText message={errors.application_instructions} />
            </div>
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-head">
          <div>
            <h2>Application and publishing</h2>
            <p>Only publish verified vacancies from a genuine source.</p>
          </div>
        </div>
        <div className="admin-panel-body">
          <div className="admin-form-grid">
            <div className="field">
              <label className="label" htmlFor="job-application-url">
                Official application URL
              </label>
              <input
                className="input"
                id="job-application-url"
                name="application_url"
                type="url"
                defaultValue={values.application_url}
                maxLength={2000}
                placeholder="https://company.example/careers/apply"
              />
              <span className="field-hint">
                Must be the employer&apos;s own http(s) page. Leave blank if unavailable.
              </span>
              <ErrorText message={errors.application_url} />
            </div>

            <div className="field">
              <label className="label" htmlFor="job-deadline">
                Application deadline
              </label>
              <input
                className="input"
                id="job-deadline"
                name="application_deadline"
                type="date"
                defaultValue={values.application_deadline}
              />
              <span className="field-hint">
                Expired jobs are removed from public listings automatically.
              </span>
              <ErrorText message={errors.application_deadline} />
            </div>

            <div className="field">
              <label className="label" htmlFor="job-status">
                Publication status
              </label>
              <select
                className="select"
                id="job-status"
                name="status"
                defaultValue={values.status || "draft"}
              >
                <option value="draft">Draft — private</option>
                <option value="published">Published — public</option>
                <option value="archived">Archived</option>
              </select>
              <span className="field-hint">
                Drafts never appear in public listings or on the homepage.
              </span>
              <ErrorText message={errors.status} />
            </div>

            <div className="field">
              <span className="label">Featured</span>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  name="is_featured"
                  defaultChecked={Boolean(values.is_featured)}
                />
                <span>
                  Feature this job
                  <small>Featured jobs appear first in public job lists.</small>
                </span>
              </label>
            </div>
          </div>
        </div>
      </section>

      <div className="admin-sticky-actions">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save job"}
        </button>
        <Link href="/admin/jobs" className="btn btn-secondary">
          Cancel
        </Link>
        <p className="admin-hint" style={{ marginLeft: "auto" }}>
          Changes update the public site immediately after saving.
        </p>
      </div>
    </form>
  );
}
