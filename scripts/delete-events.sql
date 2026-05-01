-- Wipe all event-related data while preserving jobs, clusters, and companies.
-- Usage: npm run delete-events

DELETE FROM "Message";
DELETE FROM "Match";
DELETE FROM "FounderApplicantInterest";
DELETE FROM "ApplicantCompanyInterest";
DELETE FROM "FounderInteraction";
DELETE FROM "Candidate";
DELETE FROM "Event";
