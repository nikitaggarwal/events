import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getEmbedding(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.substring(0, 8000),
  });
  return res.data[0].embedding;
}

export async function getEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const batchSize = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map((t) => t.substring(0, 8000));
    const res = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch,
    });
    allEmbeddings.push(...res.data.map((d) => d.embedding));
  }

  return allEmbeddings;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b);
}

function initKMeansPlusPlus(embeddings: number[][], k: number): number[][] {
  const n = embeddings.length;
  const centroids: number[][] = [];

  centroids.push([...embeddings[Math.floor(Math.random() * n)]]);

  for (let c = 1; c < k; c++) {
    const distances = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      for (const centroid of centroids) {
        const d = cosineDistance(embeddings[i], centroid);
        if (d < minDist) minDist = d;
      }
      distances[i] = minDist * minDist;
    }

    let totalDist = 0;
    for (let i = 0; i < n; i++) totalDist += distances[i];

    let r = Math.random() * totalDist;
    let chosen = 0;
    for (let i = 0; i < n; i++) {
      r -= distances[i];
      if (r <= 0) {
        chosen = i;
        break;
      }
    }
    centroids.push([...embeddings[chosen]]);
  }

  return centroids;
}

export function kMeansClusters(
  embeddings: number[][],
  k: number,
  maxIter = 80
): { assignments: number[]; centroids: number[][] } {
  const dim = embeddings[0].length;
  const n = embeddings.length;

  const centroids = initKMeansPlusPlus(embeddings, k);
  let assignments = new Array(n).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    const newAssignments = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let bestSim = -Infinity;
      let bestCluster = 0;
      for (let c = 0; c < k; c++) {
        const sim = cosineSimilarity(embeddings[i], centroids[c]);
        if (sim > bestSim) {
          bestSim = sim;
          bestCluster = c;
        }
      }
      newAssignments[i] = bestCluster;
    }

    let changed = false;
    for (let i = 0; i < n; i++) {
      if (newAssignments[i] !== assignments[i]) {
        changed = true;
        break;
      }
    }
    assignments = newAssignments;
    if (!changed) break;

    for (let c = 0; c < k; c++) {
      const members = embeddings.filter((_, i) => assignments[i] === c);
      if (members.length === 0) continue;
      for (let d = 0; d < dim; d++) {
        centroids[c][d] =
          members.reduce((sum, e) => sum + e[d], 0) / members.length;
      }
    }
  }

  return { assignments, centroids };
}

export async function labelCluster(
  jobTitles: string[],
  jobDescriptions: string[]
): Promise<{ name: string; keywords: string[] }> {
  const sample = jobTitles.slice(0, 20).join("\n");
  const descSample = jobDescriptions
    .slice(0, 8)
    .map((d) => d.substring(0, 300))
    .join("\n---\n");

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You name hiring events for YC startups. You're given job titles and descriptions from a cluster of similar roles.

Your job: name the event based on the DOMAIN or SPECIALTY these roles share — what the person actually does day-to-day. Ignore seniority words like "founding", "senior", "staff", "lead" — most YC jobs say "founding" so it's meaningless as a differentiator.

Focus on the technical domain, industry vertical, or function:
Good: "Backend Infrastructure", "AI/ML Research", "Product Design", "Healthcare Engineering", "Developer Tools", "Sales Development", "Growth Marketing", "Mobile Engineering", "Data Platform", "Robotics", "Customer Success", "DevOps & SRE", "Fintech Engineering", "Security Engineering"
Bad: "Founding Engineers" (says nothing about domain), "Senior & Founding Engineers" (just seniority), "Founding AI & Software Engineers" (too broad, "founding" is noise), "Engineering & Product Development Roles" (vague)

Rules:
- 2-4 words max
- Lead with the domain, NOT seniority
- Be specific: "Computer Vision" not "AI", "Revenue Operations" not "Operations"
- Never start with "Founding" or "Senior"

Return JSON with 'name' and 'keywords' (5-8 specific technical skills shared across these jobs). Only return JSON, no markdown.`,
      },
      {
        role: "user",
        content: `Job titles in this cluster:\n${sample}\n\nSample descriptions:\n${descSample}`,
      },
    ],
    temperature: 0,
  });

  try {
    const content = res.choices[0].message.content || '{"name":"Uncategorized","keywords":[]}';
    return JSON.parse(content);
  } catch {
    return { name: "Uncategorized", keywords: [] };
  }
}

export async function labelDomainCluster(
  companyNames: string[],
  companyDescriptions: string[]
): Promise<{ name: string; keywords: string[] }> {
  const nameSample = companyNames.slice(0, 20).join(", ");
  const descSample = companyDescriptions
    .slice(0, 10)
    .map((d) => d.substring(0, 300))
    .join("\n---\n");

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You label groups of YC startups by their shared industry or domain. You're given company names and descriptions from a cluster of similar companies.

Your job: name the cluster based on the INDUSTRY VERTICAL or DOMAIN these companies operate in.

Focus on what these companies build or the market they serve:
Good: "Healthcare & Biotech", "Developer Infrastructure", "Fintech & Payments", "AI/ML Platform", "Supply Chain & Logistics", "Cybersecurity", "Climate & Energy", "Legal Tech", "Construction Tech", "Education", "E-Commerce & Retail", "Real Estate Tech", "Defense & Aerospace", "HR & Recruiting"
Bad: "YC Startups" (meaningless), "Software Companies" (too generic), "B2B SaaS" (too broad), "Various Tech" (vague)

Rules:
- 2-4 words max
- Focus on the industry vertical or market
- Be specific: "Vertical SaaS for Healthcare" not just "SaaS", "Autonomous Vehicles" not just "AI"
- If the cluster spans multiple related industries, pick the dominant theme

Return JSON with 'name' and 'keywords' (5-8 keywords describing the shared technologies, markets, or business models). Only return JSON, no markdown.`,
      },
      {
        role: "user",
        content: `Companies in this cluster:\n${nameSample}\n\nSample descriptions:\n${descSample}`,
      },
    ],
    temperature: 0,
  });

  try {
    const content = res.choices[0].message.content || '{"name":"Uncategorized","keywords":[]}';
    return JSON.parse(content);
  } catch {
    return { name: "Uncategorized", keywords: [] };
  }
}
