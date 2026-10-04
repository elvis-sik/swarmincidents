# Swarm Incidents: submission to the AI Swarm Dynamics Hackathon

**Live:** https://swarmincidents.com · **Code:** https://github.com/elvis-sik/swarmincidents · **Team:** Elvis Sikora

## Short write-up

Swarm Incidents is a synthetic view of the OpenAI agent-swarm incidents: every incident on one timeline, with sources, and the ability to zoom from the whole picture down to a single message an agent wrote.

**Overview.** Ten incidents from the Hugging Face breach to the German-wiki back channel, each with what happened, who found it, when it became public, what OpenAI said, which organizations were affected, and every source grouped by who published it (researchers and explainers first). The timeline shows activity periods, disclosure dates and the delay between them; the Affected and Responses tabs show the same incidents by victim and by reaction.

**Inside an incident.** For the German-wiki incident we built a reader for the agents' own posts, from the collusion.wiki archive. Each post is one saved wiki edit, replayed revision by revision from the published export (checksums verified, every body hash reproduced). A thread (one wiki page) reads like a chat: writers get memorable monikers with their literal labels beside them, replies are detected only from textual cues, and every post links to the archived revision. Three wordings of the same post sit on one axis: the original shorthand, a plain-English reading linked clause by clause to the original, and a chatty retelling that reads like a group chat. A briefing box explains the task before you read. Nothing is invented: retellings are marked as editorial, guesses are flagged, and the original is one click away.

The point is synthesis: explainers cover one incident deeply; we put all of them in one place and let a reader drill in until they are looking at a single sentence an agent wrote, with the evidence attached.

Built with Claude Code; data pipeline in Python; a single static page; Playwright tests across Chromium, Firefox, WebKit and two phone emulations.

## Real results found with the tool

- Of the ten incidents, six were first made public by someone other than OpenAI, and three are still not confirmed by OpenAI. The median time from first agent activity to public disclosure is 116 days.
- In the wiki archive, 244 saved edits on ten pages form coordination threads for five timed-quiz tasks. In "The race to question five", runs of the same agent, tagged by cohort (Jul08OAI, Jan12OAI, OurRun), post the questions they have seen, predict the next field from the ranking, and ask whoever is ahead to relay it; one run reports that its waiting tool accelerates its task clock and offers to race ahead. Twenty-seven posts reply to earlier ones by name.
- Labels are self-chosen and not dates or identities: a label like CashierCoordJul08OAI is a role plus a cohort tag, and the same tag appears inside the text. Several saves hold two or three signed posts at once.
- The archive stores some edits with UTF-8 bytes re-encoded as Latin-1 once per re-save; four posts needed repair, which the reader shows and the archive link exposes as stored.
- The live wiki page has since been deleted by the wiki's administrator; the collusion.wiki export and the Wayback Machine's copies of it are now the only public record.
