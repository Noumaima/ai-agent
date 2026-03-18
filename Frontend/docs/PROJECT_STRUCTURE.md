# Project structure

This repo uses a **feature-module** layout under `src/modules/` and a **shared UI** layer under `src/components/`.

## Conventions

- **Path alias**: use `@/` to import anything under `src/` (configured in `tsconfig` + `vite.config.ts`).
- **Barrel exports**: use `index.ts` files to re-export module entrypoints so imports stay stable.
- **Module boundaries**:
  - Put screen-level pages and module-specific components inside the module folder.
  - Put reusable cross-module components in `src/components/`.
  - Put shadcn/ui components in `src/components/ui/`.

## `src/` overview

- **`api/`**: endpoint definitions and API helpers
- **`components/`**: shared components
- **`components/ui/`**: shadcn/ui components and aggregating exports
- **`config/`**: app configuration (env, constants)
- **`layout/`**: layout shells (app frame, headers, nav)
- **`lib/`**: reusable utilities (formatting, fetch wrappers, helpers)
- **`mock/`**: mock data / mock services
- **`modules/`**: feature modules
  - **`modules/public/`**: public features/screens
  - **`modules/private/`**: authenticated features/screens
- **`providers/`**: React context/providers composition
- **`routes/`**: routing provider + route exports (central place to define navigation)
- **`types/`**: shared TypeScript types
