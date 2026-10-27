import type { Metadata } from "next";
import { AdminFlash } from "@/components/admin-flash";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PlusIcon } from "@/components/admin-icons";
import {
  createCategoryAction,
  deleteCategoryAction,
  renameCategoryAction,
} from "@/actions/articles";
import { listCategories } from "@/lib/articles";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Categories" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function CategoriesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const categories = listCategories("article");
  const usageRows = getDb()
    .prepare("SELECT category_id, COUNT(*) AS count FROM articles GROUP BY category_id")
    .all() as Array<{ category_id: string | null; count: number }>;
  const usage = new Map(usageRows.map((row) => [row.category_id ?? "", row.count]));

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>Categories</h1>
          <p>Editable article categories used by filters and the article editor.</p>
        </div>
      </div>

      <AdminFlash
        created={first(params.created) === "1"}
        updated={first(params.updated) === "1"}
        deleted={first(params.deleted) === "1"}
        error={first(params.error) || undefined}
      />

      <div className="admin-two-col">
        <section className="admin-panel" aria-labelledby="category-list-heading">
          <div className="admin-panel-head">
            <div>
              <h2 id="category-list-heading">Article categories</h2>
              <p>{categories.length} categories. Renaming updates the public filter label.</p>
            </div>
          </div>
          <div className="admin-panel-body admin-panel-body-flush">
            {categories.length > 0 ? (
              <div className="admin-table-wrap">
                <table className="admin-table" style={{ minWidth: 560 }}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Slug</th>
                      <th>Articles</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category.id}>
                        <td>
                          <form
                            action={renameCategoryAction}
                            className="admin-table-actions"
                            style={{ alignItems: "center" }}
                          >
                            <input type="hidden" name="id" value={category.id} />
                            <input
                              className="input"
                              name="name"
                              defaultValue={category.name}
                              maxLength={100}
                              aria-label={`Rename ${category.name}`}
                              style={{ minHeight: 34, fontSize: 13, maxWidth: 260 }}
                              required
                            />
                            <button className="btn btn-secondary btn-sm" type="submit">
                              Rename
                            </button>
                          </form>
                        </td>
                        <td>
                          <code style={{ fontSize: 11.5 }}>{category.slug}</code>
                        </td>
                        <td>{usage.get(category.id) ?? 0}</td>
                        <td>
                          <form action={deleteCategoryAction}>
                            <input type="hidden" name="id" value={category.id} />
                            <ConfirmSubmitButton
                              message={`Delete the category “${category.name}”? Existing articles will become uncategorised.`}
                            >
                              Delete
                            </ConfirmSubmitButton>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty">
                <strong>No categories</strong>
                <p>Add a category to organise article content.</p>
              </div>
            )}
          </div>
        </section>

        <div className="admin-side-stack">
          <section className="admin-panel" aria-labelledby="add-category-heading">
            <div className="admin-panel-head">
              <div>
                <h2 id="add-category-heading">Add category</h2>
                <p>A URL-friendly slug is generated automatically.</p>
              </div>
            </div>
            <div className="admin-panel-body">
              <form className="admin-form" action={createCategoryAction}>
                <div className="field">
                  <label className="label" htmlFor="category-name">
                    Category name
                  </label>
                  <input
                    className="input"
                    id="category-name"
                    name="name"
                    maxLength={100}
                    placeholder="e.g. Resume Writing"
                    required
                  />
                </div>
                <button className="btn btn-primary" type="submit">
                  <PlusIcon size={15} /> Add category
                </button>
              </form>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-head">
              <div>
                <h2>Deleting categories</h2>
              </div>
            </div>
            <div className="admin-panel-body">
              <p className="admin-hint">
                Deleting a category does not delete its articles. Articles become
                &ldquo;Uncategorised&rdquo; and remain available in the directory.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
