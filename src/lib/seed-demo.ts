import type { PrismaClient } from "@/generated/prisma/client";

type ClusterType = "role" | "domain";

interface EventSpec {
  name: string;
  status: "draft" | "planning" | "active" | "completed";
  daysFromToday: number;
  clusterType: ClusterType;
  clusterNameHints: string[];
  /** Only use a domain cluster if name/keywords clearly indicate robotics / autonomy */
  strictRoboticsDomain?: boolean;
}

/** Demo ops UX: three completed events; others active / planning / draft. */
const EVENT_SPECS: EventSpec[] = [
  { name: "Backend & Platform Engineering Fair", status: "completed", daysFromToday: -28, clusterType: "role", clusterNameHints: ["Backend", "Platform", "Infrastructure"] },
  { name: "Infrastructure & Reliability Hiring Night", status: "completed", daysFromToday: -48, clusterType: "role", clusterNameHints: ["Infrastructure", "Cloud", "Reliability", "SRE"] },
  { name: "Applied ML & Research Recruiting Night", status: "completed", daysFromToday: -58, clusterType: "role", clusterNameHints: ["Applied AI", "Machine Learning", "Research"] },
  { name: "Principal & Staff IC Social", status: "active", daysFromToday: -52, clusterType: "role", clusterNameHints: ["Staff Engineer", "Principal", "Distinguished", "Tech Lead", "Engineering Lead"] },
  { name: "Data Platform & Analytics Engineering Night", status: "active", daysFromToday: -44, clusterType: "role", clusterNameHints: ["Data Platform", "Analytics", "Data Engineering", "Warehouse"] },
  { name: "Frontend & Product UI Social", status: "planning", daysFromToday: -41, clusterType: "role", clusterNameHints: ["Frontend", "Design Systems", "React", "Web"] },
  { name: "Full-Stack Product Engineers Meetup", status: "active", daysFromToday: -22, clusterType: "role", clusterNameHints: ["Full-Stack", "Full Stack"] },
  { name: "Developer Experience & Tooling Summit", status: "planning", daysFromToday: -36, clusterType: "domain", clusterNameHints: ["Developer Tools", "DevTools"] },
  { name: "Security & Platform Hardening Showcase", status: "planning", daysFromToday: -33, clusterType: "role", clusterNameHints: ["Security", "Infrastructure", "Platform"] },
  { name: "Robotics & Autonomy Company Night", status: "active", daysFromToday: -18, clusterType: "domain", clusterNameHints: [], strictRoboticsDomain: true },
  { name: "FinTech & Banking Infra Night", status: "active", daysFromToday: -3, clusterType: "domain", clusterNameHints: ["FinTech", "Financial", "Banking"] },
  { name: "iOS & Mobile Craft Night", status: "planning", daysFromToday: 18, clusterType: "role", clusterNameHints: ["iOS", "Mobile", "Android"] },
  { name: "Growth & Lifecycle Marketing Mixer", status: "planning", daysFromToday: 21, clusterType: "role", clusterNameHints: ["Growth", "Marketing", "Lifecycle"] },
  { name: "Healthcare & Bio Recruiting Hour", status: "planning", daysFromToday: 14, clusterType: "domain", clusterNameHints: ["Health", "Bio", "Medical"] },
  { name: "Enterprise Sales & Solutions Night", status: "draft", daysFromToday: 40, clusterType: "role", clusterNameHints: ["Enterprise Sales", "Sales", "Account"] },
  { name: "Observability & Production Engineering Lab", status: "draft", daysFromToday: 32, clusterType: "role", clusterNameHints: ["Observability", "SRE", "Infrastructure"] },
];

/** ~20 sourced candidates per demo event; must be ≥ DEMO_CANDIDATES_PER_EVENT unique rows. */
const DEMO_CANDIDATES_PER_EVENT = 20;

const DEMO_PEOPLE: {
  name: string;
  title: string;
  company: string;
  location: string;
  linkedinUrl: string;
  highlights: string;
}[] = [
  {
    name: "Satya Nadella",
    title: "Chairman and CEO",
    company: "Microsoft",
    location: "Seattle, WA",
    linkedinUrl: "https://www.linkedin.com/in/satyanadella/",
    highlights: "Cloud platform, developer tools, large-scale org leadership.",
  },
  {
    name: "Sundar Pichai",
    title: "CEO",
    company: "Google",
    location: "Mountain View, CA",
    linkedinUrl: "https://www.linkedin.com/in/sundarpichai/",
    highlights: "Consumer products, AI strategy, cross-functional leadership.",
  },
  {
    name: "Reid Hoffman",
    title: "Partner",
    company: "Greylock Partners",
    location: "San Francisco Bay Area",
    linkedinUrl: "https://www.linkedin.com/in/reidhoffman/",
    highlights: "Networks, marketplaces, founder coaching, board experience.",
  },
  {
    name: "Andrew Ng",
    title: "Founder",
    company: "DeepLearning.AI",
    location: "Palo Alto, CA",
    linkedinUrl: "https://www.linkedin.com/in/andrewyng/",
    highlights: "ML education, applied AI, research to production.",
  },
  {
    name: "Jeff Weiner",
    title: "Executive Chairman",
    company: "LinkedIn",
    location: "Saratoga, CA",
    linkedinUrl: "https://www.linkedin.com/in/jeffweiner08/",
    highlights: "Scaled consumer SaaS, compassionate management systems.",
  },
  {
    name: "DHH",
    title: "Creator of Ruby on Rails",
    company: "37signals",
    location: "Malibu, CA",
    linkedinUrl: "https://www.linkedin.com/in/dhh/",
    highlights: "Full-stack frameworks, opinionated product craft, small teams.",
  },
  {
    name: "Jacob Kaplan-Moss",
    title: "Software Consultant",
    company: "Self-employed",
    location: "Lawrence, KS",
    linkedinUrl: "https://www.linkedin.com/in/jacobian/",
    highlights: "Django, security-minded web development, engineering management.",
  },
  {
    name: "Guillermo Rauch",
    title: "CEO",
    company: "Vercel",
    location: "San Francisco, CA",
    linkedinUrl: "https://www.linkedin.com/in/rauchg/",
    highlights: "Frontend platform, React ecosystem, DX at scale.",
  },
  {
    name: "Charity Majors",
    title: "CTO",
    company: "Honeycomb",
    location: "San Francisco, CA",
    linkedinUrl: "https://www.linkedin.com/in/charity-majors/",
    highlights: "Observability, SRE culture, on-call and incident practices.",
  },
  {
    name: "Kelsey Hightower",
    title: "Principal Engineer",
    company: "Google Cloud",
    location: "United States",
    linkedinUrl: "https://www.linkedin.com/in/kelsey-hightower-849b342b1/",
    highlights: "Kubernetes, cloud-native storytelling, developer advocacy.",
  },
  {
    name: "Sarah Drasner",
    title: "Director of Engineering",
    company: "Google",
    location: "San Francisco, CA",
    linkedinUrl: "https://www.linkedin.com/in/sarahdrasner/",
    highlights: "Web animation, Vue/React, engineering leadership.",
  },
  {
    name: "Kent C. Dodds",
    title: "Software Engineer, Educator",
    company: "EpicWeb.dev",
    location: "Utah, United States",
    linkedinUrl: "https://www.linkedin.com/in/kentcdodds/",
    highlights: "React, testing, teaching, full-stack product quality.",
  },
  {
    name: "Nicole Forsgren",
    title: "CEO",
    company: "DX (acquired)",
    location: "Boulder, CO",
    linkedinUrl: "https://www.linkedin.com/in/nicolefv/",
    highlights: "Developer productivity research, DORA metrics, org transformation.",
  },
  {
    name: "Martin Kleppmann",
    title: "Author & Researcher",
    company: "University of Cambridge",
    location: "Cambridge, UK",
    linkedinUrl: "https://www.linkedin.com/in/martinkleppmann/",
    highlights: "Distributed systems, stream processing, data infrastructure.",
  },
  {
    name: "Tanya Reilly",
    title: "Principal Engineer",
    company: "Squarespace",
    location: "New York, NY",
    linkedinUrl: "https://www.linkedin.com/in/tanya-reilly/",
    highlights: "Staff-plus engineering, on-call, incremental infrastructure.",
  },
  {
    name: "Simon Willison",
    title: "Co-founder",
    company: "Datasette",
    location: "California",
    linkedinUrl: "https://www.linkedin.com/in/simonwillison/",
    highlights: "SQL, Python, LLMs, open-source data tooling.",
  },
  {
    name: "Scott Hanselman",
    title: "VP of Developer Community",
    company: "Microsoft",
    location: "Portland, OR",
    linkedinUrl: "https://www.linkedin.com/in/shanselman/",
    highlights: ".NET, Azure, developer education, podcasting.",
  },
  {
    name: "Jessie Frazelle",
    title: "Engineer",
    company: "Independent",
    location: "United States",
    linkedinUrl: "https://www.linkedin.com/in/jessfraz/",
    highlights: "Containers, Linux kernel, open-source systems.",
  },
  {
    name: "David Fowler",
    title: "Distinguished Engineer",
    company: "Microsoft",
    location: "United States",
    linkedinUrl: "https://www.linkedin.com/in/davidfowl/",
    highlights: ".NET, ASP.NET Core, real-time systems.",
  },
  {
    name: "Werner Vogels",
    title: "VP & CTO",
    company: "Amazon",
    location: "Seattle, WA",
    linkedinUrl: "https://www.linkedin.com/in/wernervogels/",
    highlights: "Large-scale distributed systems, AWS architecture.",
  },
  {
    name: "Martin Fowler",
    title: "Chief Scientist",
    company: "Thoughtworks",
    location: "Boston, MA",
    linkedinUrl: "https://www.linkedin.com/in/martin-fowler-893a45/",
    highlights: "Refactoring, domain-driven design, agile architecture.",
  },
];

const APPLICANT_POOL: {
  name: string;
  email: string;
  linkedinUrl: string;
  skills: string[];
  interests: string;
}[] = [
  {
    name: "Fei-Fei Li",
    email: "demo.applicant.feil@example.com",
    linkedinUrl: "https://www.linkedin.com/in/fei-fei-li-4541247/",
    skills: ["Computer Vision", "ML", "Research", "AI ethics"],
    interests: "Robotics perception + responsible AI roles at early-stage startups.",
  },
  {
    name: "Yann LeCun",
    email: "demo.applicant.yann@example.com",
    linkedinUrl: "https://www.linkedin.com/in/yann-lecun/",
    skills: ["Deep Learning", "PyTorch", "Research"],
    interests: "Chief scientist or distinguished engineer roles; NYC or remote.",
  },
  {
    name: "Demis Hassabis",
    email: "demo.applicant.demis@example.com",
    linkedinUrl: "https://www.linkedin.com/in/demishassabis/",
    skills: ["Reinforcement Learning", "Research leadership", "Product 0→1"],
    interests: "Applied research teams building general intelligence tools.",
  },
  {
    name: "Pieter Abbeel",
    email: "demo.applicant.pieter@example.com",
    linkedinUrl: "https://www.linkedin.com/in/pieterabbeel/",
    skills: ["Robotics", "RL", "Python", "CUDA"],
    interests: "Robotics and autonomy startups; hiring events for hardware-software teams.",
  },
  {
    name: "Rodney Brooks",
    email: "demo.applicant.rodney@example.com",
    linkedinUrl: "https://www.linkedin.com/in/rodney-brooks-1a137517/",
    skills: ["Robotics", "Hardware", "Startups"],
    interests: "CTO or advisory roles in industrial robotics.",
  },
  {
    name: "Cassie Kozyrkov",
    email: "demo.applicant.cassie@example.com",
    linkedinUrl: "https://www.linkedin.com/in/kozyrkov/",
    skills: ["Decision Science", "ML", "Analytics", "Leadership"],
    interests: "Head of Data Science roles; strong storytelling to execs.",
  },
];

type ClusterRow = { id: string; name: string; keywords: string[] };

function clusterMatchesHint(c: ClusterRow, h: string): boolean {
  const norm = (s: string) => s.toLowerCase();
  if (norm(c.name).includes(h)) return true;
  if (h.length < 3) return false;
  return c.keywords.some((kw) => norm(kw).includes(h));
}

function findRoboticsDomainCluster(clusters: ClusterRow[]): ClusterRow | undefined {
  return clusters.find((c) => {
    const text = [c.name, ...c.keywords].join(" ").toLowerCase();
    if (text.includes("robotics")) return true;
    if (/\brobots?\b/.test(text)) return true;
    if (text.includes("autonomous") || text.includes("autonomy")) return true;
    if (text.includes("drone")) return true;
    return false;
  });
}

async function removeLegacyRobotFightClubEvent(prisma: PrismaClient): Promise<number> {
  const doomed = await prisma.event.findMany({ where: { name: "Robot Fight Club" }, select: { id: true } });
  for (const { id } of doomed) {
    await prisma.founderInteraction.deleteMany({ where: { eventId: id } });
    await prisma.candidate.deleteMany({ where: { eventId: id } });
    await prisma.match.deleteMany({ where: { eventId: id } });
    await prisma.applicantCompanyInterest.deleteMany({ where: { eventId: id } });
    await prisma.founderApplicantInterest.deleteMany({ where: { eventId: id } });
    await prisma.event.delete({ where: { id } });
  }
  return doomed.length;
}

function findCluster(clusters: ClusterRow[], hints: string[]): ClusterRow | undefined {
  const norm = (s: string) => s.toLowerCase();
  for (const hint of hints) {
    const h = norm(hint);
    if (h.length < 2) continue;
    const hit = clusters.find((c) => clusterMatchesHint(c, h));
    if (hit) return hit;
  }
  return undefined;
}

function eventDateOffset(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

type Funnel = {
  contacted: boolean;
  rsvp: boolean;
  attended: boolean;
  starred: boolean;
  spoke: boolean;
  followUp: boolean;
  interviewed: boolean;
  offered: boolean;
  hired: boolean;
  rating: number | null;
  notes: string | null;
};

const NOTE = "Demo seed interaction — replace with real notes.";

function inviteStatusFromFunnel(f: Funnel): string {
  if (f.attended) return "attended";
  if (f.rsvp) return "rsvp";
  if (f.contacted) return "contacted";
  return "not_contacted";
}

/**
 * Index 0 = strongest lead (highest fit). Nested funnel: each stage is a subset of the prior.
 * Attended count ≈ 50% of contacted (not of sourced).
 */
function funnelForCandidateIndex(
  i: number,
  total: number,
  eventStatus: EventSpec["status"],
): Funnel {
  const base: Funnel = {
    contacted: false,
    rsvp: false,
    attended: false,
    starred: false,
    spoke: false,
    followUp: false,
    interviewed: false,
    offered: false,
    hired: false,
    rating: null,
    notes: null,
  };

  if (total <= 0) return base;

  if (eventStatus === "draft") {
    const cN = Math.ceil(total * 0.5);
    const rN = Math.ceil(total * 0.25);
    if (i < cN) base.contacted = true;
    if (i < rN) base.rsvp = true;
    return base;
  }

  if (eventStatus === "planning") {
    const cN = Math.ceil(total * 0.85);
    const rN = Math.ceil(total * 0.6);
    const aN = Math.ceil(total * 0.35);
    if (i < cN) base.contacted = true;
    if (i < rN) base.rsvp = true;
    if (i < aN) base.attended = true;
    return base;
  }

  const contactedN = Math.ceil(total * 0.9);
  const rsvpN = Math.ceil(total * 0.7);
  const attendedN = Math.max(1, Math.floor(contactedN * 0.5));
  const starredN = Math.max(1, Math.ceil(attendedN * 0.55));
  const spokeN = Math.max(1, Math.ceil(starredN * 0.55));
  const followN = Math.max(1, Math.ceil(spokeN * 0.55));

  if (i < contactedN) base.contacted = true;
  if (i < rsvpN) base.rsvp = true;
  if (i < attendedN) base.attended = true;
  if (i < starredN) base.starred = true;
  if (i < spokeN) {
    base.spoke = true;
    base.rating = 4;
    base.notes = NOTE;
  }
  if (i < followN) base.followUp = true;

  if (eventStatus === "completed") {
    if (i < 2) base.interviewed = true;
    if (i < 1) base.offered = true;
    if (i < 1) base.hired = true;
  } else if (eventStatus === "active") {
    if (i < 2) base.interviewed = true;
    if (i < 1) base.offered = true;
  }

  return base;
}

/**
 * Seed demo events, candidates, funnel interactions, and applicants (no Exa).
 * Pass the shared Prisma client (Neon adapter) from the app or CLI.
 */
export async function runSeedDemo(prisma: PrismaClient): Promise<{ results: string[] }> {
  const results: string[] = [];

  const removedRfc = await removeLegacyRobotFightClubEvent(prisma);
  if (removedRfc > 0) {
    results.push(`Removed legacy event "Robot Fight Club" (${removedRfc})`);
  }

  const [roleClusters, domainClusters] = await Promise.all([
    prisma.cluster.findMany({ where: { type: "role" }, select: { id: true, name: true, keywords: true } }),
    prisma.cluster.findMany({ where: { type: "domain" }, select: { id: true, name: true, keywords: true } }),
  ]);

  const demoApplicantEmails = new Set(APPLICANT_POOL.map((a) => a.email));

  for (const spec of EVENT_SPECS) {
    let cluster: ClusterRow | undefined;
    if (spec.strictRoboticsDomain) {
      cluster = findRoboticsDomainCluster(domainClusters);
      if (!cluster) {
        results.push(`SKIP "${spec.name}": no robotics / autonomy domain cluster in the database`);
        continue;
      }
    } else {
      const pool = spec.clusterType === "role" ? roleClusters : domainClusters;
      cluster = findCluster(pool, spec.clusterNameHints);
      if (!cluster) {
        results.push(`SKIP "${spec.name}": no cluster for hints [${spec.clusterNameHints.join(", ")}]`);
        continue;
      }
    }

    let event = await prisma.event.findFirst({ where: { name: spec.name } });
    if (!event) {
      event = await prisma.event.create({
        data: {
          name: spec.name,
          status: spec.status,
          date: eventDateOffset(spec.daysFromToday),
          location: "YC Campus, Dogpatch SF",
          description: "Seeded by seed-demo for local UI review.",
          clusterId: cluster.id,
        },
      });
      results.push(`CREATED event "${spec.name}" (${spec.status}) → cluster "${cluster.name}"`);
    } else {
      results.push(`EXISTS "${spec.name}" — refreshing seed-demo candidates & interactions`);
    }

    await prisma.event.update({
      where: { id: event.id },
      data: { status: spec.status, date: eventDateOffset(spec.daysFromToday) },
    });

    await prisma.founderInteraction.deleteMany({ where: { eventId: event.id } });
    await prisma.candidate.deleteMany({ where: { eventId: event.id, source: "seed-demo" } });

    const rows = Array.from({ length: DEMO_CANDIDATES_PER_EVENT }, (_, i) => {
      const p = DEMO_PEOPLE[i % DEMO_PEOPLE.length]!;
      const f = funnelForCandidateIndex(i, DEMO_CANDIDATES_PER_EVENT, spec.status);
      return {
        name: p.name,
        title: p.title,
        company: p.company,
        location: p.location,
        linkedinUrl: p.linkedinUrl,
        highlights: p.highlights,
        profileUrl: p.linkedinUrl,
        source: "seed-demo",
        fitScore: 0.88 - i * 0.018,
        fitReason: "Keyword overlap with cluster theme (demo).",
        inviteStatus: inviteStatusFromFunnel(f),
        eventId: event.id,
        experience: {
          current: { title: p.title, company: p.company, years: "present" },
        } as object,
      };
    });
    await prisma.candidate.createMany({ data: rows });
    results.push(`  + ${rows.length} sourced candidates (demo funnel)`);

    const candidates = await prisma.candidate.findMany({
      where: { eventId: event.id },
      select: { id: true },
      orderBy: { fitScore: "desc" },
    });

    let companyIds: string[] = [];
    if (spec.clusterType === "domain") {
      const companies = await prisma.company.findMany({
        where: { domainClusterId: cluster.id },
        select: { id: true },
        take: 10,
      });
      companyIds = companies.map((c) => c.id);
    } else {
      const jobs = await prisma.job.findMany({
        where: { clusterId: cluster.id },
        select: { companyId: true },
        distinct: ["companyId"],
        take: 10,
      });
      companyIds = jobs.map((j) => j.companyId);
    }

    if (candidates.length > 0 && companyIds.length > 0) {
      const interactions: {
        candidateId: string;
        companyId: string;
        eventId: string;
        contacted: boolean;
        rsvp: boolean;
        attended: boolean;
        starred: boolean;
        spoke: boolean;
        followUp: boolean;
        interviewed: boolean;
        offered: boolean;
        hired: boolean;
        rating: number | null;
        notes: string | null;
      }[] = [];

      for (const companyId of companyIds.slice(0, 6)) {
        for (let i = 0; i < candidates.length; i++) {
          const f = funnelForCandidateIndex(i, candidates.length, spec.status);
          const c = candidates[i]!;
          interactions.push({
            candidateId: c.id,
            companyId,
            eventId: event.id,
            contacted: f.contacted,
            rsvp: f.rsvp,
            attended: f.attended,
            starred: f.starred,
            spoke: f.spoke,
            followUp: f.followUp,
            interviewed: f.interviewed,
            offered: f.offered,
            hired: f.hired,
            rating: f.rating,
            notes: f.notes,
          });
        }
      }

      await prisma.founderInteraction.createMany({ data: interactions, skipDuplicates: true });
      results.push(`  founder interactions: ${interactions.length}`);
    }

    if (spec.status !== "draft" && companyIds.length > 0) {
      const companiesForApplicants = companyIds.slice(0, 3);
      for (const a of APPLICANT_POOL) {
        await prisma.applicant.upsert({
          where: { email: a.email },
          create: {
            name: a.name,
            email: a.email,
            linkedinUrl: a.linkedinUrl,
            skills: a.skills,
            interests: a.interests,
            embedding: [],
          },
          update: {
            name: a.name,
            linkedinUrl: a.linkedinUrl,
            skills: a.skills,
            interests: a.interests,
          },
        });
      }

      const applicants = await prisma.applicant.findMany({
        where: { email: { in: [...demoApplicantEmails] } },
        select: { id: true, email: true },
      });

      for (let ai = 0; ai < applicants.length; ai++) {
        const ap = applicants[ai]!;
        const companyId = companiesForApplicants[ai % companiesForApplicants.length]!;
        await prisma.applicantCompanyInterest.upsert({
          where: {
            applicantId_companyId_eventId: {
              applicantId: ap.id,
              companyId,
              eventId: event.id,
            },
          },
          create: { applicantId: ap.id, companyId, eventId: event.id },
          update: {},
        });

        if (ai < 3 && (spec.status === "active" || spec.status === "completed")) {
          await prisma.founderApplicantInterest.upsert({
            where: {
              applicantId_companyId_eventId: {
                applicantId: ap.id,
                companyId,
                eventId: event.id,
              },
            },
            create: { applicantId: ap.id, companyId, eventId: event.id },
            update: {},
          });
        }

        if (spec.status === "active" || spec.status === "completed") {
          const match = await prisma.match.upsert({
            where: {
              applicantId_companyId_eventId: {
                applicantId: ap.id,
                companyId,
                eventId: event.id,
              },
            },
            create: {
              applicantId: ap.id,
              companyId,
              eventId: event.id,
              status: spec.status === "completed" ? "closed" : "active",
            },
            update: { status: spec.status === "completed" ? "closed" : "active" },
          });

          const msgCount = await prisma.message.count({ where: { matchId: match.id } });
          if (msgCount === 0) {
            await prisma.message.createMany({
              data: [
                { matchId: match.id, sender: "applicant", content: "Hi — excited about your stack. Are you still screening for this event?" },
                { matchId: match.id, sender: "company", content: "Yes — can you share a link to something you shipped in the last year?" },
              ],
            });
          }
        }
      }
      results.push(`  applicant interests (+ matches on active/completed)`);
    }
  }

  return { results };
}
