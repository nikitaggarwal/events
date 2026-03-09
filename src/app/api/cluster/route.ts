import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getEmbeddings,
  kMeansClusters,
  labelCluster,
  labelDomainCluster,
} from "@/lib/embeddings";

export const maxDuration = 300;

const BAD_TITLE_PATTERNS = ["404", "not found", "page not found", "access denied"];

async function pruneInvalidJobs() {
  const allJobs = await prisma.job.findMany({ select: { id: true, title: true } });
  const badIds = allJobs
    .filter(
      (j) =>
        !j.title ||
        j.title.length < 3 ||
        BAD_TITLE_PATTERNS.some((p) => j.title.toLowerCase().includes(p))
    )
    .map((j) => j.id);
  if (badIds.length > 0) {
    await prisma.job.deleteMany({ where: { id: { in: badIds } } });
  }
  return badIds.length;
}

const LABEL_CONCURRENCY = 5;
const EMBED_WRITE_BATCH = 50;

async function clusterByRole(k: number) {
  await pruneInvalidJobs();
  const jobs = await prisma.job.findMany({ include: { company: true } });

  if (jobs.length < k) {
    return NextResponse.json(
      { error: `Need at least ${k} jobs to create ${k} clusters. Currently have ${jobs.length}.` },
      { status: 400 }
    );
  }

  const needsEmbedding = jobs.filter((j) => j.embedding.length === 0);
  if (needsEmbedding.length > 0) {
    const textsToEmbed = needsEmbedding.map(
      (j) =>
        `${j.title} ${j.role || ""} ${j.skills.join(" ")} ${
          j.description?.substring(0, 500) || ""
        }`
    );
    const newEmbeddings = await getEmbeddings(textsToEmbed);
    for (let i = 0; i < needsEmbedding.length; i++) {
      needsEmbedding[i].embedding = newEmbeddings[i];
    }
    for (let i = 0; i < needsEmbedding.length; i += EMBED_WRITE_BATCH) {
      const batch = needsEmbedding.slice(i, i + EMBED_WRITE_BATCH);
      await Promise.all(
        batch.map((j, idx) =>
          prisma.job.update({
            where: { id: j.id },
            data: { embedding: newEmbeddings[i + idx] },
          })
        )
      );
    }
  }

  const embeddings = jobs.map((j) => j.embedding);
  const { assignments } = kMeansClusters(embeddings as number[][], k);

  await prisma.event.updateMany({
    where: { cluster: { type: "role" } },
    data: { clusterId: null },
  });
  await prisma.cluster.deleteMany({ where: { type: "role" } });

  const clusterGroups: Map<number, typeof jobs> = new Map();
  for (let i = 0; i < jobs.length; i++) {
    const cIdx = assignments[i];
    if (!clusterGroups.has(cIdx)) clusterGroups.set(cIdx, []);
    clusterGroups.get(cIdx)!.push(jobs[i]);
  }

  const groupEntries = Array.from(clusterGroups.values());

  const labels: { name: string; keywords: string[] }[] = [];
  for (let i = 0; i < groupEntries.length; i += LABEL_CONCURRENCY) {
    const batch = groupEntries.slice(i, i + LABEL_CONCURRENCY);
    const batchLabels = await Promise.all(
      batch.map((groupJobs) => {
        const titles = groupJobs.map((j) => j.title);
        const descriptions = groupJobs
          .filter((j) => j.description)
          .map((j) => j.description!);
        return labelCluster(titles, descriptions);
      })
    );
    labels.push(...batchLabels);
  }

  const clusters = await Promise.all(
    groupEntries.map(async (groupJobs, idx) => {
      const { name, keywords } = labels[idx];
      const uniqueCompanies = new Set(groupJobs.map((j) => j.company.name));

      const cluster = await prisma.cluster.create({
        data: {
          name,
          type: "role",
          keywords,
          jobCount: groupJobs.length,
          companyCount: uniqueCompanies.size,
        },
      });

      await prisma.job.updateMany({
        where: { id: { in: groupJobs.map((j) => j.id) } },
        data: { clusterId: cluster.id },
      });

      return {
        id: cluster.id,
        name,
        keywords,
        jobCount: groupJobs.length,
        companyCount: uniqueCompanies.size,
        topCompanies: Array.from(uniqueCompanies).slice(0, 5),
      };
    })
  );

  return NextResponse.json({ success: true, clusterCount: clusters.length, clusters });
}

async function clusterByDomain(k: number) {
  await pruneInvalidJobs();
  const companies = await prisma.company.findMany({
    include: { jobs: true },
  });

  const companiesWithJobs = companies.filter((c) => c.jobs.length > 0);
  if (companiesWithJobs.length < k) {
    return NextResponse.json(
      { error: `Need at least ${k} companies with jobs. Currently have ${companiesWithJobs.length}.` },
      { status: 400 }
    );
  }

  const needsEmbedding = companiesWithJobs.filter((c) => c.embedding.length === 0);
  if (needsEmbedding.length > 0) {
    const textsToEmbed = needsEmbedding.map(
      (c) => `${c.name} ${c.description?.substring(0, 1000) || ""}`
    );
    const newEmbeddings = await getEmbeddings(textsToEmbed);
    for (let i = 0; i < needsEmbedding.length; i++) {
      needsEmbedding[i].embedding = newEmbeddings[i];
    }
    for (let i = 0; i < needsEmbedding.length; i += EMBED_WRITE_BATCH) {
      const batch = needsEmbedding.slice(i, i + EMBED_WRITE_BATCH);
      await Promise.all(
        batch.map((c, idx) =>
          prisma.company.update({
            where: { id: c.id },
            data: { embedding: newEmbeddings[i + idx] },
          })
        )
      );
    }
  }

  const embeddings = companiesWithJobs.map((c) => c.embedding);
  const { assignments } = kMeansClusters(embeddings as number[][], k);

  await prisma.event.updateMany({
    where: { cluster: { type: "domain" } },
    data: { clusterId: null },
  });
  await prisma.company.updateMany({
    where: { domainClusterId: { not: null } },
    data: { domainClusterId: null },
  });
  await prisma.cluster.deleteMany({ where: { type: "domain" } });

  const groups: Map<number, typeof companiesWithJobs> = new Map();
  for (let i = 0; i < companiesWithJobs.length; i++) {
    const cIdx = assignments[i];
    if (!groups.has(cIdx)) groups.set(cIdx, []);
    groups.get(cIdx)!.push(companiesWithJobs[i]);
  }

  const groupEntries = Array.from(groups.values());

  const labels: { name: string; keywords: string[] }[] = [];
  for (let i = 0; i < groupEntries.length; i += LABEL_CONCURRENCY) {
    const batch = groupEntries.slice(i, i + LABEL_CONCURRENCY);
    const batchLabels = await Promise.all(
      batch.map((groupCompanies) => {
        const names = groupCompanies.map((c) => c.name);
        const descriptions = groupCompanies
          .filter((c) => c.description)
          .map((c) => c.description!);
        return labelDomainCluster(names, descriptions);
      })
    );
    labels.push(...batchLabels);
  }

  const clusters = await Promise.all(
    groupEntries.map(async (groupCompanies, idx) => {
      const { name, keywords } = labels[idx];
      const allGroupJobs = groupCompanies.flatMap((c) => c.jobs);

      const cluster = await prisma.cluster.create({
        data: {
          name,
          type: "domain",
          keywords,
          jobCount: allGroupJobs.length,
          companyCount: groupCompanies.length,
        },
      });

      await prisma.company.updateMany({
        where: { id: { in: groupCompanies.map((c) => c.id) } },
        data: { domainClusterId: cluster.id },
      });

      return {
        id: cluster.id,
        name,
        keywords,
        jobCount: allGroupJobs.length,
        companyCount: groupCompanies.length,
        topCompanies: groupCompanies.map((c) => c.name).slice(0, 5),
      };
    })
  );

  return NextResponse.json({ success: true, clusterCount: clusters.length, clusters });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const type = body.type || "role";
    const k = body.k || 8;

    if (type === "domain") {
      return await clusterByDomain(k);
    }
    return await clusterByRole(k);
  } catch (error) {
    console.error("Cluster error:", error);
    return NextResponse.json(
      { error: "Clustering failed", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") || "role";

  if (type === "domain") {
    const stale = await prisma.cluster.findMany({
      where: { type: "domain", companies: { none: {} } },
      select: { id: true },
    });
    if (stale.length > 0) {
      await prisma.event.updateMany({
        where: { clusterId: { in: stale.map((c) => c.id) } },
        data: { clusterId: null },
      });
      await prisma.cluster.deleteMany({
        where: { id: { in: stale.map((c) => c.id) } },
      });
    }
  }

  const clusters = await prisma.cluster.findMany({
    where: { type },
    select: {
      id: true,
      name: true,
      type: true,
      keywords: true,
      jobCount: true,
      companyCount: true,
    },
    orderBy: { jobCount: "desc" },
  });
  return NextResponse.json(clusters, {
    headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
  });
}
