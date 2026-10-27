import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@/components/icons";
import { JobDetail } from "@/components/job-detail";
import { getPublicJobBySlug } from "@/lib/jobs";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const job = await getPublicJobBySlug(slug);

  if (!job) {
    return { title: "Job not found", robots: { index: false, follow: false } };
  }

  const description = `${job.title} at ${job.company_name} in ${job.city}, ${job.state}. ${job.description}`.slice(
    0,
    160,
  );

  return {
    title: `${job.title} — ${job.company_name}`,
    description,
    alternates: { canonical: `/jobs/${job.slug}` },
    robots: job.is_demo
      ? { index: false, follow: true }
      : { index: true, follow: true },
    openGraph: {
      title: `${job.title} — ${job.company_name}`,
      description,
      type: "article",
      url: `/jobs/${job.slug}`,
    },
  };
}

export default async function JobDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const job = await getPublicJobBySlug(slug);

  if (!job) notFound();

  return (
    <div className="page-shell detail-page">
      <div className="container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/jobs">All Jobs</Link>
            </li>
            <li aria-current="page">{job.title}</li>
          </ol>
        </nav>

        <JobDetail job={job} />

        <p className="back-link-row">
          <Link href="/jobs" className="link-arrow">
            <ArrowLeftIcon size={15} />
            Back to all jobs
          </Link>
        </p>
      </div>
    </div>
  );
}
