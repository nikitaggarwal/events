"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/swr";
import { Badge } from "@/components/Badge";

interface Applicant {
  id: string;
  name: string;
  email: string;
  linkedinUrl: string | null;
  resumeUrl: string | null;
  resumeFilename: string | null;
  skills: string[];
  interests: string | null;
  companyInterests: { companyId: string; eventId: string; company: { name: string }; event: { name: string } }[];
  matches: {
    id: string;
    companyId: string;
    eventId: string;
    company: { id: string; name: string; slug: string; batch: string | null };
    event: { id: string; name: string; date: string | null };
    messages: { content: string; sender: string; createdAt: string }[];
  }[];
}

interface SuggestedEvent {
  event: {
    id: string;
    name: string;
    date: string | null;
    location: string | null;
    status: string;
    description: string | null;
    cluster: { id: string; name: string; keywords: string[] } | null;
  };
  score: number;
  companies: { id: string; name: string; slug: string; batch: string | null; roles: string[]; score: number }[];
}

interface EventDetail {
  event: {
    id: string;
    name: string;
    date: string | null;
    location: string | null;
    status: string;
    description: string | null;
    cluster: { id: string; name: string; keywords: string[]; type: string } | null;
  };
  companies: {
    id: string;
    name: string;
    slug: string;
    batch: string | null;
    description: string | null;
    url: string | null;
    roles: { id: string; title: string; skills: string[] }[];
    interested: boolean;
    founderInterested: boolean;
    matched: boolean;
  }[];
}

interface MatchData {
  id: string;
  applicant: { id: string; name: string; email: string };
  company: { id: string; name: string; slug: string; batch: string | null };
  event: { id: string; name: string; date: string | null };
  messages: { content: string; sender: string; createdAt: string }[];
}

interface Message {
  id: string;
  matchId: string;
  sender: string;
  content: string;
  createdAt: string;
}

type View = "login" | "onboarding" | "home" | "events" | "event-detail" | "matches" | "chat";

export default function ApplicantConsolePage() {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [applicant, setApplicant] = useState<Applicant | null>(null);

  // Onboarding form
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formLinkedin, setFormLinkedin] = useState("");
  const [formResume, setFormResume] = useState("");
  const [formSkills, setFormSkills] = useState("");
  const [formInterests, setFormInterests] = useState("");
  const [saving, setSaving] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeFilename, setResumeFilename] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Event detail
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Chat
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [msgInput, setMsgInput] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);

  const { data: suggestions, isLoading: suggestionsLoading } = useSWR<SuggestedEvent[]>(
    applicant ? `/api/applicants/suggestions?applicantId=${applicant.id}` : null,
    fetcher
  );

  const { data: eventDetail, mutate: mutateEventDetail } = useSWR<EventDetail>(
    selectedEventId && applicant
      ? `/api/applicants/events?eventId=${selectedEventId}&applicantId=${applicant.id}`
      : null,
    fetcher
  );

  const { data: matches, mutate: mutateMatches } = useSWR<MatchData[]>(
    applicant ? `/api/matches?applicantId=${applicant.id}` : null,
    fetcher
  );

  const { data: chatMessages, mutate: mutateMessages } = useSWR<Message[]>(
    selectedMatchId ? `/api/messages?matchId=${selectedMatchId}` : null,
    fetcher,
    { refreshInterval: 3000 }
  );

  const refreshApplicant = useCallback(async () => {
    if (!applicant?.email) return;
    const res = await fetch(`/api/applicants?email=${encodeURIComponent(applicant.email)}`);
    const data = await res.json();
    if (data) setApplicant(data);
  }, [applicant?.email]);

  async function handleLogin() {
    if (!email) return;
    const res = await fetch(`/api/applicants?email=${encodeURIComponent(email)}`);
    const data = await res.json();
    if (data) {
      setApplicant(data);
      setView("home");
    } else {
      setFormEmail(email);
      setView("onboarding");
    }
  }

  async function handleSaveProfile() {
    setSaving(true);
    const skills = formSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await fetch("/api/applicants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName,
        email: formEmail,
        linkedinUrl: formLinkedin || null,
        resumeUrl: formResume || null,
        skills,
        interests: formInterests || null,
      }),
    });
    const data = await res.json();

    if (resumeFile && data.id) {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", resumeFile);
      fd.append("applicantId", data.id);
      await fetch("/api/applicants/resume", { method: "POST", body: fd });
      setUploading(false);
    }

    setSaving(false);
    const fullRes = await fetch(`/api/applicants?email=${encodeURIComponent(formEmail)}`);
    const fullData = await fullRes.json();
    setApplicant(fullData || data);
    setResumeFile(null);
    setView("home");
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }

  function handleFileSelect(file: File) {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (!allowed.includes(file.type)) {
      alert("Only PDF, DOC, DOCX, and TXT files are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large (max 5MB).");
      return;
    }
    setResumeFile(file);
    setResumeFilename(file.name);
    setFormResume("");
  }

  async function toggleInterest(companyId: string) {
    if (!applicant || !selectedEventId) return;
    await fetch("/api/applicants/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicantId: applicant.id,
        companyId,
        eventId: selectedEventId,
      }),
    });
    mutateEventDetail();
    refreshApplicant();
    mutateMatches();
  }

  async function sendMessage() {
    if (!selectedMatchId || !msgInput.trim()) return;
    setSendingMsg(true);
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId: selectedMatchId,
        sender: "applicant",
        content: msgInput.trim(),
      }),
    });
    setMsgInput("");
    setSendingMsg(false);
    mutateMessages();
  }

  function openEventDetail(eventId: string) {
    setSelectedEventId(eventId);
    setView("event-detail");
  }

  function openChat(matchId: string) {
    setSelectedMatchId(matchId);
    setView("chat");
  }

  useEffect(() => {
    if (view === "home") {
      refreshApplicant();
    }
  }, [view, refreshApplicant]);

  const selectedMatch = matches?.find((m) => m.id === selectedMatchId);

  return (
    <div className="min-h-screen bg-yc-bg">
      {/* Top bar */}
      <header className="bg-white border-b border-yc-border sticky top-0 z-30">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
          <button onClick={() => applicant ? setView("home") : setView("login")} className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-yc-purple rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">Y</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-yc-dark">Applicant Console</div>
              <div className="text-[10px] text-yc-text-secondary">Work at a Startup</div>
            </div>
          </button>
          <div className="flex items-center gap-3">
            {applicant && (
              <nav className="flex gap-1">
                {[
                  { label: "Home", v: "home" as View },
                  { label: "Events", v: "events" as View },
                  { label: "Matches", v: "matches" as View },
                ].map((tab) => (
                  <button
                    key={tab.v}
                    onClick={() => { setView(tab.v); setSelectedEventId(null); setSelectedMatchId(null); }}
                    className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                      view === tab.v || (tab.v === "events" && view === "event-detail")
                        ? "bg-yc-purple-light text-yc-purple font-medium"
                        : "text-yc-text-secondary hover:text-yc-dark"
                    }`}
                  >
                    {tab.label}
                    {tab.v === "matches" && matches && matches.length > 0 && (
                      <span className="ml-1 text-[10px] bg-yc-purple text-white rounded-full px-1.5 py-0.5">
                        {matches.length}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            )}
            <Link
              href="/"
              className="text-xs text-yc-text-secondary hover:text-yc-dark transition-colors"
            >
              ← Home
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-8 py-8">
        {/* LOGIN */}
        {view === "login" && (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-14 h-14 bg-yc-purple rounded-xl flex items-center justify-center mx-auto mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="white" strokeWidth="1.5" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-yc-dark mb-2">Welcome to the Applicant Console</h1>
            <p className="text-sm text-yc-text-secondary mb-8">
              Browse YC hiring events, connect with companies, and find your next role.
            </p>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full px-4 py-3 border border-yc-border rounded-lg text-sm focus:outline-none focus:border-yc-purple"
              />
              <button
                onClick={handleLogin}
                disabled={!email}
                className="w-full py-3 bg-yc-purple text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                Continue
              </button>
              <p className="text-[11px] text-yc-text-secondary">
                New here? We&apos;ll help you create a profile.
              </p>
            </div>
          </div>
        )}

        {/* ONBOARDING */}
        {view === "onboarding" && (
          <div className="max-w-lg mx-auto py-8">
            <h1 className="text-xl font-bold text-yc-dark mb-1">Create your profile</h1>
            <p className="text-sm text-yc-text-secondary mb-6">
              Tell us about yourself so we can match you with the right events and companies.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-yc-dark mb-1">Full Name *</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-yc-border rounded-lg text-sm focus:outline-none focus:border-yc-purple"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-yc-dark mb-1">Email *</label>
                <input
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-yc-border rounded-lg text-sm focus:outline-none focus:border-yc-purple bg-yc-bg"
                  readOnly
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-yc-dark mb-1">LinkedIn URL</label>
                <input
                  value={formLinkedin}
                  onChange={(e) => setFormLinkedin(e.target.value)}
                  className="w-full px-3 py-2.5 border border-yc-border rounded-lg text-sm focus:outline-none focus:border-yc-purple"
                  placeholder="https://linkedin.com/in/..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-yc-dark mb-1">Resume</label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleFileDrop}
                  className={`relative border-2 border-dashed rounded-lg p-5 text-center transition-colors ${
                    dragging
                      ? "border-yc-purple bg-yc-purple-light"
                      : resumeFile || resumeFilename
                      ? "border-yc-green/40 bg-yc-green-light/30"
                      : "border-yc-border hover:border-yc-purple/40"
                  }`}
                >
                  {resumeFile || resumeFilename ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V5L9 1z" stroke="#16a34a" strokeWidth="1.3" strokeLinejoin="round" />
                        <path d="M9 1v4h4" stroke="#16a34a" strokeWidth="1.3" strokeLinejoin="round" />
                      </svg>
                      <span className="text-sm font-medium text-yc-green">{resumeFile?.name || resumeFilename}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setResumeFile(null); setResumeFilename(null); }}
                        className="text-xs text-yc-text-secondary hover:text-yc-red ml-1"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto mb-2 text-yc-text-secondary/40">
                        <path d="M12 16V8m0 0l-3 3m3-3l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M20 16.7V19a2 2 0 01-2 2H6a2 2 0 01-2-2v-2.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <p className="text-sm text-yc-text-secondary">
                        Drag & drop your resume here
                      </p>
                      <p className="text-[11px] text-yc-text-secondary/60 mt-1">
                        PDF, DOC, DOCX, or TXT · Max 5MB
                      </p>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 border-t border-yc-border" />
                  <span className="text-[10px] text-yc-text-secondary">or paste a link</span>
                  <div className="flex-1 border-t border-yc-border" />
                </div>
                <input
                  value={formResume}
                  onChange={(e) => { setFormResume(e.target.value); if (e.target.value) { setResumeFile(null); setResumeFilename(null); } }}
                  className="w-full mt-2 px-3 py-2 border border-yc-border rounded-lg text-sm focus:outline-none focus:border-yc-purple"
                  placeholder="https://drive.google.com/..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-yc-dark mb-1">Skills</label>
                <input
                  value={formSkills}
                  onChange={(e) => setFormSkills(e.target.value)}
                  className="w-full px-3 py-2.5 border border-yc-border rounded-lg text-sm focus:outline-none focus:border-yc-purple"
                  placeholder="Python, React, Machine Learning, Kubernetes..."
                />
                <p className="text-[11px] text-yc-text-secondary mt-1">Comma-separated</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-yc-dark mb-1">Interests & What You&apos;re Looking For</label>
                <textarea
                  value={formInterests}
                  onChange={(e) => setFormInterests(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-yc-border rounded-lg text-sm focus:outline-none focus:border-yc-purple resize-none"
                  placeholder="I'm looking for backend/infrastructure roles at early-stage startups working on developer tools or AI..."
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={!formName || !formEmail || saving}
                className="w-full py-3 bg-yc-purple text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {saving ? (uploading ? "Uploading resume..." : "Creating profile...") : "Create Profile & Browse Events"}
              </button>
            </div>
          </div>
        )}

        {/* HOME */}
        {view === "home" && applicant && (
          <div className="space-y-8">
            {/* Profile card */}
            <div className="bg-white border border-yc-border rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-yc-purple-light rounded-full flex items-center justify-center text-lg font-bold text-yc-purple">
                    {applicant.name[0]}
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-yc-dark">{applicant.name}</h2>
                    <p className="text-xs text-yc-text-secondary">{applicant.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFormName(applicant.name);
                    setFormEmail(applicant.email);
                    setFormLinkedin(applicant.linkedinUrl || "");
                    setFormResume(applicant.resumeFilename ? "" : (applicant.resumeUrl || ""));
                    setFormSkills(applicant.skills.join(", "));
                    setFormInterests(applicant.interests || "");
                    setResumeFile(null);
                    setResumeFilename(applicant.resumeFilename || null);
                    setView("onboarding");
                  }}
                  className="text-xs text-yc-purple hover:underline"
                >
                  Edit profile
                </button>
              </div>
              {applicant.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {applicant.skills.map((s) => (
                    <span key={s} className="text-[11px] px-2 py-0.5 bg-yc-purple-light border border-yc-purple/15 rounded-full text-yc-purple font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              )}
              {applicant.interests && (
                <p className="mt-2 text-xs text-yc-text-secondary">{applicant.interests}</p>
              )}
              <div className="mt-3 flex gap-3 text-xs text-yc-text-secondary">
                {applicant.linkedinUrl && (
                  <a href={applicant.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:text-yc-purple">LinkedIn</a>
                )}
                {applicant.resumeUrl && (
                  <a href={applicant.resumeUrl} target="_blank" rel="noopener noreferrer" className="hover:text-yc-purple flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V5L9 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                      <path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                    </svg>
                    {applicant.resumeFilename || "Resume"}
                  </a>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => setView("events")} className="bg-white border border-yc-border rounded-xl p-4 text-center hover:border-yc-purple/30 transition-colors">
                <div className="text-2xl font-bold text-yc-purple">{suggestions?.length ?? "—"}</div>
                <div className="text-xs text-yc-text-secondary mt-1">Suggested Events</div>
              </button>
              <div className="bg-white border border-yc-border rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-yc-orange">{applicant.companyInterests.length}</div>
                <div className="text-xs text-yc-text-secondary mt-1">Companies Interested</div>
              </div>
              <button onClick={() => setView("matches")} className="bg-white border border-yc-border rounded-xl p-4 text-center hover:border-yc-purple/30 transition-colors">
                <div className="text-2xl font-bold text-yc-green">{matches?.length ?? 0}</div>
                <div className="text-xs text-yc-text-secondary mt-1">Matches</div>
              </button>
            </div>

            {/* Suggested events */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-yc-dark">Recommended Events</h3>
                <button onClick={() => setView("events")} className="text-xs text-yc-purple hover:underline">View all</button>
              </div>
              {suggestionsLoading && <div className="text-sm text-yc-text-secondary py-8 text-center">Finding events for you...</div>}
              {suggestions && suggestions.length === 0 && (
                <div className="text-sm text-yc-text-secondary py-8 text-center bg-white border border-yc-border rounded-xl">
                  No upcoming events yet. Check back soon!
                </div>
              )}
              <div className="space-y-2">
                {suggestions?.slice(0, 3).map((s) => (
                  <button
                    key={s.event.id}
                    onClick={() => openEventDetail(s.event.id)}
                    className="block w-full text-left bg-white border border-yc-border rounded-xl p-4 hover:border-yc-purple/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-yc-dark">{s.event.name}</h4>
                          <Badge variant="purple">{s.event.status}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-yc-text-secondary">
                          {s.event.date && new Date(s.event.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          {s.event.location && ` · ${s.event.location}`}
                          {` · ${s.companies.length} companies`}
                        </div>
                        {s.event.cluster && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {s.event.cluster.keywords.slice(0, 5).map((kw) => (
                              <span key={kw} className="text-[10px] px-1.5 py-0.5 bg-yc-bg border border-yc-border rounded text-yc-text-secondary">{kw}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {s.score > 0 && (
                        <span className="text-xs font-medium text-yc-purple bg-yc-purple-light px-2 py-1 rounded-full shrink-0">
                          {Math.min(99, Math.round(s.score * 10))}% fit
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recent matches */}
            {matches && matches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-yc-dark">Your Matches</h3>
                  <button onClick={() => setView("matches")} className="text-xs text-yc-purple hover:underline">View all</button>
                </div>
                <div className="space-y-2">
                  {matches.slice(0, 3).map((match) => (
                    <button
                      key={match.id}
                      onClick={() => openChat(match.id)}
                      className="block w-full text-left bg-white border border-yc-green/30 rounded-xl p-4 hover:border-yc-green/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-yc-dark">{match.company.name}</span>
                            {match.company.batch && <Badge variant="orange">{match.company.batch}</Badge>}
                            <Badge variant="green">Match</Badge>
                          </div>
                          <div className="text-xs text-yc-text-secondary mt-0.5">via {match.event.name}</div>
                        </div>
                        {match.messages.length > 0 && (
                          <div className="text-xs text-yc-text-secondary text-right max-w-[200px] truncate">
                            {match.messages[0].content}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* EVENTS LIST */}
        {view === "events" && applicant && (
          <div>
            <h2 className="text-lg font-bold text-yc-dark mb-1">Browse Events</h2>
            <p className="text-sm text-yc-text-secondary mb-6">Events sorted by relevance to your profile</p>
            {suggestionsLoading && <div className="text-sm text-yc-text-secondary py-16 text-center">Finding events for you...</div>}
            <div className="space-y-3">
              {suggestions?.map((s) => (
                <button
                  key={s.event.id}
                  onClick={() => openEventDetail(s.event.id)}
                  className="block w-full text-left bg-white border border-yc-border rounded-xl p-5 hover:border-yc-purple/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-yc-dark">{s.event.name}</h3>
                        <Badge variant={s.event.status === "active" ? "orange" : s.event.status === "planning" ? "blue" : "neutral"}>
                          {s.event.status}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-yc-text-secondary">
                        {s.event.date && new Date(s.event.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        {s.event.location && ` · ${s.event.location}`}
                      </div>
                      {s.event.description && (
                        <p className="mt-2 text-xs text-yc-text leading-relaxed line-clamp-2">{s.event.description}</p>
                      )}
                      {s.event.cluster && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {s.event.cluster.keywords.slice(0, 6).map((kw) => (
                            <span key={kw} className="text-[10px] px-1.5 py-0.5 bg-yc-purple-light border border-yc-purple/15 rounded text-yc-purple">{kw}</span>
                          ))}
                        </div>
                      )}
                      {s.companies.length > 0 && (
                        <div className="mt-2 text-[11px] text-yc-text-secondary">
                          {s.companies.slice(0, 4).map((c) => c.name).join(", ")}
                          {s.companies.length > 4 && ` +${s.companies.length - 4} more`}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {s.score > 0 && (
                        <span className="text-xs font-medium text-yc-purple bg-yc-purple-light px-2 py-1 rounded-full">
                          {Math.min(99, Math.round(s.score * 10))}% fit
                        </span>
                      )}
                      <div className="mt-2 text-xs text-yc-text-secondary">{s.companies.length} companies</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* EVENT DETAIL */}
        {view === "event-detail" && applicant && eventDetail && (
          <div>
            <button onClick={() => setView("events")} className="text-xs text-yc-text-secondary hover:text-yc-dark mb-4 inline-flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Back to events
            </button>

            <div className="mb-6">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-yc-dark">{eventDetail.event.name}</h2>
                <Badge variant={eventDetail.event.status === "active" ? "orange" : "blue"}>
                  {eventDetail.event.status}
                </Badge>
              </div>
              <div className="mt-1 text-sm text-yc-text-secondary">
                {eventDetail.event.date && new Date(eventDetail.event.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                {eventDetail.event.location && ` · ${eventDetail.event.location}`}
              </div>
              {eventDetail.event.cluster && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {eventDetail.event.cluster.keywords.map((kw) => (
                    <span key={kw} className="text-[10px] px-1.5 py-0.5 bg-yc-purple-light border border-yc-purple/15 rounded text-yc-purple">{kw}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="text-[10px] text-yc-text-secondary uppercase tracking-wider mb-3">
              {eventDetail.companies.length} Companies at this event — tap to express interest
            </div>

            <div className="space-y-3">
              {eventDetail.companies.map((company) => (
                <div
                  key={company.id}
                  className={`bg-white border rounded-xl p-4 transition-colors ${
                    company.matched
                      ? "border-yc-green/50 ring-1 ring-yc-green/10"
                      : company.interested
                      ? "border-yc-purple/40"
                      : "border-yc-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-yc-dark">{company.name}</span>
                        {company.batch && <Badge variant="orange">{company.batch}</Badge>}
                        {company.matched && <Badge variant="green">Matched!</Badge>}
                        {company.founderInterested && !company.matched && (
                          <span className="text-[10px] text-yc-green font-medium">Wants to talk to you</span>
                        )}
                      </div>
                      {company.description && (
                        <p className="mt-1 text-xs text-yc-text-secondary line-clamp-2">{company.description}</p>
                      )}
                      {company.roles.length > 0 && (
                        <div className="mt-2">
                          <div className="text-[10px] text-yc-text-secondary uppercase tracking-wider mb-1">Open Roles</div>
                          <div className="flex flex-wrap gap-1.5">
                            {company.roles.map((role) => (
                              <div key={role.id} className="text-[11px] px-2 py-0.5 bg-yc-bg border border-yc-border rounded text-yc-text">
                                {role.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {company.roles.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {Array.from(new Set(company.roles.flatMap((r) => r.skills))).slice(0, 8).map((skill) => (
                            <span key={skill} className="text-[10px] px-1.5 py-0.5 bg-yc-purple-light/50 rounded text-yc-purple/70">{skill}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        onClick={() => toggleInterest(company.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          company.matched
                            ? "bg-yc-green text-white"
                            : company.interested
                            ? "bg-yc-purple text-white hover:bg-purple-700"
                            : "border border-yc-purple text-yc-purple hover:bg-yc-purple hover:text-white"
                        }`}
                      >
                        {company.matched ? "Matched!" : company.interested ? "Interested" : "I'm Interested"}
                      </button>
                      {company.url && (
                        <a
                          href={company.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-yc-text-secondary hover:text-yc-purple"
                        >
                          Visit website
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MATCHES */}
        {view === "matches" && applicant && (
          <div>
            <h2 className="text-lg font-bold text-yc-dark mb-1">Your Matches</h2>
            <p className="text-sm text-yc-text-secondary mb-6">
              When you and a company both express interest, a match is created and you can message each other.
            </p>
            {(!matches || matches.length === 0) && (
              <div className="text-center py-16 bg-white border border-yc-border rounded-xl">
                <div className="text-3xl mb-3">🤝</div>
                <div className="text-sm text-yc-text-secondary">No matches yet</div>
                <div className="text-xs text-yc-text-secondary mt-1">Browse events and express interest in companies to get started</div>
                <button onClick={() => setView("events")} className="mt-4 text-xs text-yc-purple hover:underline">Browse events</button>
              </div>
            )}
            <div className="space-y-3">
              {matches?.map((match) => (
                <button
                  key={match.id}
                  onClick={() => openChat(match.id)}
                  className="block w-full text-left bg-white border border-yc-border rounded-xl p-5 hover:border-yc-green/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-yc-dark">{match.company.name}</span>
                        {match.company.batch && <Badge variant="orange">{match.company.batch}</Badge>}
                        <Badge variant="green">Match</Badge>
                      </div>
                      <div className="text-xs text-yc-text-secondary mt-1">
                        via {match.event.name}
                        {match.event.date && ` · ${new Date(match.event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                      </div>
                    </div>
                    <div className="text-right">
                      {match.messages.length > 0 ? (
                        <div className="text-xs text-yc-text-secondary max-w-[200px] truncate">{match.messages[0].content}</div>
                      ) : (
                        <span className="text-xs text-yc-purple">Start chatting</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CHAT */}
        {view === "chat" && applicant && selectedMatch && (
          <div className="flex flex-col" style={{ height: "calc(100vh - 130px)" }}>
            <button
              onClick={() => { setView("matches"); setSelectedMatchId(null); }}
              className="text-xs text-yc-text-secondary hover:text-yc-dark mb-3 inline-flex items-center gap-1 shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Back to matches
            </button>

            <div className="bg-white border border-yc-border rounded-xl p-4 mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-yc-dark">{selectedMatch.company.name}</span>
                {selectedMatch.company.batch && <Badge variant="orange">{selectedMatch.company.batch}</Badge>}
              </div>
              <div className="text-xs text-yc-text-secondary mt-0.5">
                Matched via {selectedMatch.event.name} — discuss roles, schedule interviews, or ask questions
              </div>
            </div>

            <div className="flex-1 bg-white border border-yc-border rounded-xl flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(!chatMessages || chatMessages.length === 0) && (
                  <div className="text-center py-8 text-xs text-yc-text-secondary">
                    Start the conversation! Introduce yourself or ask about the role.
                  </div>
                )}
                {chatMessages?.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === "applicant" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      msg.sender === "applicant"
                        ? "bg-yc-purple text-white rounded-br-md"
                        : "bg-yc-bg border border-yc-border text-yc-dark rounded-bl-md"
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.sender === "applicant" ? "text-white/60" : "text-yc-text-secondary"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-yc-border p-3 flex gap-2">
                <input
                  value={msgInput}
                  onChange={(e) => setMsgInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border border-yc-border rounded-lg text-sm focus:outline-none focus:border-yc-purple"
                />
                <button
                  onClick={sendMessage}
                  disabled={!msgInput.trim() || sendingMsg}
                  className="px-4 py-2 bg-yc-purple text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
