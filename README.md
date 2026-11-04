# Still

A small, dependency-free mindful breathing app. Choose a 3, 5, or 10 minute session and follow a four-second inhale and six-second exhale. Completed sessions count toward a daily goal of three. Night mode and optional distinct inhale and exhale tones can be toggled in the app; both preferences are saved on the device.

Progress is stored in the browser's local storage, so it stays on that browser and device; clearing site data removes it. It does not sync across devices.

## Run locally

Serve this directory with any static file server, for example `python3 -m http.server 8000`, and visit http://localhost:8000.

## Deploy to Vercel

Import this directory as a Vercel project, or run `vercel` from this directory. It is a static site and requires no build command, dependencies, or environment variables.
