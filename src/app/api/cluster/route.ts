import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEmbeddings, kMeansClusters, labelCluster } from "@/lib/embeddings";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const k = body.k || 8;

    const jobs = await prisma.job.findMany({
      include: { company: true },
    });

    if (jobs.length < k) {
      return NextResponse.json(
        { error: `Need at least ${k} jobs to create ${k} clusters. Currently have ${jobs.length}.` },
        { status: 400 }
      );
    }

    const jobTexts = jobs.map(
      (j) =>
        `${j.title} ${j.role || ""} ${j.skills.join(" ")} ${
          j.description?.substring(0, 500) || ""
        }`
    );

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
        await prisma.job.update({
          where: { id: needsEmbedding[i].id },
          data: { embedding: newEmbeddings[i] },
        });
        needsEmbedding[i].embedding = newEmbeddings[i];
      }
    }

    const allJobs = await prisma.job.findMany({ include: { company: true } });
    const embeddings = allJobs.map((j) => j.embedding);

    const { assignments } = kMeansClusters(embeddings as number[][], k);

    await prisma.cluster.deleteMany();

    const clusterGroups: Map<number, typeof allJobs> = new Map();
    for (let i = 0; i < allJobs.length; i++) {
      const cIdx = assignments[i];
      if (!clusterGroups.has(cIdx)) clusterGroups.set(cIdx, []);
      clusterGroups.get(cIdx)!.push(allJobs[i]);
    }

    const clusters = [];
    for (const [, groupJobs] of clusterGroups) {
      const titles = groupJobs.map((j) => j.title);
      const descriptions = groupJobs
        .filter((j) => j.description)
        .map((j) => j.description!);

      const { name, keywords } = await labelCluster(titles, descriptions);

      const uniqueCompanies = new Set(groupJobs.map((j) => j.company.name));

      const cluster = await prisma.cluster.create({
        data: {
          name,
          keywords,
          jobCount: groupJobs.length,
          companyCount: uniqueCompanies.size,
        },
      });

      await prisma.job.updateMany({
        where: { id: { in: groupJobs.map((j) => j.id) } },
        data: { clusterId: cluster.id },
      });

      clusters.push({
        id: cluster.id,
        name,
        keywords,
        jobCount: groupJobs.length,
        companyCount: uniqueCompanies.size,
        topCompanies: Array.from(uniqueCompanies).slice(0, 5),
      });
    }

    return NextResponse.json({
      success: true,
      clusterCount: clusters.length,
      clusters,
    });
  } catch (error) {
    console.error("Cluster error:", error);
    return NextResponse.json(
      { error: "Clustering failed", details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  const clusters = await prisma.cluster.findMany({
    select: {
      id: true,
      name: true,
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
