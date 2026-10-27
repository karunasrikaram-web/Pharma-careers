"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveArticleAction, type ArticleFormState } from "@/actions/articles";
import type { ArticleFormValues } from "@/lib/validation";
import type { Category } from "@/lib/types";

const INITIAL_STATE = (values: ArticleFormValues): ArticleFormState => ({
  errors: {},
  values,
});

const TOOLBAR: Array<
  | { type: "button"; label: string; title: string; command: string; value?: string }
  | { type: "separator" }
> = [
  { type: "button", label: "H2", title: "Heading 2", command: "formatBlock", value: "h2" },
  { type: "button", label: "H3", title: "Heading 3", command: "formatBlock", value: "h3" },
  { type: "button", label: "P", title: "Paragraph", command: "formatBlock", value: "p" },
  { type: "separator" },
  { type: "button", label: "B", title: "Bold", command: "bold" },
  { type: "button", label: "I", title: "Italic", command: "italic" },
  { type: "button", label: "U", title: "Underline", command: "underline" },
  { type: "separator" },
  { type: "button", label: "• List", title: "Bulleted list", command: "insertUnorderedList" },
  { type: "button", label: "1. List", title: "Numbered list", command: "insertOrderedList" },
  { type: "button", label: "❝", title: "Blockquote", command: "formatBlock", value: "blockquote" },
  { type: "separator" },
  { type: "button", label: "Link", title: "Insert link", command: "createLink" },
  { type: "button", label: "Image", title: "Insert image", command: "insertImage" },
  { type: "button", label: "HR", title: "Horizontal rule", command: "insertHorizontalRule" },
  { type: "button", label: "Clear", title: "Clear formatting", command: "removeFormat" },
];

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="field-error">{message}</span>;
}

export function ArticleEditor({
  initialValues,
  categories,
}: {
  initialValues: ArticleFormValues;
  categories: Category[];
}) {
  const [state, formAction, pending] = useActionState(
    saveArticleAction,
    INITIAL_STATE(initialValues),
  );
  const values = state.values ?? initialValues;
  const errors = state.errors ?? {};

  const editorRef = useRef<HTMLDivElement | null>(null);
  const hiddenRef = useRef<HTMLInputElement | null>(null);
  const intentRef = useRef<HTMLInputElement | null>(null);
  const initialised = useRef(false);
  const [wordCount, setWordCount] = useState(0);

  function syncContent() {
    if (hiddenRef.current && editorRef.current) {
      hiddenRef.current.value = editorRef.current.innerHTML;
    }
    const text = editorRef.current?.innerText ?? "";
    setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
  }

  function setIntent(intent: string) {
    if (intentRef.current) intentRef.current.value = intent;
  }

  useEffect(() => {
    if (initialised.current || !editorRef.current) return;
    editorRef.current.innerHTML = initialValues.content || "<p></p>";
    initialised.current = true;
    syncContent();
    // Only initialise the editable surface once; React must not overwrite the
    // caret while the administrator is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues.content]);

  function runCommand(command: string, value?: string) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    if (command === "createLink") {
      const url = window.prompt("Link URL (https://…)");
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) {
        window.alert("Enter a full http(s) link.");
        return;
      }
      document.execCommand("createLink", false, url);
    } else if (command === "insertImage") {
      const url = window.prompt("Image URL (https://…)");
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) {
        window.alert("Enter a full http(s) image URL.");
        return;
      }
      document.execCommand("insertImage", false, url);
    } else {
      document.execCommand(command, false, value);
    }
    syncContent();
  }

  return (
    <form
      className="admin-form"
      action={formAction}
      onSubmit={() => syncContent()}
    >
      <input type="hidden" name="id" value={values.id} />
      <input type="hidden" name="content" ref={hiddenRef} defaultValue={values.content} />
      <input type="hidden" name="intent" ref={intentRef} defaultValue="save" />

      {state.message ? (
        <p className="admin-form-error-summary" role="alert">
          {state.message}
        </p>
      ) : null}
      {errors.form ? <p className="admin-form-error-summary">{errors.form}</p> : null}

      <div className="admin-two-col">
        <div className="admin-side-stack">
          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <h2>Article content</h2>
                <p>Use the toolbar to format the body. Content is sanitised on save.</p>
              </div>
            </div>
            <div className="admin-panel-body">
              <div className="admin-form-grid">
                <div className="field full">
                  <label className="label" htmlFor="article-title">
                    Article title
                  </label>
                  <input
                    className="input"
                    id="article-title"
                    name="title"
                    defaultValue={values.title}
                    maxLength={180}
                    required
                  />
                  <ErrorText message={errors.title} />
                </div>

                <div className="field">
                  <label className="label" htmlFor="article-slug">
                    URL slug <span className="optional">(optional)</span>
                  </label>
                  <input
                    className="input"
                    id="article-slug"
                    name="slug"
                    defaultValue={values.slug}
                    maxLength={120}
                    placeholder="auto-generated-from-title"
                    pattern="[a-z0-9-]*"
                  />
                  <span className="field-hint">Lowercase letters, numbers and hyphens.</span>
                  <ErrorText message={errors.slug} />
                </div>

                <div className="field">
                  <label className="label" htmlFor="article-category">
                    Category
                  </label>
                  <select
                    className="select"
                    id="article-category"
                    name="category_id"
                    defaultValue={values.category_id}
                  >
                    <option value="">Uncategorised</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <ErrorText message={errors.category_id} />
                </div>

                <div className="field full">
                  <label className="label" htmlFor="article-excerpt">
                    Short excerpt <span className="optional">(optional)</span>
                  </label>
                  <textarea
                    className="textarea"
                    id="article-excerpt"
                    name="excerpt"
                    defaultValue={values.excerpt}
                    rows={3}
                    maxLength={400}
                    placeholder="A short summary shown on article cards and in search results."
                  />
                  <ErrorText message={errors.excerpt} />
                </div>

                <div className="field full">
                  <span className="label" id="article-body-label">
                    Article body
                  </span>
                  <div className="editor-shell">
                    <div className="editor-toolbar" role="toolbar" aria-label="Text formatting">
                      {TOOLBAR.map((item, index) =>
                        item.type === "separator" ? (
                          <span key={`sep-${index}`} className="separator" aria-hidden="true" />
                        ) : (
                          <button
                            key={`${item.command}-${item.value ?? item.label}`}
                            type="button"
                            title={item.title}
                            aria-label={item.title}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => runCommand(item.command, item.value)}
                          >
                            {item.label}
                          </button>
                        ),
                      )}
                    </div>
                    <div
                      className="editor-surface"
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      role="textbox"
                      aria-multiline="true"
                      aria-labelledby="article-body-label"
                      onInput={syncContent}
                      onBlur={syncContent}
                    />
                    <div className="editor-status">
                      {wordCount} word{wordCount === 1 ? "" : "s"} · Content is cleaned on save
                      to remove unsafe HTML.
                    </div>
                  </div>
                  <span className="field-hint">
                    Minimum 30 characters. You can paste formatted content; unsupported tags
                    and scripts are removed.
                  </span>
                  <ErrorText message={errors.content} />
                </div>
              </div>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <h2>Search engine preview</h2>
                <p>Optional SEO overrides. Search engines may still choose their own snippet.</p>
              </div>
            </div>
            <div className="admin-panel-body">
              <div className="admin-form-grid">
                <div className="field full">
                  <label className="label" htmlFor="article-seo-title">
                    SEO title <span className="optional">(optional)</span>
                  </label>
                  <input
                    className="input"
                    id="article-seo-title"
                    name="seo_title"
                    defaultValue={values.seo_title}
                    maxLength={180}
                  />
                  <ErrorText message={errors.seo_title} />
                </div>
                <div className="field full">
                  <label className="label" htmlFor="article-seo-description">
                    SEO meta description <span className="optional">(optional)</span>
                  </label>
                  <textarea
                    className="textarea"
                    id="article-seo-description"
                    name="seo_description"
                    defaultValue={values.seo_description}
                    rows={3}
                    maxLength={300}
                  />
                  <ErrorText message={errors.seo_description} />
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="admin-side-stack">
          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <h2>Publishing</h2>
                <p>Save a draft or publish when ready.</p>
              </div>
            </div>
            <div className="admin-panel-body">
              <div className="admin-form" style={{ gap: 15 }}>
                <div className="field">
                  <label className="label" htmlFor="article-status">
                    Publication status
                  </label>
                  <select
                    className="select"
                    id="article-status"
                    name="status"
                    defaultValue={values.status || "draft"}
                  >
                    <option value="draft">Draft — private</option>
                    <option value="published">Published — public</option>
                    <option value="archived">Archived</option>
                  </select>
                  <ErrorText message={errors.status} />
                </div>

                <div className="field">
                  <label className="label" htmlFor="article-scheduled">
                    Schedule publication <span className="optional">(optional)</span>
                  </label>
                  <input
                    className="input"
                    id="article-scheduled"
                    name="scheduled_at"
                    type="datetime-local"
                    defaultValue={values.scheduled_at}
                  />
                  <span className="field-hint">
                    When set in the future, the article stays hidden until this time.
                  </span>
                  <ErrorText message={errors.scheduled_at} />
                </div>

                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    name="is_featured"
                    defaultChecked={Boolean(values.is_featured)}
                  />
                  <span>
                    Featured article
                    <small>Featured articles are prioritised on the homepage and directory.</small>
                  </span>
                </label>

                <div className="field">
                  <label className="label" htmlFor="article-author">
                    Author name
                  </label>
                  <input
                    className="input"
                    id="article-author"
                    name="author_name"
                    defaultValue={values.author_name}
                    maxLength={120}
                    placeholder="Pharma Careers Editorial Team"
                  />
                  <ErrorText message={errors.author_name} />
                </div>

                <div className="field">
                  <label className="label" htmlFor="article-tags">
                    Tags <span className="optional">(comma separated)</span>
                  </label>
                  <input
                    className="input"
                    id="article-tags"
                    name="tags"
                    defaultValue={values.tags}
                    maxLength={400}
                    placeholder="interviews, QC, resume"
                  />
                  <ErrorText message={errors.tags} />
                </div>
              </div>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <h2>Cover image</h2>
                <p>Optional publicly accessible https image.</p>
              </div>
            </div>
            <div className="admin-panel-body">
              <div className="field">
                <label className="label" htmlFor="article-cover">
                  Cover image URL
                </label>
                <input
                  className="input"
                  id="article-cover"
                  name="cover_image_url"
                  type="url"
                  defaultValue={values.cover_image_url}
                  maxLength={2000}
                  placeholder="https://…"
                />
                <span className="field-hint">
                  Used on article cards and at the top of the article. Leave blank to use the
                  branded placeholder.
                </span>
                <ErrorText message={errors.cover_image_url} />
              </div>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <h2>Preview</h2>
                <p>Preview saves the current draft privately first.</p>
              </div>
            </div>
            <div className="admin-panel-body">
              <button
                type="submit"
                value="preview"
                className="btn btn-secondary"
                onClick={() => setIntent("preview")}
                style={{ width: "100%" }}
                disabled={pending}
              >
                Save &amp; preview
              </button>
              <p className="admin-hint" style={{ marginTop: 8 }}>
                The preview opens in the admin area and is never public.
              </p>
            </div>
          </section>
        </div>
      </div>

      <div className="admin-sticky-actions">
        <button
          className="btn btn-primary"
          type="submit"
          value="publish"
          onClick={() => setIntent("publish")}
          disabled={pending}
        >
          {pending ? "Saving…" : values.status === "published" ? "Save & publish" : "Publish"}
        </button>
        <button
          className="btn btn-secondary"
          type="submit"
          value="draft"
          onClick={() => setIntent("draft")}
          disabled={pending}
        >
          Save draft
        </button>
        <button
          className="btn btn-secondary"
          type="submit"
          value="save"
          onClick={() => setIntent("save")}
          disabled={pending}
        >
          Save changes
        </button>
        {values.status === "published" ? (
          <button
            className="btn btn-ghost"
            type="submit"
            value="archive"
            onClick={() => setIntent("archive")}
            disabled={pending}
          >
            Archive
          </button>
        ) : null}
        <Link href="/admin/articles" className="btn btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
