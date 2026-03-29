# Changelog

All notable changes to this project will be documented in this file.

## [0.0.1] - 2026-03-29

### Added

- Pagination for posts on the home page, improving loading performance on lower-powered devices, including the occasional Android watch.
- Light and dark theme switching support, with the dark theme powered by `sunset`. Special thanks to Codex and Firefox MCP for helping get it over the line.
- Hexo-style post summaries powered by the Markdown `more` marker, with automatic excerpt fallback when no marker is present.

### Changed

- The tags page now expands posts inline from the main tags index instead of immediately navigating to a secondary tag page.
- Subtle dotted separators have been added between posts on the home page, making the visual rhythm cleaner and easier to scan.
- Post summaries are now reused for article meta descriptions and RSS item descriptions, giving feeds and previews more substance.
- Home page post summaries now use a softer highlighted treatment, while the tag page remains intentionally compact and title-first.
