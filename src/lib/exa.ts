import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY);

export interface SourcedCandidate {
  name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  profileUrl: string;
  highlights: string | null;
  source: string;
}

export async function sourceCandidates(
  query: string,
  options?: {
    numResults?: number;
    category?: "company" | "research paper" | "news" | "pdf" | "tweet" | "personal site" | "financial report" | "people";
  }
): Promise<SourcedCandidate[]> {
  const results = await exa.searchAndContents(query, {
    type: "neural",
    numResults: options?.numResults || 20,
    category: options?.category || "people",
    text: { maxCharacters: 500 },
    highlights: { numSentences: 2 },
  });

  return results.results.map((r) => {
    const titleMatch = r.title?.match(/^(.+?)\s*[-–—|]\s*(.+?)\s*[-–—|]\s*(.+)/);
    const simpleMatch = r.title?.match(/^(.+?)\s*[-–—|]\s*(.+)/);

    let name = r.title || "Unknown";
    let title: string | null = null;
    let company: string | null = null;

    if (titleMatch) {
      name = titleMatch[1].trim();
      title = titleMatch[2].trim();
      company = titleMatch[3].trim();
    } else if (simpleMatch) {
      name = simpleMatch[1].trim();
      title = simpleMatch[2].trim();
    }

    return {
      name,
      title,
      company,
      location: null,
      profileUrl: r.url,
      highlights:
        r.highlights?.join(" ") || r.text?.substring(0, 300) || null,
      source: "exa",
    };
  });
}

export async function sourceCandidatesForCluster(
  clusterName: string,
  keywords: string[],
  jobTitles: string[],
  location = "San Francisco Bay Area"
): Promise<SourcedCandidate[]> {
  const sampleTitles = jobTitles.slice(0, 3).join(", ");
  const keywordStr = keywords.slice(0, 5).join(", ");

  const query = `${clusterName} engineer or developer in ${location} with experience in ${keywordStr}, looking for roles like ${sampleTitles} at startups`;

  return sourceCandidates(query, {
    numResults: 25,
    category: "people",
  });
}
