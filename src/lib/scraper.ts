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
  salary: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  equity: string | null;
  location: string | null;
  jobType: string | null;
  role: string | null;
  experience: string | null;
  visa: string | null;
  skills: string[];
  description: string | null;
  companyName: string;
  companySlug: string;
  batch: string | null;
  companyDescription: string | null;
  companyUrl: string | null;
  founded: string | null;
  teamSize: string | null;
  status: string | null;
}

const SF_LOCATIONS = [
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
  "fremont",
  "cupertino",
];

export function isSFBayArea(location: string | null): boolean {
  if (!location) return false;
  const lower = location.toLowerCase();
  return SF_LOCATIONS.some((sf) => lower.includes(sf));
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

  for (const role of roles) {
    const url = `https://www.workatastartup.com/jobs/l/${role}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    $("a[href*='/companies/']").each((_, companyLink) => {
      const companyHref = $(companyLink).attr("href") || "";
      const companyText = $(companyLink).text().trim();

      const batchMatch = companyText.match(/\(([A-Z]\d{2})\)/);
      const batch = batchMatch ? batchMatch[1] : null;

      const descMatch = companyText.match(/•\s*(.+)$/);
      const companyDescription = descMatch ? descMatch[1].trim() : null;

      const nameMatch = companyText.match(/^([^(•]+)/);
      const companyName = nameMatch ? nameMatch[1].trim() : companyText;

      const slugMatch = companyHref.match(/\/companies\/([^/]+)/);
      const companySlug = slugMatch ? slugMatch[1] : "";

      const postedMatch = companyText.match(/\((\d+\s+\w+\s+ago|about\s+.+ago)\)/i);
      const postedAt = postedMatch ? postedMatch[1] : null;

      const nextJobLink = $(companyLink)
        .parent()
        .find('a[href*="/jobs/"]')
        .first();
      if (nextJobLink.length === 0) return;

      const jobHref = nextJobLink.attr("href") || "";
      const jobTitle = nextJobLink.text().trim();

      const parentBlock = $(companyLink).parent();
      const blockText = parentBlock.text();
      const locationMatch = blockText.match(
        /((?:San Francisco|SF|Remote|Mountain View|Palo Alto|Menlo Park|Oakland|San Jose|Santa Clara|Redwood City|Berkeley)[^,\n]*)(?:,\s*[A-Z]{2}(?:,\s*US)?)?/i
      );
      const location = locationMatch ? locationMatch[1].trim() : null;

      const isFulltime = blockText.toLowerCase().includes("fulltime");
      const isIntern = blockText.toLowerCase().includes("intern");
      const jobType = isIntern ? "intern" : isFulltime ? "fulltime" : null;

      const rolePatterns = [
        "Backend",
        "Frontend",
        "Full stack",
        "Engineering manager",
        "DevOps",
        "QA engineer",
        "Robotics",
        "Embedded systems",
        "Data science",
        "Machine learning",
      ];
      let jobRole: string | null = null;
      for (const rp of rolePatterns) {
        if (blockText.includes(rp)) {
          jobRole = rp;
          break;
        }
      }

      allJobs.push({
        title: jobTitle,
        companyName,
        companySlug,
        batch,
        companyDescription,
        jobUrl: jobHref.startsWith("http")
          ? jobHref
          : `https://www.ycombinator.com${jobHref}`,
        location,
        jobType,
        role: jobRole,
        postedAt,
      });
    });
  }

  const uniqueJobs = allJobs.filter(
    (job, index, self) =>
      self.findIndex((j) => j.jobUrl === job.jobUrl) === index
  );

  return uniqueJobs;
}

export async function scrapeJobDetail(jobUrl: string): Promise<JobDetail | null> {
  try {
    const res = await fetch(jobUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $("h1").first().text().trim();

    const salaryText = $("body").text();
    const salaryMatch = salaryText.match(
      /\$(\d{1,3}(?:,\d{3})*K?)\s*-\s*\$(\d{1,3}(?:,\d{3})*K?)/
    );
    let salaryMin: number | null = null;
    let salaryMax: number | null = null;
    let salary: string | null = null;
    if (salaryMatch) {
      salary = salaryMatch[0];
      const parseK = (s: string) => {
        const num = parseInt(s.replace(/[,$K]/g, ""));
        return s.includes("K") ? num * 1000 : num;
      };
      salaryMin = parseK(salaryMatch[1]);
      salaryMax = parseK(salaryMatch[2]);
      if (salaryMin < 1000) salaryMin *= 1000;
      if (salaryMax < 1000) salaryMax *= 1000;
    }

    const equityMatch = salaryText.match(
      /(\d+\.?\d*%\s*-\s*\d+\.?\d*%)/
    );
    const equity = equityMatch ? equityMatch[1] : null;

    const companyNameEl = $('a[href*="/companies/"] h2, [class*="company"] h2').first();
    const companyName = companyNameEl.text().trim() || $("h2").first().text().trim();

    const companyLinkEl = $('a[href*="/companies/"]').first();
    const companyHref = companyLinkEl.attr("href") || "";
    const companySlugMatch = companyHref.match(/\/companies\/([^/]+)/);
    const companySlug = companySlugMatch ? companySlugMatch[1] : "";

    const skills: string[] = [];
    const skillsSection = $("body").text();
    const skillsMatch = skillsSection.match(/Skills\s+([\s\S]*?)(?=Connect|Apply|About)/);
    if (skillsMatch) {
      skillsMatch[1]
        .split(/,|\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length < 50)
        .forEach((s) => skills.push(s));
    }

    let description = "";
    $("h3").each((_, heading) => {
      const headingText = $(heading).text().trim().toLowerCase();
      if (
        headingText.includes("about") ||
        headingText.includes("what you") ||
        headingText.includes("your background") ||
        headingText.includes("strong candidate")
      ) {
        const section = $(heading).parent();
        description += section.text().trim() + "\n\n";
      }
    });
    if (!description) {
      description = $("main").text().trim().substring(0, 3000);
    }

    const locationEl = $("body").text();
    const locationMatch = locationEl.match(
      /(San Francisco[^•\n]*|Mountain View[^•\n]*|Palo Alto[^•\n]*|Remote[^•\n]*)/i
    );
    const location = locationMatch ? locationMatch[1].trim() : null;

    const jobTypeMatch = locationEl.match(/(Full-time|Part-time|Contract|Intern)/i);
    const jobType = jobTypeMatch ? jobTypeMatch[1] : null;

    const roleMatch = locationEl.match(/Role\s+([\w\s,]+?)(?=\n|Experience)/);
    const role = roleMatch ? roleMatch[1].trim() : null;

    const expMatch = locationEl.match(/Experience\s+([\w+\s]+years?)/i);
    const experience = expMatch ? expMatch[1].trim() : null;

    const visaMatch = locationEl.match(/Visa\s+([\w\s/]+?)(?=\n|Skills)/);
    const visa = visaMatch ? visaMatch[1].trim() : null;

    const batchMatch = locationEl.match(/Batch:?\s*([A-Z]\d{2})/);
    const batch = batchMatch ? batchMatch[1] : null;

    const foundedMatch = locationEl.match(/Founded:?\s*(\d{4})/);
    const founded = foundedMatch ? foundedMatch[1] : null;

    const teamMatch = locationEl.match(/Team Size:?\s*(\d+)/);
    const teamSize = teamMatch ? teamMatch[1] : null;

    const statusMatch = locationEl.match(/Status:?\s*(\w+)/);
    const status = statusMatch ? statusMatch[1] : null;

    const descEl = $('meta[name="description"]').attr("content");
    const companyDescription = descEl || null;

    return {
      title,
      salary,
      salaryMin,
      salaryMax,
      equity,
      location,
      jobType,
      role,
      experience,
      visa,
      skills,
      description: description.substring(0, 5000),
      companyName,
      companySlug,
      batch,
      companyDescription,
      companyUrl: companySlug
        ? `https://www.ycombinator.com/companies/${companySlug}`
        : null,
      founded,
      teamSize,
      status,
    };
  } catch (err) {
    console.error(`Failed to scrape ${jobUrl}:`, err);
    return null;
  }
}
