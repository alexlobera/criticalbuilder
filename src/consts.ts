// Site-wide settings. Edit these to change the copy shown across the site.

export const SITE_TITLE = 'Critical Builder';

// Used for the home page intro, meta description and RSS feed.
// TODO: rewrite in your own words.
export const SITE_DESCRIPTION =
  'Notes on building software, and on thinking critically about how it gets built.';

// Big heading at the top of the home page.
export const HOME_HEADING = 'Hello, World!';

export const AUTHOR = 'Alex Lobera';

export const SITE_LANG = 'en';

// Top-level navigation. Add /about, /consulting, /blog, etc. here as they're created.
export const NAV_LINKS: { href: string; label: string }[] = [
  { href: '/', label: 'Home' },
  { href: '/newsletter', label: 'Newsletter' },
];
