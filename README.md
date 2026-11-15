# Code & Bourbon Lock

A safe-dial prototype built with React and Vite. Turn right to 32, left to 15, then right to 7 to reveal the invitation.

Live site: https://daveseidman.github.io/combolock/

Hold your phone flat with the screen facing up and turn it like a dial, or drag the dial on desktop. The app uses iPhone compass headings or the browser's absolute orientation, with relative rotation as a fallback. Phone motion requires a secure context and permission from the user. The screen shows whether a compass or rotation stream is connected and reports permission problems.

## Development

```sh
npm ci
npm run dev
```

## GitHub Pages

```sh
npm run build
```

Commit the source changes and regenerated `docs/` directory, then push to `main`. GitHub Pages publishes from `main` → `/docs`. The relative asset paths support deployment under a repository URL.

The combination is part of the frontend source; this is an interaction prototype, not access control for confidential content.
