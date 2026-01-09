# Overview

This is a starter kit to build web apps. This file contains important information about the starter kit's tech stack, and how you build with it.

**The instructions in this file are intended for LLM agents only.**

## Tech stack

The starter kit uses TypeScript, Next.js, React, tRPC, and ChakraUI. Follow the existing conventions of the project when writing new code, falling back to Next.js conventions if no appropriate reference exists in the project.

## Project Structure

Understanding the project structure is critical for building features efficiently:

- **`src/app/`** - Next.js App Router pages and layouts
  - `page.tsx` - Main landing page (public, unauthenticated)
  - `admin/` - Authenticated pages and features
  - `api/[trpc]/` - tRPC API endpoint handler
- **`src/server/`** - Backend code
  - `modules/` - **tRPC routers should be organized here** by feature (e.g., `me/me.router.ts`, `auth/auth.router.ts`)
  - `trpc.ts` - tRPC initialization and middleware
  - `context.ts` - Request context creation
- **`src/models/`** - DynamoDB model definitions
- **`src/features/`** - Client-side hooks and utilities for features (e.g., `trpc.ts`, `auth.tsx`)
- **`src/components/`** - Reusable React components
- **`src/templates/`** - Layout templates
- **`src/schemas/`** - Zod validation schemas
- **`src/lib/`** - Shared utilities and libraries
  - `dynamodb/` - DynamoDB abstraction layer (do not modify)
  - `llm/` - LLM client wrapper
  - `auth/` - Authentication utilities
- **`src/theme/`** - ChakraUI theme customization
- **`tests/`** - Test files and mocks

**Key conventions:**

- Organize tRPC routers by feature in `src/server/modules/feature-name/feature-name.router.ts`
- Keep client-side feature logic in `src/features/`
- Place reusable components in `src/components/`
- Define data models in `src/models/` and re-export in `src/models/index.ts`

## Setup

1. Before writing any code, set up the development environment by performing these steps:
   a. Install Node.js and the latest version of the Java runtime.
   b. Run `npm install` in the app folder (to install dependencies).
   c. Run `cp .env.example .env.production.local` in the app folder (to create your .env file).
   d. Update or add these environment variables in `.env.production.local`, but do not change anything else:
   - `NEXT_PUBLIC_APP_NAME`: set it to the project title provided to you
   - `NEXT_PUBLIC_BASE_PATH`: set it to "/api/v1/projects/$PROJECT_ID/preview", where $PROJECT_ID is the project ID provided to you
   - `IS_SPACESHIP_PREVIEW`: set it to "1"
     e. Update the `tableNamePrefix` property in `src/models.config.ts` with the unique project ID provided.
     f. Start a local DynamoDB server by running `npm run dev:ddb:jar`. You can leave this running in the background.
     g. Edit `src/constants/branding.ts` and set the `APP_NAME` constant to the title of the app. When you need to rename the app, you should update this value.

## Capabilities

### Authentication

- This app supports authentication out of the box, but the login flow is disabled by default. If the use cases being built require authentication, update `src/app/page.tsx` and set the `enableSignIn` in `<AppPublicHeader>` prop to `true`.
- The authenticated entry point is at `src/app/admin/page.tsx`; to build a feature gated behind authentication, you can add it here. The main landing page at `src/app/page.tsx` should remain accessible to unauthenticated users.
- Authentication only supports email-based OTP, and cannot be tested by agents. Features gated behind authentication must be tested by users.
- To add a tRPC method that requires authentication, use `protectedProcedure` instead of `publicProcedure`. Within tRPC protected procedures, you can get the current user using the `ctx.user` property, which has the shape `{ email: string, name?: string, image?: string }`. Refer to `me.router.ts` for an example.
- Sending email OTPs uses the `PAIR_FOUNDRY_API_KEY` environment variable. This environment variable will be configured automatically. You do not need to set this value or tell the user to do so.

### Generative AI / LLMs

- This app supports LLM-powered features. Use this sparingly, and only if specifically requested for or if the use case can only be performed with an LLM.
- An `LLMClient` wrapper class has been provided at `src/lib/llm/LLMClient.ts`. This is a wrapper around the `ai` package from Vercel. You must use the LLMClient to invoke all LLM capabilities, either by using the methods provided in the class (e.g. `generateText`), or by getting the model using `getModel()` and using it when using methods from the `ai` package.
- You may only use models supported by the LLMClient class. The list of models and their capabilities is documented in the class. Unless requested otherwise by the user, prefer using the `claude-opus-4-5-20251101-v1:rsn` model.
- This uses the `PAIR_FOUNDRY_API_KEY` environment variable. This environment variable will be configured automatically. You do not need to set this value or tell the user to do so.

### Email sending

- If a use case requires an email to be sent, you may use the `sendMail` function exported from `src/lib/mail.ts`. This function requires the recipient email, email subject and body to be provided.
- This uses the `POSTMAN_API_KEY` environment variable. This environment variable will be configured automatically. You do not need to set this value or tell the user to do so.

## Development instructions

1. The main landing page of the app is rendered from `src/app/page.tsx`. Replace any placeholder content on this page with the implemented app. This will be the entry point to the app, so put the main app content here.
2. This app uses DynamoDB with a custom abstraction layer. You can define data models in the `src/models` folder. Refer to existing models, and the `lib/dynamodb/docs` folder as a reference. To add a model, follow these steps:
   a. Create a schema and model class in `src/models`. Refer to other models like `User` for examples.
   b. Re-export the model in `src/models/index.ts`. This step registers the model.
3. Do not modify any code in the `lib/dynamodb` folder.
4. The custom DynamoDB abstraction has slightly different CRUD methods than the AWS SDK. These are the important CRUD methods you should remember when writing code (all methods are async and are static properties of the model class):
   a. Creating: `create(<data>)`
   b. Reading: `get(<id>)` to get a single object, `getAll()` to get an array of objects (NOT `scan()`!)
   c. Updating: `update(<id>, undefined, <data>)`
   d. Deleting: `delete(<id>)`
5. You must implement any backend logic (queries and mutations of data) as tRPC methods. Avoid performing data fetching in Server Components, or implementing mutations as Server Actions. Follow these best practices with tRPC:
   - Use `publicProcedure` for endpoints that don't require authentication
   - Use `protectedProcedure` for endpoints that require authentication (provides `ctx.user`)
   - Always validate inputs using Zod schemas with `.input()`
   - Use `.query()` for read operations, `.mutation()` for write operations
   - Handle errors gracefully on the client side
   - Invalidate queries after mutations to keep data fresh
6. When you finish implementing the app, update the title and "Features" section of the existing README.md file in the project root with a brief summary of the app's features and tech stack. Keep this file up to date as you iterate on the app.
