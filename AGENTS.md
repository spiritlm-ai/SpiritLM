# SpiritLM Project Guidelines

## Project structure

- `src/app/(app)/page.tsx` composes the public landing page.
- `src/app/(app)/_components/` contains focused landing page sections, including navigation, header, catalog, agents, and footer.
- `src/app/dashboard/` contains the account overview, model catalog, API keys, and documentation, with route-specific components under `_components/`.
- `src/app/auth/` contains Clerk sign-in/sign-up pages and shared authentication components.
- `src/app/api/dashboard/` contains authenticated account API routes; `src/app/v1/` contains the OpenAI-compatible models and chat completions routes.
- `src/actions/<operation>/` contains database operations, each with `index.ts` for the handler, `schema.ts` for Zod validation, and `types.ts` for action-local input/result types.
- `src/lib/` contains shared infrastructure and orchestration: Prisma initialization, transactions, safe-action helpers, authentication, HTTP clients, model discovery, and chat proxying.
- `src/components/ui/` contains shared UI primitives; `src/components/modals/` contains shared dialogs.
- `src/app/globals.css` contains only Tailwind imports and configuration; do not add page or component styles there.
- `src/configs/` contains reusable configuration organized by purpose and page/category:
  - `consts/` contains constants in focused files such as `api.const.ts` and `models.const.ts`; do not collect unrelated values in a generic `spiritlm.consts.ts`.
  - `types/` contains focused shared data types, grouped by category such as models, API responses, proxying, actions, and component props. Keep action-local `InputType` and `ReturnType` beside their action.
  - `paths/` contains public asset paths in `images.paths.ts`, routes, API endpoints, and in-page anchors in `pages.paths.ts`, and external destinations only in `links.paths.ts`.
- `public/` contains the brand assets and model icons used by the site.
- `prisma/` contains the MySQL schema and versioned migrations; `prisma.config.ts` configures Prisma CLI access.
- `scripts/` contains environment loading, database initialization, manual balance credits, and the diagnostic proxy command.
- `tests/*.test.ts` contains unit tests; `tests/integration/` contains integration scenarios split by domain; `tests/helpers/` contains shared fixtures and upstream mocks.

## Implementation rules

- Preserve the existing landing page, dashboard, authentication, and API routes. Add new routes only when the product brief requires them.
- Keep page composition in `page.tsx`; put section markup and behavior in the matching component under `_components/`.
- Keep reusable API values, model data, page paths, links, and shared types in focused files under `src/configs/`. Do not move page or button copy into configuration; write user-facing text in the relevant page component.
- Export these path configuration objects as `IMAGES`, `PATHS`, and `LINKS`, with uppercase property names. Keep external destinations such as Telegram in `LINKS`; keep in-page anchors in `PATHS`.
- Organize image paths to mirror the `public/` directory structure (for example, `AI.OPENAI` maps to `/ai/gpt.png`). Import public images from `src/configs/paths/images.paths.ts`.
- Keep model groups data-driven. Render each provider and its models from `src/configs/consts/models.const.ts` instead of writing repeated cards by hand.
- Display model prices as sample values until the product owner confirms production rates. Keep this status documented next to the values in the configuration.
- Use real destinations for links. For in-page actions, point to an existing section anchor; do not add links to routes that do not exist.
- Preserve semantic HTML, descriptive image alt text, keyboard focus states, and responsive layouts.
- Style pages and components with Tailwind utility classes or shadcn/ui. Do not add page/component selectors to `src/app/globals.css` or create custom `auth-*` styling classes.
- Follow the existing SpiritLM visual system in `DESIGN.md` and reuse its brand assets from `public/`.

## Database and actions

- Put application database queries in `src/actions/`; keep route handlers focused on request parsing, authorization boundaries, calling actions, and HTTP responses. Keep stream handling and upstream orchestration in `src/lib/`.
- Follow the existing action pattern: a typed `handler`, a Zod input schema, and `createSafeAction` from `src/lib/create-safe-action.ts`. Use descriptive operation names for exports.
- Public Server Actions use `"use server"`, export async functions, and independently verify the Clerk session and resource ownership. Derive the current user on the server rather than trusting a client-supplied user ID.
- Internal operations such as balance credits, API-key authentication, and request accounting must not become client-callable Server Actions. Call them only from trusted server code or administrative scripts.
- Use `ActionState` and `FieldsErrors` from `src/configs/types/actions.types.ts`. Use `unwrapAction` at callers that need exception-based handling, preserving `ApiError` status/code and existing HTTP response contracts.
- Reuse the Prisma client from `src/lib/db.ts`. Use Prisma ORM methods rather than raw SQL, `$queryRaw`, or `$executeRaw` in application code.
- Use `serializableTransaction` from `src/lib/transaction.ts` for competing balance, key-limit, and request-admission operations. It retries P2034 conflicts for at most the configured three attempts; never put upstream HTTP calls inside a retried transaction.
- Preserve exact Decimal arithmetic, idempotent balance operation IDs, account isolation, and UTC usage buckets. Keep Prisma connection settings and business limits in their appropriate configuration modules.
- Keep production schema changes in migrations. Do not use `prisma migrate reset` or `prisma db push` against the configured application database.

## HTTP and proxy behavior

- Use `ky` through `src/lib/http-client.ts` instead of direct `fetch` calls. Use `dashboardFetch` for client-side dashboard JSON requests.
- Preserve the shared defaults: no automatic retries, no built-in ky timeout, explicit HTTP-status handling, and `cache: "no-store"`. Keep operation-specific timeout and cancellation handling at the caller.
- Preserve the catalog timeout and the full generation timeout, including SSE streaming. Forward cancellation and retain stream backpressure, split UTF-8/CRLF handling, and request finalization.
- Keep upstream credentials server-side. Never return or log raw upstream/database errors that could expose credentials or private response bodies.
- Customer generation remains disabled until tariffs and transactional charging are implemented. Preserve sample-price status, diagnostic request accounting, and the distinction between unknown usage and zero tokens.

## Code style

- Format TypeScript, TSX, and CSS as readable multi-line code. Put object properties, JSX props, and long expressions on separate lines when needed.
- Use strict TypeScript types for shared configuration. Avoid `any` and avoid repeating string unions when a shared type exists.
- Use clear, descriptive names in English for code identifiers and comments. User-facing copy remains in Russian unless requested otherwise.
- Keep components small and specific to one page section. Extract shared values into `configs/` rather than building a generic component system for one-off markup.
- Do not add dependencies for simple formatting or UI needs when the existing stack can handle them.

## Before finishing changes

- Do not run `npm run build`.
- For code changes, run `npm run typecheck`, `npm run lint`, and relevant unit tests with `npm run test:unit`. Documentation-only changes need no application test run.
- For database/proxy changes, run `npm run test:backend` with a reachable, migrated `DATABASE_URL`. Keep integration tests independent of execution order, use isolated temporary users, and clean up their records.
- Keep upstream traffic mocked in automated tests; do not spend provider tokens. The diagnostic `proxy:smoke` command performs a real generation and is only for an explicitly requested live check.
- Keep integration scenarios in focused domain files and reusable setup in `tests/helpers/`; do not recreate a single stateful integration mega-suite.
- When changing the model catalog, confirm that provider icons load from `public/ai/` and that each model displays its configured price per 1 MTok.
