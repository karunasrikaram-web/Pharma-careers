import type { Metadata } from "next";
import Link from "next/link";
import { ArticleEditor } from "@/components/article-editor";
import { ArrowLeftIcon } from "@/components/icons";
import { listCategories } from "@/lib/articles";
import { EMPTY_ARTICLE_FORM } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create article" };

export default async function NewArticlePage() {
  const categories = await listCategories("article");

  return (
    <>
      <div className="admin-page-head">
        <div>
          <Link href="/admin/articles" className="link-arrow" style={{ marginBottom: 8 }}>
            <ArrowLeftIcon size={14} /> Back to articles
          </Link>
          <h1>Create Article</h1>
          <p>
            Write useful, accurate editorial content. Save as a draft, preview, then publish.
          </p>
        </div>
      </div>
      <ArticleEditor initialValues={{ ...EMPTY_ARTICLE_FORM }} categories={categories} />
    </>
  );
}
