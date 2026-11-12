// Site-wide settings. Edit these to change the copy shown across the site.

export const SITE_TITLE = 'Critical Builder';

// Used for the home page intro, meta description and RSS feed.
// TODO: rewrite in your own words.
export const SITE_DESCRIPTION =
  'Notes on building software, and on thinking critically about how it gets built.';

export const AUTHOR = 'Alex Lobera';

export const SITE_LANG = 'en';

// Year shown in the home page margin.
export const ESTABLISHED = 2026;

// How many posts the home page lists before linking to /blog.
export const HOME_POST_COUNT = 5;

// Top-level navigation. Add /about, /consulting, etc. here as they're created.
export const NAV_LINKS: { href: string; label: string }[] = [{ href: '/blog', label: 'Blog' }];
