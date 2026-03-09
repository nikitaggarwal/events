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
  "sf",
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
];

export function isSFBayArea(location: string | null): boolean {
  if (!location) return false;
  const lower = location.toLowerCase();
  return SF_KEYWORDS.some((kw) => lower.includes(kw));
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

  const allJobs: ScrapedJob[] = [];

  for (const roleSlug of roles) {
    const url = `https://www.workatastartup.com/jobs/l/${roleSlug}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const jobLinks: string[] = [];
    $('a[href*="/companies/"][href*="/jobs/"]').each((_, el) => {
      const href = $(el).attr("href");
      if (href && href.includes("ycombinator.com")) {
        jobLinks.push(href);
      }
    });

    for (const jobUrl of jobLinks) {
      const slugMatch = jobUrl.match(
        /\/companies\/([^/]+)\/jobs\/([^/]+)/
      );
      if (!slugMatch) continue;

      const companySlug = slugMatch[1];
      const jobSlugFull = slugMatch[2];
      const titleFromSlug = jobSlugFull
        .replace(/^[a-zA-Z0-9]+-/, "")
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const linkEl = $(`a[href="${jobUrl}"], a[href$="${jobUrl.split("ycombinator.com")[1]}"]`);
      const jobTitle = linkEl.text().trim() || titleFromSlug;

      allJobs.push({
        title: jobTitle,
        companyName: "",
        companySlug,
        batch: null,
        companyDescription: null,
        jobUrl: jobUrl.startsWith("http")
          ? jobUrl
          : `https://www.ycombinator.com${jobUrl}`,
        location: null,
        jobType: null,
        role: roleSlug.replace(/-/g, " "),
        postedAt: null,
      });
    }
  }

  const unique = allJobs.filter(
    (job, i, arr) => arr.findIndex((j) => j.jobUrl === job.jobUrl) === i
  );

  return unique;
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
