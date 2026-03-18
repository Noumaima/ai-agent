# React + TypeScript + Vite + shadcn/ui

This is a template for a new Vite project with React, TypeScript, and shadcn/ui.

## Project structure

- **`src/App.tsx`**: App entry component.
- **`src/routes/`**: App routing surface (router provider + route exports).
- **`src/modules/`**: Feature modules grouped by access level.
  - **`src/modules/public/`**: Public-facing screens/features
  - **`src/modules/private/`**: Authenticated/private screens/features
  - Each module folder should export from an `index.ts` (barrel) so routes/features can import from `@/modules/...`.
- **`src/components/`**: Shared components.
  - **`src/components/ui/`**: shadcn/ui components and re-exports.
- **`src/api/`**: API layer (endpoint definitions, clients, helpers).
- **`src/types/`**: Shared TypeScript types (e.g. routing types).
- **Imports**: Prefer the `@/` alias for anything under `src/`.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `src/components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```

## Scripts

```bash
pnpm dev
pnpm build
pnpm lint
pnpm format
pnpm typecheck
pnpm preview
```
