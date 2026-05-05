# Heiskell Headlines Automation

Server-side draft generator for Ghost.

## Schedule

- Morning: `0 8 * * *`
- Evening: `0 18 * * *`

## Environment

- `GHOST_ADMIN_API_URL` - usually `https://your-site.ghost.io`
- `GHOST_ADMIN_API_KEY` - Ghost integration key in `id:secret` format
- `GHOST_ADMIN_API_VERSION` - optional, defaults to `v5.0`
- `OPENAI_API_KEY` - enables live draft generation
- `OPENAI_MODEL` - optional, defaults to `gpt-5.2`
- `SOURCE_FEED_URLS` - newline or comma-separated RSS feed URLs
- `SOURCE_MANIFEST_PATH` - optional local file path, defaults to `sources.txt`

## Run

```bash
npm run run
```

## Ghost notes

This creates drafts, not published posts. Keep human review in Ghost until the workflow is stable.

## Deployment

Recommended simplest path:

1. Put this folder in a GitHub repo.
2. Add the secrets listed above in GitHub repository settings.
3. Let GitHub Actions run the schedule in `.github/workflows/generate-drafts.yml`.
4. Optionally use `workflow_dispatch` to test a run manually before the schedule starts.
5. Keep Ghost drafts for review until the output is stable.

## Pasting sources

You can paste URLs into a plain text file named `sources.txt`, one per line. The runner will read that file automatically on every run and merge it with `SOURCE_FEED_URLS`.

Example:

```txt
https://example.com/feed.xml
https://example.com/local-news.rss
https://example.com/news
```

## Best production setup

- Keep Ghost auth server-side only.
- Keep drafts in Ghost for review.
- Start with 1 to 3 RSS feeds, then expand.
- Add an editor approval step before switching any post type to publish.

## GitHub secrets to add

- `GHOST_ADMIN_API_URL`
- `GHOST_ADMIN_API_KEY`
- `GHOST_ADMIN_API_VERSION`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `SOURCE_FEED_URLS`