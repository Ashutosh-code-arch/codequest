# Changelog

All notable changes to CodeQuest are documented here.

## [1.0.3] - 2026-09-09

### Fixed

- Language changes now wait for server confirmation and are serialized per room
- Yjs packets carry a room/language/problem document key, preventing delayed
  packets from inserting one language's code into another editor
- Superseded document sync requests can no longer replace the active document
- Video starts only after the Socket.IO room join is confirmed
- Camera state resets correctly when reopening a call, stream-less WebRTC tracks
  are handled, and blocked autoplay can be resumed from the video tile
- Camera and microphone failures now show actionable permission/device errors

## [1.0.2] - 2026-09-09

### Fixed

- Backend startup now applies pending Prisma migrations before accepting traffic,
  ensuring the persisted Yjs snapshot schema is present after deployment

## [1.0.1] - 2026-09-09

### Fixed

- Vercel CI now runs from the repository root so the configured `frontend`
  project directory is applied exactly once
- Updated the Vercel CLI used by GitHub Actions

## [1.0.0] - 2026-09-09

### Added

- Collaborative coding rooms with Monaco, Yjs, Socket.IO, chat, and timers
- JavaScript, Python, Java, C++, and C execution through Judge0
- Per-problem starter and driver templates for every supported language
- WebRTC video signaling with optional TURN support
- Admin question, test-case, user, and room management
- Session history, submissions, and saved code snapshots
- Node.js 24 CI/CD for Render and Vercel

### Fixed

- Restored code now reaches clients that switch languages or rejoin a room
- Yjs CRDT state persists safely across backend restarts
- Editor changes save promptly without creating unbounded periodic snapshots
- Missing TURN configuration no longer creates an invalid ICE server
- Video reconnects after Socket.IO reconnection and shows participant usernames
- Run and Submit open the correct result tab and show empty output explicitly
- Compilation and runtime failures are classified as errors, not wrong answers
- Driver templates can no longer silently discard submitted code
- Questions without test cases can no longer be selected for new rooms
- Admin seeding is idempotent for the reserved administrator account
- Authentication error responses and the current-user API path are consistent

[1.0.3]: https://github.com/Ashutosh-code-arch/codequest/releases/tag/v1.0.3
[1.0.2]: https://github.com/Ashutosh-code-arch/codequest/releases/tag/v1.0.2
[1.0.1]: https://github.com/Ashutosh-code-arch/codequest/releases/tag/v1.0.1
[1.0.0]: https://github.com/Ashutosh-code-arch/codequest/releases/tag/v1.0.0
