# StudyAce

StudyAce is a NEET/JEE study planner with Firebase Authentication, Firestore
sync, and a private admin control room at `/admin`.

## Firebase setup

1. In Firebase Authentication, enable **Email/Password**.
2. In Firebase Project settings, open your Web app configuration and copy it to
   `.env` using `.env.example` as the template. The old hardcoded API key was
   removed because it was rejected by Firebase.
3. Enable Cloud Firestore.
4. Publish `firestore.rules` in the Firebase console.
5. Every successful sign-up now writes a profile to `users/{uid}` and creates
   or syncs that user's study workspace at `studyaceData/{uid}`. The signed-in
   user's Firebase UID is the only identity used for these writes.

The Firebase Web API key is browser configuration, but it must be the key from
the same Firebase project as the Auth and Firestore services. The admin
password is never included in this repository or its ZIP. For the private admin
bootstrap route, set `FIREBASE_WEB_API_KEY` and `STUDYACE_ADMIN_PASSWORD` in the
API server environment.

## Admin panel

Visit `/admin` directly after signing in with the configured admin email. The
panel shows aggregate workspace counts, the current workspace's collections,
recent tasks, and every synced user workspace available under the Firestore
rules.

## Run

```bash
pnpm install
pnpm --filter @workspace/studyace run dev
```

## Deploy to Vercel

This repository includes a root `vercel.json` that builds the StudyAce app and
serves the generated `artifacts/studyace/dist/public` directory with SPA
fallback routing. Import the repository root into Vercel; do not set
`artifacts/studyace` as the project root.

In Vercel project settings, add the Firebase web configuration values from
`.env.example` as environment variables for the Production, Preview, and
Development environments. Vite exposes these variables to the browser only
when their names start with `VITE_`.