# Chrome Web Store listing

Text to paste into the Chrome Web Store developer dashboard. Images are in this folder.

Don't use the files in `src/_locales/store`: they are Dark Reader's own store listing, kept to make upstream merges easier.

## Store listing tab

**Name:** Nocturne

**Summary** (from the manifest, 132 characters at most):
Dark mode for every website, including images, canvases and PDFs. Based on Dark Reader.

**Category:** Accessibility

**Language:** English

**Description:**

```
Nocturne shows every website in dark colors. It's on as soon as you install it.

What it darkens
- Pages, including sites that have no dark theme of their own
- Bright images and diagrams, while photos keep their colors
- Canvases, such as charts and drawing apps
- Content inside web components that other dark mode extensions can't reach
- PDF files, in Chrome's viewer or in Nocturne's own viewer

What you control
- Turn Nocturne off for one site, or darken only the sites you choose
- Switch between dark and light mode
- Adjust brightness, contrast, sepia and grayscale
- Turn it on automatically at set times, from sunset to sunrise, or when your system is dark
- Keyboard shortcuts: Alt+Shift+D turns Nocturne on or off, Alt+Shift+A changes the current site

Built for accessibility
The toolbar menu and settings work with a keyboard and a screen reader, and all text meets a 7:1 contrast ratio.

Privacy
Nocturne processes pages on your device. It has no analytics or ads and doesn't collect your data.

Credit
Nocturne is based on Dark Reader by Alexander Shutau and Dark Reader Ltd., used under the MIT License. Nocturne is not affiliated with or endorsed by Dark Reader Ltd. Source code: https://github.com/dbuik1/darkreader
```

**Upload:** run `npm run build`, then upload `build/release/darkreader-chrome-mv3.zip`.

**Screenshots** (1280 x 800): screenshot-1-every-site.png, screenshot-2-per-site.png, screenshot-3-settings.png

**Small promo tile** (440 x 280): promo-small-440x280.png

**Homepage URL:** https://github.com/dbuik1/darkreader

**Support URL:** https://github.com/dbuik1/darkreader/blob/main/nocturne/HELP.md

## Privacy practices tab

**Single purpose:**
Nocturne changes the colors of websites so they display in a dark theme.

**Permission justifications:**

| Permission | Justification |
| --- | --- |
| Host permission (all sites) | Nocturne darkens any website the user opens, so its content script must run on every site. It also downloads images and stylesheets that a page uses, from the page's own sites, to work out their colors. |
| scripting | Registers Nocturne's content scripts and darkens tabs that were already open when the user installed or turned on the extension. |
| storage | Saves the user's settings, such as color mode, site list and schedule. |
| alarms | Turns dark mode on and off on the schedule the user sets. |
| fontSettings | Lists the user's installed fonts when they choose a font override. |
| contextMenus (optional) | Requested only when the user turns on "Add to the right-click menu" in settings. Adds menu items to turn Nocturne on or off for a site. |

**Remote code:** No, I am not using remote code. Optional site-fix lists are data files, not code.

**Data usage:** Check "Website content" only if the form asks about content the extension reads. Nocturne processes it locally and doesn't transmit it. Then certify all three statements: data isn't sold, isn't used for unrelated purposes, and isn't used for creditworthiness or lending.

**Privacy policy URL:** https://github.com/dbuik1/darkreader/blob/main/nocturne/PRIVACY.md
