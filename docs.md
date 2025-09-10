# onlyseries.towatch — Documentation

This document describes the app’s architecture, UX decisions, recent changes, and guidance for contributors.

## Summary of recent UI & behavior updates
- Franchise dialog: converted into a search-only modal. The modal contains a single search input that mirrors the main catalog search behavior: suggestions and matching franchise names appear only after the user types 2 or more characters. Selecting a match applies that franchise to selected movies. When the user types 2+ characters, an "Add "X"" button becomes available to immediately create and apply a new franchise name.
- Action bar cleanup: the standalone Share icon was removed from the top action row; sharing remains available in the three-dot menu. The Upload menu item no longer displays an upload glyph (keeps text). The reset option in the three-dot menu was renamed to "Reset All".
- Timer accuracy: the watch-time timer now respects both the watch-status filter (all/watched/unwatched) and the type filter (movies/series/all) so the aggregated minutes and counts reflect current filters.
- Dialog interactions & scroll behavior:
  - When any modal is open, body scrolling is disabled (document.body.style.overflow = 'hidden') so only the modal's scroll is used. This prevents double-scrolling and avoids content shifting.
  - Dialogs use max-height and overflow-y: auto so content remains accessible on small viewports.
- In-library search & pagination layout: the in-library search control is visible on tablet (md) and larger screens; pagination controls were changed from a 3-column grid to a flexible single-row layout so "Previous / Page / of / Next" stays on one line across sizes.
- Episode rating matrix (EpisodeRatingGrid): cells are responsive to viewport width; font sizes scale with cell sizes; sticky headers (left season column, top episode row, and top-left corner) have a consistent frosted-glass (backdrop blur) header style; cell text uses ellipsis and overflow rules to avoid overlap.

## Architecture & file responsibilities (updated)
- client/pages/Index.jsx
  - Core application logic: load/save bookmarks to localStorage, handle import/export, manage filters (watch + type), timer updates, selection mode for grouping, dialog visibility, and body scroll locking when dialogs are open.
  - Passes typeFilter to Timer component so time aggregation matches current filters.
  - Implements the franchise grouping workflow and now opens a search-only franchise dialog.

- client/components/SearchBar.jsx
  - Debounced catalog search with fuzzy ranking; suggestions appear only while typing (min 2 chars). SearchBar behavior is the template for the franchise dialog's search field.

- client/components/Timer.jsx
  - Aggregates watch time and counts and depends on bookmarks, watchFilter, and typeFilter.

- client/components/BookmarksGrid.jsx
  - Displays cards and franchise cards, pagination controls, and in-library search control. The in-library search control is visible on md+ screens.
  - Pagination layout uses a flex row and flexible center section to avoid wrapping.

- client/components/DialogBox.jsx
  - Details dialog for items and franchises. Dialogs were made scrollable with max-heights and improved responsive header metadata rendering. Clicking anywhere on the overlay closes the dialog; dialog click stops propagation.

- client/components/EpisodeRatingGrid.jsx
  - Responsive episode matrix. Key changes:
    - cellSize is computed from window.innerWidth and updates on resize (phone/tablet/desktop breakpoints).
    - computeFontSize() maps cellSize to a readable font-size and is used for headers, labels, and cell content.
    - Header elements (top row, left column, top-left corner) are sticky with a consistent frosted background (rgba + backdrop-filter) so grid items scroll underneath with readable header text.
    - Cell content is clipped with overflow rules and uses text-overflow: ellipsis to prevent overlapping numbers.

## UX rules & constraints
- Search UX: Suggestions appear only after 2 characters in both main search and franchise-dialog search (to match user preference). The Add action in the franchise dialog appears only after 2+ characters.
- Body scroll lock: while any modal is open the main page scroll is locked; dialogs manage their internal scroll area. This improves accessibility and prevents accidental background interactions.
- Sticky headers in episode matrix: both axes (top episodes and left seasons) remain sticky and visually separated with a frosted backdrop to avoid overlap with scrolling content.

## Developer notes & conventions
- localStorage key: onlyseries-bookmarks — the app serializes bookmark items directly.
- When adding or importing bookmarks, ensure addedAt is set (timestamp in ms). The app backfills addedAt when missing.
- Franchises are a simple string attribute on movie bookmark objects; the UI derives franchise cards by grouping items with the same franchise string.

## Testing & visual verification checklist
When you change UI around dialogs, grid, or search behavior, verify the following:
1. Open the franchise dialog and type fewer than 2 chars → no suggestions or Add button should appear; the hint should show.
2. Type 2+ chars → suggestions appear; selecting a suggestion applies the franchise and closes the dialog; Add "X" button appears and functions.
3. Open any dialog and try to scroll the background page → background must be locked and not scrollable; modal content must scroll when overflowing.
4. Open EpisodeRatingGrid in full screen and confirm:
   - Top row (E1..En) stays sticky on vertical scroll and uses frosted background.
   - Left column (S1..Sn) stays sticky on horizontal scroll and uses the same frosted background.
   - Top-left corner (S/E) is sticky and shares the same styling.
   - Episode cells scale down on small screens; numbers do not overlap and show ellipsis when necessary.
5. On tablet (md) screens the in-library search control is visible; on small phones it remains hidden.
6. Pagination controls remain on a single line on the widest supported mobile sizes and tablet.

## How to extend
- To add a persistent franchise list (instead of only deriving from existing movie objects), add a new storage key or extend the data model with a separate franchises array, provide create / delete endpoints (if a server-backed store is desired) and update the franchise-search modal to write into that structure.
- To support smaller/dense-tables for power users, expose an optional "compact cells" switch in EpisodeRatingGrid that applies a denser computeCellSize() mapping.

## Changelog (concise)
- Franchise dialog: refactor to search-first UX; Add button appears only after 2+ chars.
- Share button removed from top actions; Share preserved in three-dots menu.
- Upload menu item text kept; icon removed.
- Reset option renamed to "Reset All".
- Timer now reacts to both watch and type filters.
- Locked body scrolling when dialogs open; internal dialog scrolls supported with max-height.
- In-library search control visible on md and up; pagination controls reworked as a single flex row.
- EpisodeRatingGrid: responsive cells, responsive fonts, frosted sticky headers, and safe text overflow.


If you want me to also add an example JSON export, or a short "How to Use" quick guide for the new franchise dialog, tell me and I will add it below.
