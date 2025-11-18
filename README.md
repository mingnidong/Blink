# Blink – Real-time Confusion Tracking

Blink is a lightweight audience feedback tool.

Speakers create a session and share a code. Audience members tap a button when they are confused. The host sees a time-based view of confusion during the session.

Built with:

- Next.js 16 (App Router)
- Supabase Postgres (free tier)
- Vercel (free tier)

## Getting Started (Local Development)

### 1. Clone the repository

```
git clone <your_repo_url>
cd blink
```

### 2. Install dependencies

```
npm install
```

### 3. Configure environment variables

Create a file called `.env.local` in the project root, then ask Amber for keys. 

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Run the development server

```
npm run dev
```

Open `http://localhost:3000`.

## Database Schema

Blink uses these tables:

- profiles
- sessions
- session_controls
- session_participants
- events

## Project Structure

```
blink/
├── app/
│   ├── layout.js
│   ├── page.js
│   ├── host/[id]/page.js
│   ├── join/[code]/page.js
│   └── api/
│       ├── auth/register/route.js
│       ├── sessions/route.js
│       ├── sessions/by-code/[code]/route.js
│       ├── sessions/[id]/events/route.js
│       └── sessions/[id]/summary/route.js
├── lib/
│   ├── supabaseClient.js
│   └── supabaseServer.js
├── app/globals.css
└── README.md
```

## Features

- Account creation
- Session creation
- Join by code
- Confusion button
- Heatmap timeline
- Session summary
- Dashboard with active and past sessions

## Deployment

Deploy on Vercel:

1. Push code to GitHub.
2. Import the repo in Vercel.
3. Add environment variables.
4. Deploy.

