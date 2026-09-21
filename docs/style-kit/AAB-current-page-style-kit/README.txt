AAB CURRENT PAGE STYLE KIT
==========================

Source: public_html (54)(1).zip
Prepared: 21 September 2026

PURPOSE
-------
This package preserves the shared files used by the current AAB application
pages and the current governed Formulation Workbench reference page.

There is no site.css file in the supplied website bundle. The shared visual
system is divided between:

  aab-local/app/aab-theme.v22.css
  aab-local/app/aab-shell.v22.css
  aab-local/app/aab-navigation.v24.css

SHARED BEHAVIOUR
----------------
  aab-local/app/aab-session.js
  aab-local/app/aab-chrome.v22.js
  aab-local/app/aab-navigation.v24.js
  aab-local/app/aab-features.v22.js
  aab-local/app/aab-shell.v22.js

RUNTIME CONFIGURATION
---------------------
  aab-local/app/country-runtime-public-config.php

WORKBENCH REFERENCE
-------------------
  aab-local/app/_rebuild/workbench.html
  aab-local/app/_rebuild/aab-live-intelligence.v1.css
  aab-local/app/_rebuild/aab-live-intelligence.v1.js

The Workbench's wb-* layout rules are currently contained in an inline <style>
block inside workbench.html. They are page-specific and are not part of the
three shared CSS files.

NEW PAGE STARTER
----------------
Use new-page-head-snippet.html as the dependency-order reference for pages
created in aab-local/app/_rebuild/.

IMPORTANT
---------
Keep this directory structure intact. The Workbench uses relative paths from
the _rebuild directory to the shared files one directory above it.

This package is a reference/style kit. It does not contain _rebuild/api.php or
the database/runtime implementation needed to make Workbench operations run.

