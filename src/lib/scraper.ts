import * as cheerio from "cheerio";

export interface ScrapedJob {
  title: string;
  companyName: string;
  companySlug: string;
  batch: string | null;
  companyDescription: string | null;
  jobUrl: string;
  location: string | null;
  jobType: string | null;
  role: string | null;
  postedAt: string | null;
}

export interface JobDetail {
  title: string;
  salaryMin: number | null;
  salaryMax: number | null;
  equity: string | null;
  location: string | null;
  jobType: string | null;
  role: string | null;
  experience: string | null;
  visa: string | null;
  skills: string[];
  description: string;
  companyName: string;
  companySlug: string;
  batch: string | null;
  companyDescription: string | null;
  founded: string | null;
  teamSize: string | null;
}

const SF_KEYWORDS = [
  "san francisco",
  "sf,",
  "sf bay",
  "bay area",
  "palo alto",
  "mountain view",
  "menlo park",
  "sunnyvale",
  "redwood city",
  "oakland",
  "berkeley",
  "san jose",
  "santa clara",
  "south san francisco",
  "san mateo",
  "cupertino",
  "dogpatch",
  "fremont",
  "emeryville",
  "milpitas",
  "daly city",
  "burlingame",
  "foster city",
  "half moon bay",
  "woodside",
  "los altos",
  "campbell",
  "saratoga",
  "walnut creek",
  "pleasanton",
  "hayward",
  "union city",
  "san carlos",
  "belmont",
  "san bruno",
  "millbrae",
  "stanford",
];

export function isSFBayArea(location: string | null): boolean {
  if (!location) return false;
  const lower = location.toLowerCase();
  return SF_KEYWORDS.some((kw) => lower.includes(kw));
}

interface YCCompany {
  name: string;
  slug: string;
  all_locations: string;
  one_liner: string;
  batch: string;
  isHiring: boolean;
  regions: string[];
}

async function scrapeCompanyJobs(company: YCCompany): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];
  try {
    const pageUrl = `https://www.ycombinator.com/companies/${company.slug}`;
    const pageRes = await fetch(pageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    if (!pageRes.ok) return jobs;
    const html = await pageRes.text();
    const $ = cheerio.load(html);

    $('a[href*="/jobs/"]').each((_, el) => {
      const href = $(el).attr("href") || "";
      if (!href.includes(`/companies/${company.slug}/jobs/`)) return;

      const jobUrl = href.startsWith("http")
        ? href
        : `https://www.ycombinator.com${href}`;

      const jobTitle = $(el).text().trim();
      if (!jobTitle || jobTitle === "View all jobs") return;

      jobs.push({
        title: jobTitle,
        companyName: company.name,
        companySlug: company.slug,
        batch: company.batch || null,
        companyDescription: company.one_liner || null,
        jobUrl,
        location: company.all_locations || null,
        jobType: null,
        role: null,
        postedAt: null,
      });
    });
  } catch {
    // skip failed companies
  }
  return jobs;
}

export async function scrapeFromYCDirectory(): Promise<ScrapedJob[]> {
  const res = await fetch(
    "https://yc-oss.github.io/api/companies/hiring.json"
  );
  const companies: YCCompany[] = await res.json();

  const sfCompanies = companies.filter((c) => {
    const loc = (c.all_locations || "").toLowerCase();
    const regions = (c.regions || []).map((r) => r.toLowerCase());
    return (
      SF_KEYWORDS.some((kw) => loc.includes(kw)) ||
      regions.some((r) => r.includes("san francisco"))
    );
  });

  const allJobs: ScrapedJob[] = [];
  const BATCH_SIZE = 20;

  for (let i = 0; i < sfCompanies.length; i += BATCH_SIZE) {
    const batch = sfCompanies.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(scrapeCompanyJobs));
    for (const jobs of results) {
      allJobs.push(...jobs);
    }
    if (i + BATCH_SIZE < sfCompanies.length) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return allJobs.filter(
    (job, i, arr) => arr.findIndex((j) => j.jobUrl === job.jobUrl) === i
  );
}

async function scrapeWaaSRole(roleSlug: string): Promise<ScrapedJob[]> {
  const jobs: ScrapedJob[] = [];
  try {
    const url = `https://www.workatastartup.com/jobs/l/${roleSlug}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    if (!res.ok) return jobs;
    const html = await res.text();
    const $ = cheerio.load(html);

    $('a[href*="/companies/"][href*="/jobs/"]').each((_, el) => {
      const href = $(el).attr("href");
      if (!href || !href.includes("ycombinator.com")) return;

      const slugMatch = href.match(/\/companies\/([^/]+)\/jobs\/([^/]+)/);
      if (!slugMatch) return;

      const companySlug = slugMatch[1];
      const jobSlugFull = slugMatch[2];
      const titleFromSlug = jobSlugFull
        .replace(/^[a-zA-Z0-9]+-/, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const linkEl = $(`a[href="${href}"], a[href$="${href.split("ycombinator.com")[1]}"]`);
      const jobTitle = linkEl.text().trim() || titleFromSlug;

      jobs.push({
        title: jobTitle,
        companyName: "",
        companySlug,
        batch: null,
        companyDescription: null,
        jobUrl: href.startsWith("http")
          ? href
          : `https://www.ycombinator.com${href}`,
        location: null,
        jobType: null,
        role: roleSlug.replace(/-/g, " "),
        postedAt: null,
      });
    });
  } catch {
    // skip failed role pages
  }
  return jobs;
}

export async function scrapeWaaSListings(): Promise<ScrapedJob[]> {
  const roles = [
    "software-engineer",
    "designer",
    "product-manager",
    "operations",
    "sales-manager",
    "marketing",
    "science",
  ];

  const results = await Promise.all(roles.map(scrapeWaaSRole));
  const allJobs = results.flat();

  return allJobs.filter(
    (job, i, arr) => arr.findIndex((j) => j.jobUrl === job.jobUrl) === i
  );
}

export async function scrapeJobDetail(
  jobUrl: string
): Promise<JobDetail | null> {
  try {
    const res = await fetch(jobUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $("h1").first().text().trim() || "";

    const pageText = $("body").text();

    const companyH2 = $("h2").first().text().trim();
    const companyName = companyH2 || "";

    const slugMatch = jobUrl.match(/\/companies\/([^/]+)/);
    const companySlug = slugMatch ? slugMatch[1] : "";

    let salaryMin: number | null = null;
    let salaryMax: number | null = null;
    let equity: string | null = null;
    const salaryMatch = pageText.match(
      /\$(\d{1,3}(?:,\d{3})*K?)\s*-\s*\$(\d{1,3}(?:,\d{3})*K?)/
    );
    if (salaryMatch) {
      const parse = (s: string) => {
        const n = parseInt(s.replace(/[,$K]/g, ""));
        return s.includes("K") ? n * 1000 : n < 1000 ? n * 1000 : n;
      };
      salaryMin = parse(salaryMatch[1]);
      salaryMax = parse(salaryMatch[2]);
    }
    const equityMatch = pageText.match(/(\d+\.?\d*%\s*-\s*\d+\.?\d*%)/);
    if (equityMatch) equity = equityMatch[1];

    const fieldPatterns: Record<string, RegExp> = {
      jobType: /Job\s*type\s*\n?\s*(Full-time|Part-time|Contract|Intern(?:ship)?)/i,
      role: /Role\s*\n?\s*([\w\s,/&]+?)(?=\s*Experience|\s*Visa|\s*Skills|\s*Connect)/i,
      experience: /Experience\s*\n?\s*([\w+\s()]+?)(?=\s*Visa|\s*Skills|\s*Connect)/i,
      visa: /Visa\s*\n?\s*([\w\s/;]+?)(?=\s*Skills|\s*Connect)/i,
    };

    const fields: Record<string, string | null> = {};
    for (const [key, regex] of Object.entries(fieldPatterns)) {
      const m = pageText.match(regex);
      fields[key] = m ? m[1].trim() : null;
    }

    let location: string | null = null;
    const locMatch = pageText.match(
      /\$[\d,KM]+.*?[•·]\s*([\w\s,./()-]+?)(?=\s*Job\s*type)/i
    );
    if (locMatch) {
      location = locMatch[1].trim();
    }
    if (!location) {
      const locMatch2 = pageText.match(
        /Location\s*\n?\s*([\w\s,./()-]+?)(?=\s*Founders|\s*Similar)/i
      );
      if (locMatch2) location = locMatch2[1].trim();
    }
    if (location && location.length > 80) location = location.substring(0, 80);

    const skills: string[] = [];
    const skillsMatch = pageText.match(
      /Skills\s*\n?\s*([\s\S]*?)(?=Connect directly|Apply to role)/i
    );
    if (skillsMatch) {
      skillsMatch[1]
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1 && s.length < 50 && !s.includes("http"))
        .forEach((s) => skills.push(s));
    }

    let description = "";
    const aboutRole = pageText.match(
      /About the role\s*([\s\S]*?)(?=About\s+\w+\s*\n|Similar Jobs|Founders)/i
    );
    if (aboutRole) {
      description = aboutRole[1].trim();
    } else {
      const whatYoull = pageText.match(
        /(What you['']ll do|What You['']ll Do|Responsibilities)\s*([\s\S]*?)(?=About\s+\w+\s*\n|Similar Jobs|Founders)/i
      );
      if (whatYoull) description = whatYoull[0].trim();
    }
    if (description.length > 5000)
      description = description.substring(0, 5000);

    const batchMatch = pageText.match(/Batch:?\s*([A-Z]\d{2})/);
    const foundedMatch = pageText.match(/Founded:?\s*(\d{4})/);
    const teamMatch = pageText.match(/Team Size:?\s*(\d+)/);

    const metaDesc = $('meta[name="description"]').attr("content") || null;

    return {
      title: title || "",
      salaryMin,
      salaryMax,
      equity,
      location,
      jobType: fields.jobType || null,
      role: fields.role || null,
      experience: fields.experience || null,
      visa: fields.visa || null,
      skills,
      description,
      companyName,
      companySlug,
      batch: batchMatch ? batchMatch[1] : null,
      companyDescription: metaDesc,
      founded: foundedMatch ? foundedMatch[1] : null,
      teamSize: teamMatch ? teamMatch[1] : null,
    };
  } catch (err) {
    console.error(`Failed to scrape ${jobUrl}:`, err);
    return null;
  }
}
