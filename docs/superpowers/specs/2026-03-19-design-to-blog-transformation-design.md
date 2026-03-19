# Design-to-Blog Transformation

Transform the existing Design page into a Blog page across the full stack (frontend, backend, arch-design repo). The blog serves as a personal technical blog where the author posts about technical solutions built in Beyou, with occasional planning/roadmap content.

## Approach

Evolve in place: rename Design → Blog across all layers, add rich metadata fields, replace the frontend with a hybrid grid+reading layout.

## Data Model

### BlogTopic entity (renamed from DesignTopic)

Kept fields:
- `id` (UUID, auto-generated)
- `key` (String, unique, max 128)
- `status` (Enum: ACTIVE, ARCHIVED)
- `createdAt`, `updatedAt` (Date, auto-managed)

Removed fields:
- `orderIndex` — replaced by `publishedAt` for sort order

New fields:
- `category` (Enum: TECHNICAL, PLANNING) — post type
- `tags` (String, `@Column(columnDefinition = "TEXT")`) — stored as JSON array string e.g. `'["spring", "security"]'`. Serialized/deserialized via a JPA `AttributeConverter<List<String>, String>` using Jackson. DTOs expose `String` (raw JSON); frontend parses with existing `parseTags()` utility.
- `featured` (Boolean, default false) — pins to hero spot on landing
- `publishedAt` (Date) — explicit publish date, primary sort field. Falls back to `createdAt` if null. Repository query uses `ORDER BY publishedAt DESC NULLS LAST`.
- `coverColor` (String, nullable) — hex color accent for card. Validated with `^#[0-9a-fA-F]{6}$` regex in parser; invalid values become null.
- `coverEmoji` (String, nullable) — emoji visual for card
- `author` (String, nullable) — author name

### BlogTopicContent entity (renamed from DesignTopicContent)

Unchanged structure:
- `id`, `topic` (FK), `locale`, `title`, `summary`, `docMarkdown`, `updatedAt`
- Unique constraint on (topic_id, locale)

### DTOs

**BlogTopicListItemDTO**: `key`, `title`, `summary`, `category`, `tags`, `featured`, `publishedAt`, `coverColor`, `coverEmoji`, `author`, `updatedAt`

**BlogTopicDetailDTO**: `key`, `title`, `docMarkdown`, `category`, `tags`, `featured`, `publishedAt`, `coverColor`, `coverEmoji`, `author`, `updatedAt`

### topic.yaml format

```yaml
key: building-auth-system
category: technical
tags: [spring, security, jwt]
featured: true
publishedAt: 2026-03-19
coverColor: "#8b5cf6"
coverEmoji: "🔐"
author: "Anderson"
status: active
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/docs/blog/topics` | List active posts sorted by `publishedAt` DESC. Query: `locale`, `category`, `tag` |
| GET | `/docs/blog/topics/{key}` | Full post detail with markdown |
| POST | `/docs/admin/import/blog` | Import blog posts from GitHub |

## Backend Changes

### Package rename
`docs.design.*` → `docs.blog.*`

### Classes renamed + enhanced
- `DesignTopic` → `BlogTopic` (+ new fields)
- `DesignTopicContent` → `BlogTopicContent`
- `DesignTopicStatus` → `BlogTopicStatus`
- New: `BlogTopicCategory` enum (TECHNICAL, PLANNING)
- `DesignTopicRepository` → `BlogTopicRepository`
- `DesignTopicService` → `BlogTopicService`
- `DesignDocsImportService` → `BlogDocsImportService`
- `DesignDocsImportParser` → `BlogDocsImportParser`
- `DesignDocsController` → `BlogDocsController`
- DTOs: `DesignTopicListItemDTO` → `BlogTopicListItemDTO`, `DesignTopicDetailDTO` → `BlogTopicDetailDTO`
- Import request/result DTOs renamed accordingly

### Database tables
- `docs_design_topic` → `docs_blog_topic`
- `docs_design_topic_content` → `docs_blog_topic_content`

Since the project uses `ddl-auto: update`, Hibernate will create new tables rather than rename. The old design data is disposable (only one test topic). Old `docs_design_*` tables can be dropped manually after deployment, or left for Hibernate to ignore.

### Import controller
The POST import endpoint lives in the shared `DocsImportController`, not in the type-specific controller. Update the `@PostMapping` path from `"/design"` to `"/blog"` and rename the injected service. The `DocsImportController` itself is NOT renamed — it remains the shared import controller.

### Import parser changes
Replace the simple line-by-line `parseSimpleYaml` with SnakeYAML (already on the Spring Boot classpath). This properly handles:
- Inline YAML arrays (`tags: [spring, security, jwt]` → `List<String>`)
- Boolean values (`featured: true` → `Boolean`)
- Date values (`publishedAt: 2026-03-19` → `Date`)
- All existing string fields

`parseTopicYaml` extracts new fields: `category`, `tags`, `publishedAt`, `featured`, `coverColor`, `coverEmoji`, `author`.

### Search integration
Rename all `design` references in `SearchService` to `blog`:
- Method `searchDesign()` → `searchBlog()`
- Import `DesignTopicRepository` → `BlogTopicRepository`, `DesignTopicStatus` → `BlogTopicStatus`
- Category string `"design"` → `"blog"`
- Plural normalization `"designs"` → `"blogs"`

### Exception class rename
`DocsDesignNotFound` → `DocsBlogNotFound` (in `exceptions/docs/` package)

### Config (application.yaml)
```yaml
docs.import.design.path → docs.import.blog.path
DOCS_IMPORT_DESIGN_PATH → DOCS_IMPORT_BLOG_PATH
```

## Frontend Changes

### Layout: Hybrid (Grid Landing + Full Post)

**View 1 — Landing (/blog):**
- Header: page title + post count
- Filter bar: category pills (All / Technical / Planning) + search input
- Featured hero: gradient background using `coverColor`, emoji, category label, title, summary, tags, author, reading time, date
- Recent posts: 3-column responsive grid of cards with emoji, category, title, summary, tags, date
- If no featured post exists, skip hero and show all posts in grid

**View 2 — Reading (/blog?post={key}):**
- Back button → returns to landing
- Post header: category badge, tag chips, title (large), author avatar (initial letter) + name + date + reading time
- Content area: centered (max 680px), glass panel, markdown rendered via BlogMarkdown component
- Mermaid diagrams and table horizontal scroll supported

### Files renamed/rewritten
- `Design.tsx` → `Blog.tsx` (rewrite with two-state grid/reading layout)
- `designApi.ts` → `blogApi.ts` (new types with all metadata, `fetchBlogTopics(locale, category?, tag?)` accepts filter params)
- `DesignMarkdown.tsx` → `MarkdownContent.tsx` (rename, generic name since it's shared by Architecture, Blog, Projects)
- `src/components/design/` directory → `src/components/markdown/` (shared markdown rendering components used across multiple pages)
- i18n keys: `design.*` → `blog.*` in both en and pt translations

### Additional frontend references to update
Grep for `design` across the frontend and update all references:
- `Index.tsx` — imports, route links, recent activity type
- `SearchPage.tsx` — search result category
- `searchApi.ts` — type union for search results
- `RecentActivity.tsx` — design references
- `App.tsx` — route definition
- `Sidebar.tsx` — nav item label and icon

### Reading time
Calculated on the frontend from `docMarkdown` length: `Math.max(1, Math.ceil(wordCount / 200))` minutes. Same approach as `estimateReadingTime()` already in `architectureApi.ts`.

### URL parameter
Query param changes from `?topic={key}` to `?post={key}`.

### Responsive grid
- Desktop (lg+): 3 columns
- Tablet (md): 2 columns
- Mobile: 1 column

### Empty states
- Zero posts: centered message "No blog posts yet"
- Filter no matches: "No posts match your filters" with clear filters button
- Network error: glass panel with error message (same pattern as existing pages)
- Loading: skeleton cards or loading text

### Navigation
- Route: `/design` → `/blog`
- Sidebar: label "Design" → "Blog", icon `Palette` → `Newspaper`
- `App.tsx` route update

### Animations
- Framer Motion transitions between landing and reading views
- Card hover effects
- Staggered card entrance on landing

## Arch-Design Repo Changes

- Delete `design/user-flow/` folder
- Rename `design/` → `blog/`
- Create sample first post: `blog/building-auth-system/topic.yaml`, `en.md`, `pt.md`

### Sample post content
A technical blog post about implementing JWT + Google OAuth in the Beyou backend. Covers the token flow, cookie-based delivery, and security decisions. Includes a Mermaid sequence diagram.

## What Stays the Same

- Import pipeline logic (GitHub fetch → parse YAML + markdown → upsert)
- Locale fallback to English
- Mermaid rendering in markdown
- Table horizontal scroll
- Glass panel styling from existing design system
- ACTIVE/ARCHIVED status workflow
