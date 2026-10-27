import type { Metadata } from "next";
import Link from "next/link";
import { JobForm } from "@/components/job-form";
import { EMPTY_JOB_FORM } from "@/lib/validation";
import { ArrowLeftIcon } from "@/components/icons";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create job" };

export default function NewJobPage() {
  return (
    <>
      <div className="admin-page-head">
        <div>
          <Link href="/admin/jobs" className="link-arrow" style={{ marginBottom: 8 }}>
            <ArrowLeftIcon size={14} /> Back to jobs
          </Link>
          <h1>Create Job</h1>
          <p>Save as a draft first, then publish once the listing is verified.</p>
        </div>
      </div>
      <JobForm initialValues={{ ...EMPTY_JOB_FORM }} />
    </>
  );
}
