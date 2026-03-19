# Design-to-Blog Transformation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Design page into a Blog page across all three repos (arch-design, backend, frontend), with rich metadata, a hybrid grid+reading layout, and a sample blog post.

**Architecture:** Evolve in place — rename Design → Blog across all layers, add new metadata fields (category, tags, featured, publishedAt, coverColor, coverEmoji, author), replace the frontend with a hybrid grid landing + full post reading view. The existing import pipeline pattern is preserved.

**Tech Stack:** Spring Boot (Java), JPA/Hibernate, PostgreSQL, SnakeYAML, React (TypeScript), Vite, Tailwind CSS, Framer Motion, shadcn/ui, react-markdown

**Spec:** `docs/superpowers/specs/2026-03-19-design-to-blog-transformation-design.md`

---

## File Structure

### Arch-Design Repo (`/home/gentek/andP/beyou/Beyou-arch-design`)
- Delete: `design/user-flow/` (topic.yaml, en.md, pt.md)
- Create: `blog/building-auth-system/topic.yaml` — blog post metadata
- Create: `blog/building-auth-system/en.md` — English content
- Create: `blog/building-auth-system/pt.md` — Portuguese content

### Backend (`/home/gentek/andP/beyou/Beyou-backend-spring`)
- Delete: entire `src/main/java/beyou/beyouapp/backend/docs/design/` package
- Delete: `src/main/java/beyou/beyouapp/backend/controllers/docs/DesignDocsController.java`
- Delete: `src/main/java/beyou/beyouapp/backend/exceptions/docs/DocsDesignNotFound.java`
- Delete: `src/test/java/beyou/beyouapp/backend/docs/design/` test package
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/entity/BlogTopic.java`
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/entity/BlogTopicContent.java`
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/entity/BlogTopicStatus.java`
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/entity/BlogTopicCategory.java`
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/entity/StringListConverter.java` — JPA AttributeConverter for tags
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/dto/BlogTopicListItemDTO.java`
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/dto/BlogTopicDetailDTO.java`
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/dto/BlogDocsImportRequestDTO.java`
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/dto/BlogDocsImportResultDTO.java`
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/BlogTopicRepository.java`
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/BlogTopicService.java`
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/imp/BlogDocsImportParser.java`
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/imp/BlogDocsImportService.java`
- Create: `src/main/java/beyou/beyouapp/backend/controllers/docs/BlogDocsController.java`
- Create: `src/main/java/beyou/beyouapp/backend/exceptions/docs/DocsBlogNotFound.java`
- Modify: `src/main/java/beyou/beyouapp/backend/controllers/docs/DocsImportController.java` — rename design → blog
- Modify: `src/main/java/beyou/beyouapp/backend/docs/search/SearchService.java` — rename design → blog
- Modify: `src/main/java/beyou/beyouapp/backend/exceptions/ErrorKey.java` — rename DOCS_DESIGN_NOT_FOUND → DOCS_BLOG_NOT_FOUND
- Modify: `src/main/resources/application.yaml` — rename design path config to blog

### Frontend (`/home/gentek/andP/beyou/Beyou-docs-ui`)
- Delete: `src/pages/Design.tsx`
- Delete: `src/lib/designApi.ts`
- Rename dir: `src/components/design/` → `src/components/markdown/` (shared by Architecture, Blog, Projects)
- Rename: `src/components/design/DesignMarkdown.tsx` → `src/components/markdown/MarkdownContent.tsx`
- Move: `src/components/design/MermaidBlock.tsx` → `src/components/markdown/MermaidBlock.tsx`
- Move: `src/components/design/MermaidRenderer.tsx` → `src/components/markdown/MermaidRenderer.tsx`
- Move: `src/components/design/MermaidPreview.tsx` → `src/components/markdown/MermaidPreview.tsx`
- Create: `src/lib/blogApi.ts` — API client with new types and filter params
- Create: `src/pages/Blog.tsx` — hybrid grid landing + reading view
- Modify: `src/App.tsx` — route + import rename
- Modify: `src/components/layout/Sidebar.tsx` — icon + label + path
- Modify: `src/pages/Index.tsx` — design → blog references
- Modify: `src/pages/SearchPage.tsx` — design → blog category
- Modify: `src/pages/Architecture.tsx` — DesignMarkdown → MarkdownContent import
- Modify: `src/pages/Projects.tsx` — DesignMarkdown → MarkdownContent import, designTopicKey → blogTopicKey link
- Modify: `src/lib/searchApi.ts` — type union update
- Modify: `src/components/dashboard/RecentActivity.tsx` — design → blog type
- Modify: `src/components/dashboard/QuickAccessCards.tsx` — design → blog card
- Modify: `src/components/dashboard/SystemOverview.tsx` — import path update
- Modify: `src/translations/en/translation.json` — design → blog keys
- Modify: `src/translations/pt/translation.json` — design → blog keys

---

### Task 1: Sample Blog Post Content (Arch-Design Repo)

**Files:**
- Delete: `/home/gentek/andP/beyou/Beyou-arch-design/design/user-flow/topic.yaml`
- Delete: `/home/gentek/andP/beyou/Beyou-arch-design/design/user-flow/en.md`
- Delete: `/home/gentek/andP/beyou/Beyou-arch-design/design/user-flow/pt.md`
- Delete: `/home/gentek/andP/beyou/Beyou-arch-design/design/` (directory, after files removed)
- Create: `/home/gentek/andP/beyou/Beyou-arch-design/blog/building-auth-system/topic.yaml`
- Create: `/home/gentek/andP/beyou/Beyou-arch-design/blog/building-auth-system/en.md`
- Create: `/home/gentek/andP/beyou/Beyou-arch-design/blog/building-auth-system/pt.md`

- [ ] **Step 1: Delete old design folder**

```bash
cd /home/gentek/andP/beyou/Beyou-arch-design
rm -rf design/
```

- [ ] **Step 2: Create blog directory structure**

```bash
mkdir -p blog/building-auth-system
```

- [ ] **Step 3: Write topic.yaml with full blog metadata**

Create `blog/building-auth-system/topic.yaml`:

```yaml
key: building-auth-system
category: technical
tags: [spring, security, jwt, oauth]
featured: true
publishedAt: 2026-03-19
coverColor: "#8b5cf6"
coverEmoji: "\U0001F512"
author: "Anderson"
status: active
```

- [ ] **Step 4: Write English blog post**

Create `blog/building-auth-system/en.md` — a technical blog post about how the Beyou auth system was built. Include:
- Front-matter with title and summary
- Sections: overview, the token flow, cookie-based delivery, Google OAuth integration, security decisions
- A Mermaid sequence diagram showing the auth flow
- Code snippets for key configuration
- At least 400 words (for realistic reading time calculation)

- [ ] **Step 5: Write Portuguese blog post**

Create `blog/building-auth-system/pt.md` — full Portuguese translation of the English post. Same structure, translated title/summary/content, translated Mermaid diagram labels.

- [ ] **Step 6: Update architecture docs-system references**

Update `/home/gentek/andP/beyou/Beyou-arch-design/architecture/docs-system/en.md` and `pt.md`: rename all references from `design` to `blog` (directory paths, endpoint URLs, table names, config keys). Also update project topic.yaml files that reference `designTopicKey`.

- [ ] **Step 7: Commit**

```bash
cd /home/gentek/andP/beyou/Beyou-arch-design
git add -A
git commit -m "feat: rename design to blog, add first blog post (building-auth-system)"
```

---

### Task 2: Backend Blog Entities, Enums, and DTOs

**Files:**
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/entity/BlogTopicStatus.java`
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/entity/BlogTopicCategory.java`
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/entity/BlogTopic.java`
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/entity/BlogTopicContent.java`
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/dto/BlogTopicListItemDTO.java`
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/dto/BlogTopicDetailDTO.java`
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/dto/BlogDocsImportRequestDTO.java`
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/dto/BlogDocsImportResultDTO.java`
- Create: `src/main/java/beyou/beyouapp/backend/exceptions/docs/DocsBlogNotFound.java`

Working directory: `/home/gentek/andP/beyou/Beyou-backend-spring`

- [ ] **Step 1: Create BlogTopicStatus enum**

```java
package beyou.beyouapp.backend.docs.blog.entity;

public enum BlogTopicStatus {
    ACTIVE, ARCHIVED
}
```

- [ ] **Step 2: Create BlogTopicCategory enum**

```java
package beyou.beyouapp.backend.docs.blog.entity;

public enum BlogTopicCategory {
    TECHNICAL, PLANNING
}
```

- [ ] **Step 3: Create StringListConverter**

JPA `AttributeConverter<List<String>, String>` for the tags field:

```java
package beyou.beyouapp.backend.docs.blog.entity;

import java.util.List;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class StringListConverter implements AttributeConverter<List<String>, String> {
    private static final ObjectMapper mapper = new ObjectMapper();

    @Override
    public String convertToDatabaseColumn(List<String> attribute) {
        if (attribute == null || attribute.isEmpty()) return null;
        try { return mapper.writeValueAsString(attribute); }
        catch (Exception e) { return null; }
    }

    @Override
    public List<String> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) return List.of();
        try { return mapper.readValue(dbData, new TypeReference<>() {}); }
        catch (Exception e) { return List.of(); }
    }
}
```

- [ ] **Step 4: Create BlogTopic entity**

Based on `DesignTopic` (see `docs/design/entity/DesignTopic.java`), but:
- Table name: `docs_blog_topic`
- Remove `orderIndex` field
- Add fields: `category` (BlogTopicCategory enum), `tags` (TEXT column with `@Convert(converter = StringListConverter.class)`, entity field type `List<String>`), `featured` (Boolean default false), `publishedAt` (Date nullable), `coverColor` (String nullable), `coverEmoji` (String nullable), `author` (String nullable)
- Change contents type from `List<DesignTopicContent>` to `List<BlogTopicContent>`
- Keep: id, key, status, createdAt, updatedAt, prePersist/preUpdate, findContentByLocale

- [ ] **Step 5: Create BlogTopicContent entity**

Copy from `DesignTopicContent`, rename:
- Table name: `docs_blog_topic_content`
- `DesignTopic topic` → `BlogTopic topic`
- Package: `beyou.beyouapp.backend.docs.blog.entity`
- Everything else stays the same

- [ ] **Step 6: Create DTOs**

**BlogTopicListItemDTO:**
```java
package beyou.beyouapp.backend.docs.blog.dto;

import java.sql.Date;

public record BlogTopicListItemDTO(
    String key, String title, String summary, String category,
    String tags, boolean featured, Date publishedAt,
    String coverColor, String coverEmoji, String author, Date updatedAt
) {}
```

**BlogTopicDetailDTO:**
```java
package beyou.beyouapp.backend.docs.blog.dto;

import java.sql.Date;

public record BlogTopicDetailDTO(
    String key, String title, String docMarkdown, String category,
    String tags, boolean featured, Date publishedAt,
    String coverColor, String coverEmoji, String author, Date updatedAt
) {}
```

**BlogDocsImportRequestDTO** — same as DesignDocsImportRequestDTO but in blog package.

**BlogDocsImportResultDTO** — same as DesignDocsImportResultDTO but in blog package.

- [ ] **Step 7: Create DocsBlogNotFound exception**

Based on `DocsDesignNotFound`, change class name. Use a new error key `DOCS_BLOG_NOT_FOUND` — but do NOT modify `ErrorKey.java` yet (that would break existing design code still present). Instead, add `DOCS_BLOG_NOT_FOUND` as a new value alongside the existing one. The old value gets removed in Task 5 when old design code is deleted.

- [ ] **Step 8: Verify new blog package compiles in isolation**

```bash
cd /home/gentek/andP/beyou/Beyou-backend-spring
./mvnw compile -q 2>&1 | head -30
```

Expected: The new blog package compiles. Old design code still compiles too (ErrorKey not changed yet).

- [ ] **Step 9: Commit**

```bash
git add src/main/java/beyou/beyouapp/backend/docs/blog/ src/main/java/beyou/beyouapp/backend/exceptions/
git commit -m "feat: add blog entities, enums, DTOs, and exception class"
```

---

### Task 3: Backend Blog Repository and Service

**Files:**
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/BlogTopicRepository.java`
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/BlogTopicService.java`

Working directory: `/home/gentek/andP/beyou/Beyou-backend-spring`

- [ ] **Step 1: Create BlogTopicRepository**

Based on `DesignTopicRepository`. Key changes:
- Entity type: `BlogTopic` instead of `DesignTopic`
- Replace `findAllByStatusOrderByOrderIndex` with `findAllByStatusOrderByPublishedAtDescCreatedAtDesc` (or a custom `@Query` with `ORDER BY COALESCE(t.publishedAt, t.createdAt) DESC`)
- Keep: `findByKey` with `@EntityGraph`
- Keep: `searchByLocaleAndQuery` with `@EntityGraph` — update to use `BlogTopicStatus`
- Add: `findAllByStatusAndCategoryOrderByPublishedAtDesc` for category filtering

- [ ] **Step 2: Create BlogTopicService**

Based on `DesignTopicService`. Key changes:
- Use `BlogTopicRepository`, `BlogTopic`, `BlogTopicContent`, `BlogTopicStatus`, `BlogTopicCategory`
- `getTopics(String locale)` → `getTopics(String locale, String category, String tag)`
- Filter by category if provided (parse to `BlogTopicCategory` enum)
- Filter by tag if provided (check if tags JSON string contains the tag)
- `toListItemDTO` maps all new fields: category (enum name), tags (raw JSON string), featured, publishedAt, coverColor, coverEmoji, author
- `toDetailDTO` maps all new fields similarly
- Use `DocsBlogNotFound` instead of `DocsDesignNotFound`

- [ ] **Step 3: Verify compilation**

```bash
./mvnw compile -q 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/main/java/beyou/beyouapp/backend/docs/blog/BlogTopicRepository.java src/main/java/beyou/beyouapp/backend/docs/blog/BlogTopicService.java
git commit -m "feat: add blog repository and service with category/tag filtering"
```

---

### Task 4: Backend Blog Import Parser and Service

**Files:**
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/imp/BlogDocsImportParser.java`
- Create: `src/main/java/beyou/beyouapp/backend/docs/blog/imp/BlogDocsImportService.java`

Working directory: `/home/gentek/andP/beyou/Beyou-backend-spring`

- [ ] **Step 1: Verify SnakeYAML is available**

```bash
cd /home/gentek/andP/beyou/Beyou-backend-spring
./mvnw dependency:tree -q 2>&1 | grep -i snakeyaml
```

Expected: SnakeYAML should appear as a transitive dependency via `spring-boot-starter`. If not found, add it to `pom.xml`.

- [ ] **Step 2: Create BlogDocsImportParser**

Based on `DesignDocsImportParser`, but replace `parseSimpleYaml` with SnakeYAML:

```java
import org.yaml.snakeyaml.Yaml;
```

**Key changes to `parseTopicYaml`:**
- Use `new Yaml().load(content)` to get a `Map<String, Object>`
- Extract `key` (String), `status` (String → BlogTopicStatus enum)
- Extract new fields: `category` (String → BlogTopicCategory enum, default TECHNICAL), `tags` (List → JSON string via Jackson ObjectMapper), `featured` (Boolean, default false), `publishedAt` (parse as Date from string "YYYY-MM-DD"), `coverColor` (validate hex regex `^#[0-9a-fA-F]{6}$`, null if invalid), `coverEmoji` (String), `author` (String)
- Return new record `BlogTopicMetadata` with all fields

**Keep `parseMarkdown` unchanged** — front-matter parsing for title/summary/body works the same.

**Record changes:**
```java
public record BlogTopicMetadata(
    String key, BlogTopicStatus status, BlogTopicCategory category,
    String tags, boolean featured, java.sql.Date publishedAt,
    String coverColor, String coverEmoji, String author
) {}
```

- [ ] **Step 3: Create BlogDocsImportService**

Based on `DesignDocsImportService`. Key changes:
- Package: `beyou.beyouapp.backend.docs.blog.imp`
- Use `BlogTopicRepository`, `BlogDocsImportParser`, `BlogTopic`, `BlogTopicContent`, `BlogTopicStatus`
- `@Value("${docs.import.blog.path:blog}")` instead of design path
- `DEFAULT_PATH = "blog"` instead of `"design"`
- In `upsertTopic`: set new fields from metadata (category, tags, featured, publishedAt, coverColor, coverEmoji, author) instead of orderIndex
- Rename internal records: `DesignDocsImportTopic` → `BlogDocsImportTopic`, `DesignDocsImportContent` → `BlogDocsImportContent`
- Log message: `"No blog topics found"` instead of `"No design topics found"`

- [ ] **Step 4: Verify compilation**

```bash
./mvnw compile -q 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add src/main/java/beyou/beyouapp/backend/docs/blog/imp/
git commit -m "feat: add blog import parser (SnakeYAML) and import service"
```

---

### Task 5: Backend Controller, Search, Config, and Cleanup

**Files:**
- Create: `src/main/java/beyou/beyouapp/backend/controllers/docs/BlogDocsController.java`
- Modify: `src/main/java/beyou/beyouapp/backend/controllers/docs/DocsImportController.java`
- Modify: `src/main/java/beyou/beyouapp/backend/docs/search/SearchService.java`
- Modify: `src/main/resources/application.yaml`
- Delete: `src/main/java/beyou/beyouapp/backend/docs/design/` (entire package)
- Delete: `src/main/java/beyou/beyouapp/backend/controllers/docs/DesignDocsController.java`
- Delete: `src/main/java/beyou/beyouapp/backend/exceptions/docs/DocsDesignNotFound.java`
- Delete: `src/test/java/beyou/beyouapp/backend/docs/design/` (test package)

Working directory: `/home/gentek/andP/beyou/Beyou-backend-spring`

- [ ] **Step 1: Create BlogDocsController**

Based on `DesignDocsController`:
- `@RequestMapping("/docs/blog")` instead of `"/docs/design"`
- Inject `BlogTopicService`
- `getTopics` accepts additional `@RequestParam` for `category` and `tag`, passes to service
- `getTopic` stays the same pattern with blog types

- [ ] **Step 2: Update DocsImportController**

In `DocsImportController.java`:
- Change import from `DesignDocsImportService` → `BlogDocsImportService`
- Change import from `DesignDocsImportRequestDTO` → `BlogDocsImportRequestDTO`
- Change import from `DesignDocsImportResultDTO` → `BlogDocsImportResultDTO`
- Rename field `designImportService` → `blogImportService`
- Rename method `importDesign` → `importBlog`
- Change `@PostMapping("/design")` → `@PostMapping("/blog")`

- [ ] **Step 3: Update SearchService**

In `SearchService.java`:
- Replace imports: `DesignTopicRepository` → `BlogTopicRepository`, `DesignTopicStatus` → `BlogTopicStatus`
- Rename field `designRepository` → `blogRepository`
- Rename method `searchDesign` → `searchBlog`
- Change category strings: `"design"` → `"blog"`, `"designs"` → `"blogs"`
- Update all internal references to use blog types

- [ ] **Step 4: Update application.yaml**

Change (around line 69-70):
```yaml
# Before:
design:
  path: ${DOCS_IMPORT_DESIGN_PATH:design}

# After:
blog:
  path: ${DOCS_IMPORT_BLOG_PATH:blog}
```

- [ ] **Step 5: Delete old design package and files**

```bash
rm -rf src/main/java/beyou/beyouapp/backend/docs/design/
rm -f src/main/java/beyou/beyouapp/backend/controllers/docs/DesignDocsController.java
rm -f src/main/java/beyou/beyouapp/backend/exceptions/docs/DocsDesignNotFound.java
rm -rf src/test/java/beyou/beyouapp/backend/docs/design/
```

- [ ] **Step 5b: Clean up ErrorKey enum**

In `src/main/java/beyou/beyouapp/backend/exceptions/ErrorKey.java`: remove the old `DOCS_DESIGN_NOT_FOUND` value (added `DOCS_BLOG_NOT_FOUND` in Task 2).

- [ ] **Step 6: Verify full compilation**

```bash
./mvnw compile -q 2>&1 | tail -20
```

Expected: BUILD SUCCESS. If errors, fix remaining design references.

- [ ] **Step 7: Run tests**

```bash
./mvnw test -q 2>&1 | tail -20
```

Fix any test failures related to the rename.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add blog controller, update imports, delete old design package"
```

---

### Task 6: Frontend — Blog API Client and Shared Component Rename

**Files:**
- Create: `src/lib/blogApi.ts`
- Rename dir: `src/components/design/` → `src/components/markdown/`
- Rename: `DesignMarkdown.tsx` → `MarkdownContent.tsx` (inside the dir)
- Modify: `src/pages/Architecture.tsx` — update import path
- Modify: `src/pages/Projects.tsx` — update import path
- Modify: `src/components/dashboard/SystemOverview.tsx` — update import path

Working directory: `/home/gentek/andP/beyou/Beyou-docs-ui`

- [ ] **Step 1: Create blogApi.ts**

Create `src/lib/blogApi.ts` based on `designApi.ts` pattern. Changes:
- Types: `BlogTopicListItem` with all new fields (key, title, summary, category, tags, featured, publishedAt, coverColor, coverEmoji, author, updatedAt)
- Types: `BlogTopicDetail` with all new fields (key, title, docMarkdown, category, tags, featured, publishedAt, coverColor, coverEmoji, author, updatedAt)
- Add `estimateReadingTime` and `formatRelativeDate` functions (copy from `architectureApi.ts`)
- `fetchBlogTopics(locale?, category?, tag?)` — endpoint `/docs/blog/topics`, pass category and tag as query params if provided
- `fetchBlogTopicDetail(key, locale?)` — endpoint `/docs/blog/topics/{key}`

- [ ] **Step 2: Rename components/design/ to components/markdown/**

```bash
cd /home/gentek/andP/beyou/Beyou-docs-ui
mv src/components/design src/components/markdown
mv src/components/markdown/DesignMarkdown.tsx src/components/markdown/MarkdownContent.tsx
```

- [ ] **Step 3: Update MarkdownContent.tsx internal references**

Inside the renamed file, update the component name from `DesignMarkdown` to `MarkdownContent` and update any internal references.

- [ ] **Step 4: Update all import paths**

Update imports in ALL files that reference `components/design/`:
- `src/pages/Architecture.tsx`: `@/components/design/DesignMarkdown` → `@/components/markdown/MarkdownContent`
- `src/pages/Projects.tsx`: `@/components/design/DesignMarkdown` → `@/components/markdown/MarkdownContent` AND `@/components/design/MermaidBlock` → `@/components/markdown/MermaidBlock`
- `src/pages/Architecture.test.tsx`: update import from `@/components/design/MermaidBlock` → `@/components/markdown/MermaidBlock`
- `src/components/dashboard/SystemOverview.tsx`: import from `@/components/design/MermaidBlock` → `@/components/markdown/MermaidBlock`
- Grep for any other files importing from `components/design/` and update them

Also update the component name in JSX: `<DesignMarkdown` → `<MarkdownContent` in Architecture.tsx and Projects.tsx.

- [ ] **Step 5: Delete old designApi.ts**

```bash
rm src/lib/designApi.ts
```

- [ ] **Step 6: Verify dev server starts**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: May still have errors from Design.tsx — that's OK, it gets replaced in next task.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add blogApi, rename design components to markdown"
```

---

### Task 7: Frontend — Blog Page (Landing + Reading Views)

**Files:**
- Delete: `src/pages/Design.tsx`
- Create: `src/pages/Blog.tsx`

Working directory: `/home/gentek/andP/beyou/Beyou-docs-ui`

- [ ] **Step 1: Delete Design.tsx**

```bash
rm src/pages/Design.tsx
```

- [ ] **Step 2: Create Blog.tsx with landing view**

Create `src/pages/Blog.tsx` with:

**State management:**
- `searchParams` for `?post={key}` — when present, show reading view; when absent, show landing
- `topics` state from `fetchBlogTopics`
- `selectedPost` state from `fetchBlogTopicDetail` (when `?post` is set)
- `categoryFilter` state: `"all" | "technical" | "planning"`
- `searchQuery` state for text search
- `locale` derived from i18n language

**Landing view (`?post` absent):**
- Header: "Blog" title + post count
- Filter bar: category pills (All / Technical / Planning), search input
- Featured hero section: find first topic with `featured === true`. **If no featured post exists, skip the hero entirely and show all posts in the grid.**
  - Gradient background using `coverColor`, large emoji, category label, title, summary, tags, author, reading time (calculated via `estimateReadingTime`), formatted date
  - Clickable → navigates to `?post={key}`
- Recent posts grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
  - Cards with emoji, category label (colored: purple for technical, blue for planning), title, summary, tags (max 3), date
  - Hover: border highlight with primary color
  - Click → navigates to `?post={key}`
- Empty states: no posts message, no filter matches with clear button
- Loading state: show loading text or subtle skeleton placeholders while fetching
- Framer Motion: staggered card entrance

**Reading view (`?post` present):**
- Back button → clears `?post` param
- Post header: category badge, tag chips, large title, author avatar (first letter circle) + name + date + reading time
- Content area: `max-w-[680px] mx-auto`, glass panel, `<MarkdownContent content={detail.docMarkdown} />`
- Loading/error states

**Key imports:**
- `MainLayout`, `MarkdownContent` (from `@/components/markdown/MarkdownContent`)
- `fetchBlogTopics`, `fetchBlogTopicDetail`, `estimateReadingTime`, `formatRelativeDate` (from `@/lib/blogApi`)
- `parseTags` (from `@/lib/projectApi`)
- `motion` from `framer-motion`
- `useTranslation`, `useSearchParams`, `useMemo`, `useState`, `useEffect`, `useCallback`
- `Badge` from `@/components/ui/badge`
- `Input` from `@/components/ui/input`
- `cn` from `@/lib/utils`

- [ ] **Step 3: Verify the page renders**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Blog.tsx
git commit -m "feat: add Blog page with hybrid grid landing and reading view"
```

---

### Task 8: Frontend — Navigation, Routing, i18n, and References Cleanup

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/pages/Index.tsx`
- Modify: `src/pages/SearchPage.tsx`
- Modify: `src/lib/searchApi.ts`
- Modify: `src/components/dashboard/RecentActivity.tsx`
- Modify: `src/components/dashboard/QuickAccessCards.tsx`
- Modify: `src/pages/Projects.tsx` (designTopicKey link)
- Modify: `src/translations/en/translation.json`
- Modify: `src/translations/pt/translation.json`

Working directory: `/home/gentek/andP/beyou/Beyou-docs-ui`

- [ ] **Step 1: Update App.tsx**

- Line 11: `import Design from "./pages/Design"` → `import Blog from "./pages/Blog"`
- Line 30: `<Route path="/design" element={<Design />} />` → `<Route path="/blog" element={<Blog />} />`

- [ ] **Step 2: Update Sidebar.tsx**

- Line 8: Replace `Palette` import with `Newspaper` from lucide-react
- Line 24: `{ icon: Palette, label: "Design", path: "/design" }` → `{ icon: Newspaper, label: "Blog", path: "/blog" }`
- Line 108-109: `item.path === "/design" ? t("nav.design")` → `item.path === "/blog" ? t("nav.blog")`

- [ ] **Step 3: Update Index.tsx**

- Import: `fetchDesignTopics` → `fetchBlogTopics` from `@/lib/blogApi`
- Import: `DesignTopicListItem` → `BlogTopicListItem` from `@/lib/blogApi`
- All references to `designs` variable → `blogPosts`
- `latestDesign` → `latestBlogPost`
- Activity type `"design"` → `"blog"`
- Route link `/design` → `/blog`
- Translation keys `home.activity.defaults.design` → `home.activity.defaults.blog`

- [ ] **Step 4: Update SearchPage.tsx**

- Line 56: Category id `"design"` → `"blog"` with label from `t("search.categories.blog")`
- Lines 128-129: Case `"design"` → `"blog"` (icon can stay FileText or change to Newspaper)
- Lines 141-142: Route `/design?topic=` → `/blog?post=`

- [ ] **Step 5: Update searchApi.ts**

- Line 33: Type union — replace `"design"` with `"blog"` in the SearchResult type

- [ ] **Step 6: Update RecentActivity.tsx**

- Line 8: ActivityItem type — replace `"design"` with `"blog"`
- Line 25: typeConfig entry — rename key from `"design"` to `"blog"`

- [ ] **Step 7: Update QuickAccessCards.tsx**

- Lines 22-25: Change titleKey from `"home.quick.design.title"` to `"home.quick.blog.title"`, path from `"/design"` to `"/blog"`, update description key similarly

- [ ] **Step 8: Update Projects.tsx**

- Where `designTopicKey` is referenced for linking to the design page, update the link from `/design?topic=` to `/blog?post=`

- [ ] **Step 9: Update English translations**

In `src/translations/en/translation.json`, rename all `design` keys to `blog`:
- `nav.design` → `nav.blog`: "Blog"
- `home.quick.design.*` → `home.quick.blog.*`
- `home.activity.defaults.design` → `home.activity.defaults.blog`
- `home.stats.designs` → `home.stats.blogPosts`
- The entire `design.*` namespace → `blog.*` namespace with updated labels:
  - `blog.sidebar.title` → "Blog"
  - `blog.sidebar.search` → "Search posts..."
  - `blog.sidebar.topicCount` → "{{count}} posts"
  - `blog.empty` → "Select a post to read"
  - `blog.errors.loadTopics` → "Failed to load blog posts"
  - `blog.errors.loadDetail` → "Failed to load post"
  - `blog.topic.noDescription` → "No description"
  - `blog.topic.updated` → "Updated {{date}}"
- Add new blog-specific keys:
  - `blog.landing.title` → "Blog"
  - `blog.landing.featured` → "Featured"
  - `blog.landing.recent` → "Recent Posts"
  - `blog.landing.allCategory` → "All"
  - `blog.landing.technicalCategory` → "Technical"
  - `blog.landing.planningCategory` → "Planning"
  - `blog.landing.noPosts` → "No blog posts yet"
  - `blog.landing.noMatches` → "No posts match your filters"
  - `blog.landing.clearFilters` → "Clear filters"
  - `blog.landing.minRead` → "{{count}} min read"
  - `blog.reading.backToAll` → "Back to all posts"
- `search.categories.design` → `search.categories.blog`: "Blog"
- `projects.detail.design.*` → `projects.detail.blog.*`

- [ ] **Step 10: Update Portuguese translations**

Same changes as English but with Portuguese labels:
- `nav.blog` → "Blog"
- `blog.landing.title` → "Blog"
- `blog.landing.featured` → "Destaque"
- `blog.landing.recent` → "Posts Recentes"
- `blog.landing.allCategory` → "Todos"
- `blog.landing.technicalCategory` → "Técnico"
- `blog.landing.planningCategory` → "Planejamento"
- `blog.landing.noPosts` → "Nenhum post no blog ainda"
- `blog.landing.noMatches` → "Nenhum post corresponde aos filtros"
- `blog.landing.clearFilters` → "Limpar filtros"
- `blog.landing.minRead` → "{{count}} min de leitura"
- `blog.reading.backToAll` → "Voltar para todos os posts"
- All other design → blog renames with Portuguese translations

- [ ] **Step 11: Verify full TypeScript compilation**

```bash
npx tsc --noEmit 2>&1 | head -40
```

Expected: No errors. Fix any remaining `design` references.

- [ ] **Step 12: Grep for any remaining design references**

```bash
grep -ri "design" src/ --include="*.ts" --include="*.tsx" --include="*.json" -l
```

Review results — some "design" references may be legitimate (e.g., "design system" in comments, CSS classes). Fix any that are leftover rename targets.

- [ ] **Step 13: Verify dev server starts and pages load**

```bash
npm run dev
```

Manually verify: navigate to `/blog`, check landing loads. Click a post if backend is running.

- [ ] **Step 14: Run linter and tests**

```bash
npm run lint 2>&1 | tail -20
npm run test 2>&1 | tail -20
```

Fix any lint errors or test failures (especially Architecture.test.tsx after import path changes).

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat: update navigation, routing, i18n, and all design→blog references"
```

---

### Task 9: Final Integration Verification

- [ ] **Step 1: Start backend and verify blog endpoints**

```bash
cd /home/gentek/andP/beyou/Beyou-backend-spring
./mvnw spring-boot:run
```

In another terminal:
```bash
# Import blog posts from arch-design repo
curl -X POST http://localhost:8099/docs/admin/import/blog

# List blog posts
curl http://localhost:8099/docs/blog/topics?locale=en

# Get single post
curl http://localhost:8099/docs/blog/topics/building-auth-system?locale=en
```

Verify responses include all new metadata fields.

- [ ] **Step 2: Start frontend and test full flow**

```bash
cd /home/gentek/andP/beyou/Beyou-docs-ui
npm run dev
```

Verify:
- `/blog` shows landing with featured hero + cards
- Category filter pills work
- Search works
- Clicking a card shows reading view
- Back button returns to landing
- Sidebar shows "Blog" with Newspaper icon
- Home page shows blog in recent activity
- Search page finds blog posts

- [ ] **Step 3: Build production bundles**

```bash
cd /home/gentek/andP/beyou/Beyou-docs-ui && npm run build
cd /home/gentek/andP/beyou/Beyou-backend-spring && ./mvnw package -DskipTests -q
```

Both should succeed.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: integration fixes for blog transformation"
```
