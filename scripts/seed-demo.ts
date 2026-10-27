import { loadEnv } from "./env";
import { getDb } from "../src/lib/db";

loadEnv();

const db = getDb();
const now = new Date();
const isoDaysAgo = (days: number) =>
  new Date(now.getTime() - days * 86_400_000).toISOString();
const dateDaysFromNow = (days: number) =>
  new Date(now.getTime() + days * 86_400_000).toISOString().slice(0, 10);

const jobs = [
  {
    id: "demo-job-qc-analyst",
    slug: "qc-analyst-demo",
    title: "QC Analyst",
    company_name: "Sample Life Sciences Co.",
    department: "Quality Control (QC)",
    city: "Hyderabad",
    state: "Telangana",
    experience_min: 1,
    experience_max: 3,
    employment_type: "Full-time",
    description:
      "This is an illustrative sample vacancy used to demonstrate the Pharma Careers portal. It does not represent a real employer or a verified opening. A QC analyst supports laboratory testing, documentation and quality checks in a pharmaceutical manufacturing environment.",
    responsibilities:
      "Perform routine wet-lab and instrumental analysis\nRecord observations accurately in laboratory notebooks\nFollow approved standard operating procedures\nSupport calibration and routine equipment checks",
    qualifications:
      "B.Pharm, M.Pharm or M.Sc. in a relevant science discipline\nUnderstanding of Good Laboratory Practices\nAttention to detail and accurate documentation",
    skills: "HPLC basics\npH and titration\nGLP documentation\nLaboratory safety",
    application_instructions:
      "This is a demonstration record. No application link is provided and no real vacancy should be inferred.",
    application_url: null,
    daysAgo: 3,
    featured: 1,
  },
  {
    id: "demo-job-formulation-scientist",
    slug: "formulation-scientist-demo",
    title: "Formulation Scientist",
    company_name: "Example Biotech Labs",
    department: "R&D",
    city: "Ahmedabad",
    state: "Gujarat",
    experience_min: 3,
    experience_max: 5,
    employment_type: "Full-time",
    description:
      "This is an illustrative sample vacancy used to demonstrate the Pharma Careers portal. It is not a real opening. The role description shows how a formulation research position could be presented with responsibilities and skills.",
    responsibilities:
      "Support formulation development experiments\nMaintain experiment records and batch documentation\nCoordinate analytical testing with internal teams\nPrepare technical summaries for review",
    qualifications:
      "M.Pharm or equivalent postgraduate qualification\nExperience in pharmaceutical formulation development\nFamiliarity with regulated development documentation",
    skills: "Formulation development\nPreformulation\nTechnical documentation\nData interpretation",
    application_instructions:
      "This is a demonstration record with no real application process.",
    application_url: null,
    daysAgo: 4,
    featured: 0,
  },
  {
    id: "demo-job-production-officer",
    slug: "production-officer-demo",
    title: "Production Officer",
    company_name: "Sample Pharma Works",
    department: "Production",
    city: "Pune",
    state: "Maharashtra",
    experience_min: 2,
    experience_max: 4,
    employment_type: "Full-time",
    description:
      "This is an illustrative sample vacancy used to demonstrate the Pharma Careers portal. It does not describe a live vacancy. The record demonstrates how a production role, shift expectations and documentation duties can be published.",
    responsibilities:
      "Support day-to-day manufacturing activities\nFollow batch manufacturing records\nCoordinate with quality and engineering teams\nMaintain area and equipment documentation",
    qualifications:
      "B.Pharm or relevant engineering/science degree\nExperience in a regulated manufacturing environment\nWillingness to work in shifts",
    skills: "GMP\nBatch documentation\nManufacturing operations\nDeviation reporting",
    application_instructions:
      "Demonstration record only. Do not treat this as an application opportunity.",
    application_url: null,
    daysAgo: 5,
    featured: 0,
  },
  {
    id: "demo-job-clinical-research-associate",
    slug: "clinical-research-associate-demo",
    title: "Clinical Research Associate",
    company_name: "Example Clinical Partners",
    department: "Clinical Research",
    city: "Bengaluru",
    state: "Karnataka",
    experience_min: 2,
    experience_max: 5,
    employment_type: "Full-time",
    description:
      "This is an illustrative sample vacancy used to demonstrate the Pharma Careers portal. It is not a verified opening. It shows the level of detail expected when describing a clinical research role.",
    responsibilities:
      "Support site monitoring activities\nMaintain study documentation and track follow-up actions\nCommunicate with site teams and study coordinators\nFollow study procedures and reporting timelines",
    qualifications:
      "Life-sciences degree or equivalent\nUnderstanding of clinical research processes\nStrong written communication and organisational skills",
    skills: "Clinical research\nSite coordination\nGood Clinical Practice basics\nDocumentation",
    application_instructions:
      "Demonstration record only. No application link is available.",
    application_url: null,
    daysAgo: 6,
    featured: 0,
  },
  {
    id: "demo-job-pharmacovigilance-associate",
    slug: "pharmacovigilance-associate-demo",
    title: "Pharmacovigilance Associate",
    company_name: "Sample Safety Sciences",
    department: "Pharmacovigilance",
    city: "Mumbai",
    state: "Maharashtra",
    experience_min: 0,
    experience_max: 2,
    employment_type: "Full-time",
    description:
      "This is an illustrative sample vacancy used to demonstrate the Pharma Careers portal. It is not a live role. It shows how an entry-level pharmacovigilance opportunity could be structured for candidates exploring the field.",
    responsibilities:
      "Support case intake and documentation activities\nFollow standard workflows for safety information\nMaintain accurate records and timelines\nEscalate queries to the appropriate reviewer",
    qualifications:
      "Pharmacy or life-sciences qualification\nInterest in drug safety and regulatory processes\nCareful, detail-oriented approach",
    skills: "Pharmacovigilance basics\nCase documentation\nAttention to detail\nCommunication",
    application_instructions:
      "Demonstration record only. This is not a real vacancy.",
    application_url: null,
    daysAgo: 7,
    featured: 0,
  },
  {
    id: "demo-job-regulatory-affairs-executive",
    slug: "regulatory-affairs-executive-demo",
    title: "Regulatory Affairs Executive",
    company_name: "Demo Regulatory Services",
    department: "Regulatory Affairs",
    city: "Chennai",
    state: "Tamil Nadu",
    experience_min: 1,
    experience_max: 3,
    employment_type: "Full-time",
    description:
      "This is an illustrative sample vacancy used to demonstrate the Pharma Careers portal. It is not a real opportunity. It demonstrates how a regulatory affairs listing can present document preparation and compliance duties.",
    responsibilities:
      "Support preparation of regulatory submissions\nMaintain document trackers and version control\nCoordinate review cycles with internal teams\nFollow applicable regulatory requirements",
    qualifications:
      "Pharmacy or life-sciences degree\nInterest in regulatory frameworks and documentation\nStrong attention to detail",
    skills: "Regulatory documentation\nReview coordination\nCompliance basics\nRecord keeping",
    application_instructions:
      "Demonstration record only. Do not use as a real application.",
    application_url: null,
    daysAgo: 8,
    featured: 0,
  },
];

const insertJob = db.prepare(
  `INSERT OR IGNORE INTO jobs (
     id, slug, title, company_name, department, city, state,
     experience_min, experience_max, employment_type, salary_range,
     description, responsibilities, qualifications, skills,
     application_instructions, application_url, published_at,
     application_deadline, status, is_featured, is_demo,
     created_by, created_at, updated_at
   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, NULL, ?, ?, 'published', ?, 1, NULL, ?, ?)`,
);

const jobTransaction = db.transaction(() => {
  for (const job of jobs) {
    const published = isoDaysAgo(job.daysAgo);
    insertJob.run(
      job.id,
      job.slug,
      job.title,
      job.company_name,
      job.department,
      job.city,
      job.state,
      job.experience_min,
      job.experience_max,
      job.employment_type,
      job.description,
      job.responsibilities,
      job.qualifications,
      job.skills,
      job.application_instructions,
      published,
      dateDaysFromNow(45),
      job.featured,
      published,
      published,
    );
  }
});
jobTransaction();

const articles = [
  {
    id: "demo-article-qc-interview",
    title: "How to Prepare for a Pharma Quality Control Interview",
    slug: "pharma-quality-control-interview-preparation",
    category_id: "cat-interview-tips",
    excerpt:
      "A practical revision plan covering the laboratory basics, documentation habits and communication skills interviewers commonly explore for QC roles.",
    tags: "QC, interviews, HPLC, GMP",
    featured: 1,
    content: `<h2>Start with the fundamentals</h2>
<p>Quality Control interviews usually test both practical understanding and the discipline required in a regulated laboratory. Revise the purpose of the tests you have performed, not only the steps in a procedure. Be ready to explain why a blank, standard or duplicate sample is used, and how you would record an unexpected result.</p>
<h2>Prepare for documentation questions</h2>
<p>Interviewers often ask how you handle corrections, incomplete records or deviations. Describe what you have actually done: follow the approved procedure, record the event promptly, avoid overwriting data and escalate through the correct channel. If you are early in your career, be clear about what you have been trained on and what you have observed under supervision.</p>
<h2>Build a short technical revision list</h2>
<ul>
<li>Basic chromatography concepts and common instrument checks</li>
<li>pH, titration, moisture and other routine laboratory techniques</li>
<li>Good Laboratory Practice and data-integrity expectations</li>
<li>Calibration, verification and equipment logbooks</li>
<li>How samples move through receipt, testing and review</li>
</ul>
<h2>Practise explaining your experience</h2>
<p>Use concrete examples. Instead of saying that you are detail-oriented, describe a time you noticed a discrepancy and how you handled it. Explain your role honestly, especially when the work was part of a team or completed under supervision.</p>
<blockquote>Good preparation is not about memorising perfect answers. It is about being able to explain your reasoning, your records and your boundaries clearly.</blockquote>
<h2>Questions to ask the employer</h2>
<p>Ask about the laboratory scope, training plan, shift pattern and how documentation is reviewed. These questions help you assess whether the role matches your experience.</p>
<p><em>This is sample editorial content supplied with the demonstration database. It is general career guidance, not an official company announcement.</em></p>`,
  },
  {
    id: "demo-article-pharma-resume",
    title: "Writing a Pharma Resume That Gets Shortlisted",
    slug: "pharma-resume-writing-guide",
    category_id: "cat-job-preparation",
    excerpt:
      "Make your experience easier to assess with a clear summary, relevant technical keywords and evidence-based bullet points.",
    tags: "resume, job preparation, pharmacy careers",
    featured: 0,
    content: `<h2>Lead with relevance</h2>
<p>A recruiter should be able to understand your target role and strongest evidence within the first few lines. Use a short professional summary that names your area, your experience level and the capabilities you can demonstrate.</p>
<h2>Write evidence, not adjectives</h2>
<p>Compare these two statements:</p>
<ul>
<li>&ldquo;Hard-working pharmacy professional with good laboratory skills.&rdquo;</li>
<li>&ldquo;Performed routine pH, titration and moisture testing across approximately 20 batches per week, recording results in approved laboratory formats.&rdquo;</li>
</ul>
<p>The second version gives the reader something concrete to assess. Use numbers only when they are accurate and do not reveal confidential employer information.</p>
<h2>Match the language of the role</h2>
<p>Read the job description carefully and reflect the genuinely relevant terms. A QC role might call for HPLC, GLP, documentation and calibration. A regulatory role might call for dossier preparation, lifecycle management and review coordination. Do not add a keyword unless you can discuss it honestly in an interview.</p>
<h2>Keep the structure simple</h2>
<ol>
<li>Contact details and target role</li>
<li>Short professional summary</li>
<li>Relevant experience, with results and scope</li>
<li>Education and certifications</li>
<li>Technical skills and tools</li>
</ol>
<h2>Check before you send</h2>
<p>Use a consistent date format, a readable font size, a PDF export and a professional file name. Check that links work and that the document is easy to read on a phone.</p>
<p><em>This is sample editorial content for demonstration purposes.</em></p>`,
  },
  {
    id: "demo-article-qc-vs-qa",
    title: "QC vs QA: Understanding the Difference Before You Apply",
    slug: "qc-vs-qa-career-difference",
    category_id: "cat-qc-qa",
    excerpt:
      "Quality Control and Quality Assurance overlap, but they emphasise different kinds of work. Here is how to tell which role fits you.",
    tags: "QC, QA, quality, career planning",
    featured: 0,
    content: `<h2>Two parts of one quality system</h2>
<p>Quality Control (QC) is generally focused on testing and measurement: taking samples, performing analytical tests, checking specifications and recording results. Quality Assurance (QA) is generally focused on the system that governs how work is planned, documented, reviewed and improved.</p>
<h2>What the day-to-day work can look like</h2>
<h3>Quality Control</h3>
<ul>
<li>Laboratory testing and instrument handling</li>
<li>Sample preparation and result recording</li>
<li>Calibration, verification and laboratory documentation</li>
<li>Investigating out-of-specification or unexpected results</li>
</ul>
<h3>Quality Assurance</h3>
<ul>
<li>Batch record review and documentation control</li>
<li>Procedure and training oversight</li>
<li>Deviation, change control and CAPA coordination</li>
<li>Audit preparation and compliance follow-up</li>
</ul>
<h2>How to choose</h2>
<p>Think about the kind of problem you enjoy solving. If you like hands-on laboratory work and direct measurement, QC may be a better starting point. If you enjoy process design, documentation systems and cross-team follow-up, QA may fit better. Many professionals move between the two areas during their careers.</p>
<h2>Be accurate in interviews</h2>
<p>Do not describe a role as broader than it was. If you supported a review process rather than owning it, say so. Interviewers value an accurate account of your contribution and a clear understanding of the surrounding quality system.</p>
<p><em>This is sample editorial content for demonstration purposes and is not legal or regulatory advice.</em></p>`,
  },
];

const insertArticle = db.prepare(
  `INSERT OR IGNORE INTO articles (
     id, title, slug, excerpt, content, cover_image_url, category_id,
     author_name, tags, seo_title, seo_description, status, is_featured,
     is_demo, scheduled_at, published_at, created_by, created_at, updated_at
   ) VALUES (?, ?, ?, ?, ?, NULL, ?, 'Pharma Careers Editorial Team', ?, NULL, NULL,
             'published', ?, 1, NULL, ?, NULL, ?, ?)`,
);

const articleTransaction = db.transaction(() => {
  articles.forEach((article, index) => {
    const published = isoDaysAgo(index + 1);
    insertArticle.run(
      article.id,
      article.title,
      article.slug,
      article.excerpt,
      article.content,
      article.category_id,
      article.tags,
      article.featured,
      published,
      published,
      published,
    );
  });
});
articleTransaction();

const jobCount = (db.prepare("SELECT COUNT(*) AS count FROM jobs WHERE is_demo = 1").get() as { count: number }).count;
const articleCount = (db.prepare("SELECT COUNT(*) AS count FROM articles WHERE is_demo = 1").get() as { count: number }).count;

console.log(`Demo data ready: ${jobCount} demo jobs and ${articleCount} demo articles.`);
console.log("Demo records are clearly labelled in the public interface.");
