# Project: Multi-Mode Video & Audio Shadowing System (/shadowing)

## Architecture
- **Backend Architecture**:
  - Dedicated Django app `backend/shadowing/`:
    - `models.py`: `ShadowingVideo` (fields: `title`, `description`, `topic`, `level`, `media_source`, `youtube_url`, `youtube_id`, `media_file`, `thumbnail_url`, `duration_seconds`, `segments` [JSONField], `exercises` [JSONField], `is_public`, `created_by`, `created_at`, `updated_at`).
    - Custom Manager/QuerySet: `ShadowingVideoQuerySet.visible_to(user)`.
    - Permissions: `IsOwnerOrReadOnly` (guests & users can view public; users can view/edit own private).
    - Serializers: `ShadowingVideoListSerializer`, `ShadowingVideoDetailSerializer`, with schema validation for `segments` and `exercises`.
    - Views: `ShadowingVideoViewSet` (`list`, `retrieve`, `create`, `update`, `destroy`, `topics`, `extract_transcript`).
    - Services: `transcription.py` (`extract_youtube_transcript`, `transcribe_audio_offline`, `format_furigana`, `generate_exercises_from_segments`).
    - Command extension: `backend/cards/management/commands/sync_cards.py` extended with rich public N3–N2 videos (including Bite Size Japanese Ep.732 `ObDXpVyPrF8`).
  - Core settings & runner:
    - `MEDIA_URL = "/media/"`, `MEDIA_ROOT = BASE_DIR / "media"` in `settings.py`.
    - `backend/core/urls.py` includes `api/shadowing/` and serves `MEDIA_URL` in DEBUG.
    - `backend/core/runner.py` updated to run tests for both `cards` and `shadowing` by default.
  - Dependencies installed in `.venv`: `faster-whisper`, `pykakasi`, `youtube-transcript-api`.

- **Frontend Architecture**:
  - Routing: `/shadowing` in `Sidebar.jsx`, mapped to `ShadowingLibraryPage.jsx` and `/shadowing/:videoId` mapped to `ShadowingWorkspacePage.jsx` in `AppRoutes.jsx`.
  - UI Design System (`GEMINI.md` compliant):
    - White / Slate / Sky Blue tokens (`bg-white`, `bg-slate-50`, `bg-sky-600`, `border-slate-200`).
    - Zero CSS gradients (`bg-gradient-*`, `bg-linear-*`).
    - Zero inline `<svg>` — custom vector icons defined in `frontend/src/components/ui/SvgIcons.jsx`.
    - Zero emojis as icons.
    - 100% matched `variant="shadowing"` and `variant="shadowing-workspace"` in `Skeleton.jsx`.
    - Mobile Filter Bottom Sheet (`fixed inset-x-0 bottom-0 rounded-t-3xl`) for `< 640px`.
  - Study Modes (4 modes):
    - Mode 1: `Shadowing` — Synchronized video/audio player, interactive underlined word tokens (`bg-slate-800`), Furigana toggle, Vietnamese translation, and right-hand synchronized transcript panel with auto-scroll and click-to-seek.
    - Mode 2: `Phát âm` — Sentence-by-sentence recording via `MediaRecorder`, Japanese speech recognition accuracy evaluation, side-by-side audio review, and 3-state mastery rating (`ReviewRating.jsx`).
    - Mode 3: `Luyện nghe` — Interactive cloze practice with blanked vocabulary and `AnswerOption.jsx`.
    - Mode 4: `Bài tập` — Multiple-choice comprehension, vocabulary, and grammar exercises with `AnswerOption.jsx`.
  - State persistence & Continuity:
    - `jb_last_shadowing_session_v1_${suffix}` and `jb_shadowing_segment_status_v1_${suffix}` supporting seamless resume for both Guest and Authenticated User.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Python Speech & NLP Dependencies | Install and verify `faster-whisper`, `pykakasi`, `youtube-transcript-api` in `.venv` | M1 | Survey |
| 2 | Shadowing Django App & Models | Create `ShadowingVideo` model with JSON segments & exercises, QuerySet `visible_to`, safe migration | M1 | Survey |
| 3 | Media Serving & Runner Configuration | Add `MEDIA_ROOT`/`MEDIA_URL`, wire `urls.py`, and update `CustomDiscoverRunner` in `core/runner.py` | M1 | Survey |
| 4 | Offline Transcription & Furigana Pipeline | `transcribe_audio_offline` (PyAV+faster-whisper), `extract_youtube_transcript`, and `pykakasi` furigana builder matching `RubyText.jsx` | M1 | Survey |
| 5 | Shadowing REST API Endpoints | `GET /api/shadowing/videos/`, `GET /api/shadowing/videos/<id>/`, `POST /api/shadowing/videos/`, `POST /api/shadowing/videos/extract_transcript/`, `GET /api/shadowing/topics/` | M1 | Survey |
| 6 | Seed Data in `sync_cards` | Extend `sync_cards` to seed Bite Size Japanese Ep.732 (`ObDXpVyPrF8`) plus 4 additional N3-N2 topic videos with transcripts, ruby text, word tokens, and exercises | M1 | Survey |
| 7 | Backend Unit & Integration Tests | Automated test suite for shadowing models, serializers, views, permissions, and transcription pipeline | M1 | Survey |
| 8 | Sidebar & AppRoutes Navigation | Add `/shadowing` to `Sidebar.jsx` and configure routes in `AppRoutes.jsx` | M2 | Survey |
| 9 | Reusable SvgIcons & Design Tokens | Add `YouTubeLogoSvg`, `BilingualIconSvg` in `SvgIcons.jsx`; strictly 0 inline `<svg>`, 0 gradients | M2 | Survey |
| 10 | Synchronized Skeleton Components | Add `variant="shadowing"` and `variant="shadowing-workspace"` to `Skeleton.jsx` matching exact dimensions and grids | M2 | Survey |
| 11 | Shadowing Library View | Topic & level filters, mobile Filter Bottom Sheet (<640px), 3-column stats bar, responsive video grid | M2 | Survey |
| 12 | "Tiếp tục Shadowing" Resume Feature | Hero card resuming at exact video and segment for both Guest (`localStorage`) and Authenticated User | M2 | Survey |
| 13 | Add/Extract Video Modal | Modal supporting YouTube URL extraction and Audio/Video file upload via backend transcription API | M2 | Survey |
| 14 | Unified Shadowing Player Hook | `useShadowingPlayer` handling YouTube IFrame API & HTML5 native media, speed controls (0.75x, 1x, 1.25x), single loop, and precise time sync | M3 | Survey |
| 15 | Subtitle Stage & Interactive Word Tokens | Dark subtitle box (`bg-slate-800`), interactive underlined word tokens (`RubyText.jsx`), 1-click Card creation popover, and Vietnamese translation | M3 | Survey |
| 16 | Synchronized Transcript Panel | Right panel (`Phụ đề`) with bilingual toggle (`AB`), segment list, active highlight (`bg-sky-50 border-sky-200`), auto-scroll, click-to-seek | M3 | Survey |
| 17 | `Phát âm` (Pronunciation) Mode | Sentence-by-sentence recording (`MediaRecorder`), ja-JP recognition scoring, side-by-side playback, `ReviewRating.jsx` 3-tier status | M3 | Survey |
| 18 | `Luyện nghe` (Listening Cloze) Mode | Segment audio replay, fill-in-the-blank vocabulary selection using `AnswerOption.jsx` | M3 | Survey |
| 19 | `Bài tập` (Exercises) Mode | Multiple-choice comprehension, grammar, and vocabulary exercises using `AnswerOption.jsx` with instant explanations | M3 | Survey |
| 20 | E2E Testing Suite & Quality Verification | Comprehensive automated tests across Tiers 1-4, lint/build check, and GEMINI.md compliance verification | M4 | Survey |

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Architecture, Pipeline, API & Seed Data | Features 1–7 (`backend/shadowing/`, pipeline, migrations, `sync_cards`, tests) | none | DONE (78/78 tests, Clean audit, Iteration 2 Gate PASS) |
| M2 | Frontend Navigation, Library & 4-Mode Study Workspace | Features 8–19 (Sidebar, AppRoutes, SvgIcons, Skeleton, Library, Resume Hero, Modal, 4 Study Modes) | M1 | DONE (147/147 E2E tests, 78/78 Django tests, Clean audit, Gate PASS) |
| M3 | Final E2E Verification & Adversarial Hardening | Feature 20 (147 E2E tests, Tier 5 adversarial hardening, zero lint/build warnings, GEMINI.md compliance) | M1, M2 | IN_PROGRESS (Tier 5 Adversarial Hardening) |

## Interface Contracts

### Backend ↔ Frontend API Contract
- `GET /api/shadowing/videos/?topic=<topic>&level=<level>&search=<q>`:
  - Response: Array of video summaries:
    ```json
    [
      {
        "id": 1,
        "title": "お金の使い方について | 私が大事にしている考え方",
        "topic": "life",
        "topic_display": "Đời sống",
        "level": "N3",
        "media_source": "youtube",
        "youtube_url": "https://www.youtube.com/watch?v=ObDXpVyPrF8",
        "youtube_id": "ObDXpVyPrF8",
        "thumbnail_url": "https://img.youtube.com/vi/ObDXpVyPrF8/hqdefault.jpg",
        "media_file_url": null,
        "duration_seconds": 630,
        "total_segments": 12,
        "total_exercises": 3,
        "is_public": true,
        "created_by": null,
        "created_at": "2026-10-18T19:00:00Z"
      }
    ]
    ```
- `GET /api/shadowing/videos/<id>/`:
  - Response: Full video detail including `segments` and `exercises`:
    ```json
    {
      "id": 1,
      "title": "...",
      "topic": "life",
      "level": "N3",
      "media_source": "youtube",
      "youtube_url": "...",
      "youtube_id": "ObDXpVyPrF8",
      "thumbnail_url": "...",
      "media_file_url": null,
      "duration_seconds": 630,
      "is_public": true,
      "segments": [
        {
          "id": 0,
          "start": 0.0,
          "end": 4.5,
          "text": "Bite size Japanese のレイラです。",
          "ruby_text": "Bite size Japanese のレイラです。",
          "meaning": "Mình là Layla từ Bite Size Japanese.",
          "words": [
            { "token": "Bite", "reading": "Bite", "meaning": "Bite", "type": "other" },
            { "token": "size", "reading": "size", "meaning": "size", "type": "other" },
            { "token": "Japanese", "reading": "Japanese", "meaning": "Japanese", "type": "other" },
            { "token": "の", "reading": "の", "meaning": "của", "type": "particle" },
            { "token": "レイラ", "reading": "レイラ", "meaning": "Layla", "type": "name" },
            { "token": "です", "reading": "です", "meaning": "là", "type": "verb" }
          ]
        }
      ],
      "exercises": [
        {
          "id": 1,
          "type": "multiple_choice",
          "question": "Layla chia sẻ quan điểm của mình về chủ đề gì trong video?",
          "options": ["Cách học tiếng Nhật", "Cách sử dụng tiền bạc", "Kế hoạch đi du lịch", "Công việc làm thêm"],
          "correct_index": 1,
          "explanation": "Tiêu đề video là 'お金の使い方について' - Bàn về cách sử dụng tiền bạc."
        }
      ]
    }
    ```
- `POST /api/shadowing/videos/extract_transcript/`:
  - Request body: `{ "source_type": "youtube"|"upload", "youtube_url": "...", "media_file": <file>, "title": "...", "topic": "life", "level": "N3" }`
  - Response: Extracted segments and exercises ready for preview or save.
- `GET /api/shadowing/topics/`:
  - Response: `[{ "id": "life", "name": "Đời sống" }, { "id": "business", "name": "Công việc" }, { "id": "conversation", "name": "Hội thoại" }, { "id": "news", "name": "Tin tức" }, { "id": "culture", "name": "Văn hóa" }]`

### Frontend Internal Contracts
- `useShadowingPlayer`:
  - Input: `{ source_type, youtube_id, media_file_url, segments }`
  - Output: `{ currentTime, duration, isPlaying, play, pause, seekTo, setSpeed, playbackRate, activeSegmentIndex, activeSegment, isLoopingSegment, toggleSegmentLoop }`
- `studyProgress.js`:
  - `saveLastShadowingSession({ videoId, segmentIndex, segmentId, videoTitle, topic, level, mode })`
  - `getLastShadowingSession()`
  - `saveSegmentStatus(videoId, segmentId, status)`
  - `getSegmentStatuses(videoId)`

## Code Layout
- Backend:
  - `backend/shadowing/` (new Django app):
    - `models.py`
    - `serializers.py`
    - `views.py`
    - `urls.py`
    - `permissions.py`
    - `tests.py`
    - `services/transcription.py`
    - `migrations/`
  - `backend/cards/management/commands/sync_cards.py`
  - `backend/core/settings.py`
  - `backend/core/urls.py`
  - `backend/core/runner.py`
- Frontend:
  - `frontend/src/pages/ShadowingLibraryPage.jsx`
  - `frontend/src/pages/ShadowingWorkspacePage.jsx`
  - `frontend/src/components/shadowing/`
    - `ShadowingLibraryHeader.jsx`
    - `ShadowingResumeHero.jsx`
    - `ShadowingFilterBottomSheet.jsx`
    - `ShadowingVideoCard.jsx`
    - `AddVideoModal.jsx`
    - `WordTokenPopover.jsx`
    - `modes/`
      - `ShadowingModeStage.jsx`
      - `PronunciationModeStage.jsx`
      - `ListeningModeStage.jsx`
      - `ExerciseModeStage.jsx`
    - `controls/`
      - `ShadowingControls.jsx`
      - `TranscriptPanel.jsx`
  - `frontend/src/hooks/useShadowingPlayer.js`
  - `frontend/src/services/shadowingApi.js`
  - `frontend/src/components/Sidebar.jsx`
  - `frontend/src/routes/AppRoutes.jsx`
  - `frontend/src/components/ui/Skeleton.jsx`
  - `frontend/src/components/ui/SvgIcons.jsx`
