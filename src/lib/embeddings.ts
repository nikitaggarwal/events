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

export function kMeansClusters(
  embeddings: number[][],
  k: number,
  maxIter = 50
): { assignments: number[]; centroids: number[][] } {
  const dim = embeddings[0].length;
  const n = embeddings.length;

  const centroids: number[][] = [];
  const used = new Set<number>();
  for (let i = 0; i < k; i++) {
    let idx: number;
    do {
      idx = Math.floor(Math.random() * n);
    } while (used.has(idx));
    used.add(idx);
    centroids.push([...embeddings[idx]]);
  }

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
  const sample = jobTitles.slice(0, 10).join("\n");
  const descSample = jobDescriptions
    .slice(0, 5)
    .map((d) => d.substring(0, 200))
    .join("\n---\n");

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You label clusters of job postings. Return a JSON object with 'name' (a short 2-4 word theme like 'Backend Infrastructure' or 'AI/ML Engineering' or 'Founding Full-Stack') and 'keywords' (an array of 5-8 relevant keywords). Only return the JSON, no markdown.",
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
