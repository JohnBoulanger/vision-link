# DentaLink — Frontend Technical Guide

> a concept-heavy reference for understanding the react/typescript patterns and techniques used in this dental staffing platform. read alongside the source code — file paths and line numbers are provided throughout.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Routing Architecture](#2-routing-architecture)
3. [Authentication System](#3-authentication-system)
4. [API Layer — Axios Interceptors](#4-api-layer--axios-interceptors)
5. [Route Protection](#5-route-protection)
6. [Real-Time Communication — Socket.IO](#6-real-time-communication--socketio)
7. [Negotiation Page Deep Dive](#7-negotiation-page-deep-dive)
8. [State Management Patterns](#8-state-management-patterns)
9. [Data Fetching Patterns](#9-data-fetching-patterns)
10. [Form Handling & File Uploads](#10-form-handling--file-uploads)
11. [Component Design Patterns](#11-component-design-patterns)
12. [TypeScript Techniques](#12-typescript-techniques)
13. [CSS & Theming](#13-css--theming)
14. [Workflow Walkthroughs](#14-workflow-walkthroughs--how-files-connect)
15. [Complete File Index](#15-complete-file-index)

---

## 1. Architecture Overview

### Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 19.2 | ui component library — functional components with hooks |
| TypeScript | 5.9 | static type safety for props, state, api responses |
| Vite | 8.0 | build tool and dev server (fast HMR, env vars via `import.meta.env`) |
| React Router | 7.13 | client-side routing with nested layouts |
| Axios | 1.14 | http client with request/response interceptors |
| Socket.IO Client | 4.8 | websocket communication for real-time negotiation chat |
| Leaflet + react-leaflet | 1.9 / 5.0 | interactive maps for business locations |

### Directory Structure

```
frontend/src/
├── main.tsx                 # react root — entry point
├── App.tsx                  # all route definitions + provider nesting
├── index.css                # global theme (css variables, reset, typography)
├── App.css                  # app-level styles
├── assets/                  # static images, fonts
├── utils/
│   └── api.ts               # shared axios instance with interceptors
├── hooks/
│   └── useDebounce.ts       # generic debounce hook
├── contexts/
│   ├── AuthContext/          # jwt auth state + login/logout
│   └── NegotiationContext/   # global active-negotiation flag + socket
├── components/              # reusable ui pieces (navbar, pagination, etc.)
└── pages/
    ├── Public/              # landing, business list (no auth required)
    ├── Auth/                # login, register, activation, password reset
    ├── Regular/             # regular user dashboard pages
    ├── Business/            # business user dashboard pages
    └── Admin/               # admin management pages
```

### Entry Point Chain

**`main.tsx`** (10 lines) creates the react root using the react 18+ `createRoot` api. the non-null assertion `document.getElementById("root")!` on line 6 is safe because vite's `index.html` guarantees that element exists. `StrictMode` wrapping causes effects to double-fire in development (helping catch cleanup bugs) but has no production impact.

**`App.tsx`** (126 lines) defines all routing and wraps everything in two context providers. the nesting order matters:

```
AuthProvider          ← outermost: manages auth state, no router dependency
  BrowserRouter       ← provides routing context
    NegotiationProvider  ← needs useNavigate(), so must be inside router
      Routes / Route     ← actual page rendering
```

this ordering exists because `NegotiationProvider` calls `useNavigate()` to auto-redirect users when a negotiation starts — and `useNavigate` requires a router context. `AuthProvider` has no router dependency, so it wraps everything.

---

## 2. Routing Architecture

### Concept: Nested Routes and Layout Routes

react router uses a tree of `<Route>` elements. when a `<Route>` has an `element` prop but **no `path` prop**, it becomes a **layout route** — it renders its element (which must include `<Outlet />`) and nests all child routes inside it. this is how shared ui (navbars, sidebars) wraps page content without re-mounting on every navigation.

### Three-Tier Layout Nesting

**App.tsx** organizes routes into three groups, each with a different layout wrapper:

**Tier 1 — Public Layout** (lines 59-73):
```jsx
<Route path="/" element={<Layout />}>
  <Route index element={<Landing />} />
  <Route path="login" element={<Login />} />
  ...
</Route>
```
`Layout` (`components/Layout/index.tsx`, 14 lines) renders `<Navbar />` + a `<main>` tag containing `<Outlet />`. every public page gets the navbar but no sidebar.

**Tier 2 — Protected Dashboard** (lines 76-118):
```jsx
<Route element={<ProtectedRoute allowedRoles={["regular"]} />}>
  <Route element={<DashboardLayout />}>
    <Route path="/jobs" element={<Jobs />} />
    ...
  </Route>
</Route>
```
two layers of layout routes stack:
1. `ProtectedRoute` — checks auth + role, renders `<Outlet />` if allowed
2. `DashboardLayout` — renders navbar + sidebar + `<Outlet />`

this means a request to `/jobs` first passes through `ProtectedRoute` (which might redirect to `/login`), then through `DashboardLayout` (which renders the sidebar), and finally renders the `Jobs` page inside the main content area.

**Tier 3 — Role Grouping** (lines 76, 89, 110):
three separate protected groups exist for `regular`, `business`, and `admin` roles. each passes different `allowedRoles` to `ProtectedRoute`. notably, both regular and business users share the same `Negotiation` component — it adapts based on the `role` from `useAuth()`.

### Concept: The Outlet Pattern

`<Outlet />` is react router's composition mechanism. a parent route renders `<Outlet />` where child route content should appear. this is analogous to `{children}` in regular react, but driven by the url. it appears in:
- `Layout` (line 10) — for public pages
- `ProtectedRoute` (line 27) — for auth gating
- `DashboardLayout` (line 69) — for dashboard content

### Full Route Map

| Path | Component | Role | Layout |
|---|---|---|---|
| `/` | Landing | public | Layout |
| `/businesses` | BusinessList | public | Layout |
| `/businesses/:businessId` | PublicBusinessProfile | public | Layout |
| `/login` | Login | public | Layout |
| `/register` | RegisterUser | public | Layout |
| `/register/business` | RegisterBusiness | public | Layout |
| `/activate/:resetToken` | AccountActivation | public | Layout |
| `/forgot-password` | ForgotPassword | public | Layout |
| `/reset-password/:resetToken` | ResetPassword | public | Layout |
| `/jobs` | Jobs | regular | Dashboard |
| `/jobs/:jobId` | JobDetail | regular | Dashboard |
| `/my-jobs` | MyJobs | regular | Dashboard |
| `/qualifications` | Qualifications | regular | Dashboard |
| `/position-types` | PositionTypes | regular | Dashboard |
| `/profile` | UserProfile | regular | Dashboard |
| `/negotiations/me` | Negotiation | regular | Dashboard |
| `/business/jobs` | BusinessJobs | business | Dashboard |
| `/business/jobs/new` | BusinessJobCreate | business | Dashboard |
| `/business/jobs/:jobId` | BusinessJobDetail | business | Dashboard |
| `/business/jobs/:jobId/candidates` | BusinessCandidates | business | Dashboard |
| `/business/jobs/:jobId/candidates/:userId` | BusinessCandidateDetail | business | Dashboard |
| `/business/jobs/:jobId/interests` | BusinessJobInterests | business | Dashboard |
| `/business/profile` | BusinessProfile | business | Dashboard |
| `/business/profile/edit` | BusinessProfileEdit | business | Dashboard |
| `/business/negotiations/me` | Negotiation | business | Dashboard |
| `/admin/users` | AdminUsers | admin | Dashboard |
| `/admin/businesses` | AdminBusinesses | admin | Dashboard |
| `/admin/qualifications` | AdminQualifications | admin | Dashboard |
| `/admin/position-types` | AdminPositionTypes | admin | Dashboard |
| `/admin/settings` | AdminSettings | admin | Dashboard |
| `*` | NotFound | public | Layout |

---

## 3. Authentication System

### Concept: React Context API

the **context api** solves the "prop drilling" problem — instead of passing `token`, `user`, `role` through every component as props, context makes them available to any descendant component via a hook. it has three parts:

1. **`createContext()`** — creates the context object with a default value
2. **`<Context.Provider value={...}>`** — wraps the component tree and provides the actual value
3. **`useContext()`** — any descendant reads the current value

### Context + Provider Separation

this codebase separates the context definition from its provider implementation:

**`AuthContext.ts`** (22 lines) — defines the *shape* of the context:
- line 4-12: `AuthContextType` interface declares what consumers can access: `token`, `user`, `role`, `isAuthenticated`, `loading`, `login()`, `logout()`
- line 14: `createContext<AuthContextType | null>(null)` — default is `null` (no auth state until provider mounts)
- line 16-21: `useAuth()` custom hook with a **null guard** — if someone calls `useAuth()` outside of an `<AuthProvider>`, it throws an error instead of silently returning null. this is a safety pattern that catches bugs at development time.

**`AuthProvider.tsx`** (99 lines) — the actual state management logic. this separation prevents circular imports (any component can import `useAuth` without pulling in the full provider logic) and keeps the hook importable anywhere.

### Concept: JSON Web Tokens (JWT)

a jwt is a three-part string: `header.payload.signature`, each base64-encoded. the **payload** contains claims like `role`, `accountId`, and `exp` (expiration timestamp in unix seconds). the server signs the token with a secret; the client can decode the payload (it's not encrypted, just encoded) but cannot forge a valid signature.

### Manual JWT Decoding (AuthProvider lines 7-11)

```ts
function decodeToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("invalid token format");
  return JSON.parse(atob(parts[1]));
}
```

`atob()` is a browser built-in that decodes base64 strings. this avoids an external jwt library dependency since we only need to *read* the payload, not verify the signature (the server handles verification).

### Token Lifecycle

1. **on app mount** (line 22): `useEffect` calls `loadUser()`
2. **load from storage** (line 26): reads jwt from `localStorage`
3. **decode + check expiry** (line 38-44): `payload.exp * 1000 < Date.now()` — jwt uses unix *seconds*, javascript uses *milliseconds*, so we multiply. expired tokens are removed immediately.
4. **determine role** (line 45-46): the jwt payload contains `role` (regular/business/admin)
5. **fetch profile** (lines 49-57): role determines which endpoint to call:
   - regular → `GET /users/me` (returns user profile)
   - business → `GET /businesses/me` (returns business profile)
   - admin → no endpoint needed, uses decoded jwt data directly (admin is a system role, not a user entity with a profile)
6. **set state** (line 59): `setUser`, `setIsAuthenticated(true)`

### Login Flow (lines 73-85)

```ts
async function login(email: string, password: string) {
  const response = await api.post("/auth/tokens", { email, password });
  localStorage.setItem("token", response.data.token);
  setToken(response.data.token);
  await loadUser();  // re-runs the full lifecycle above
}
```

the `login` function stores the jwt in `localStorage` (persists across page refreshes), then calls `loadUser()` to hydrate state. errors are caught and re-thrown with user-friendly messages using `axios.isAxiosError()` (a **type guard** — more on this in section 12).

### Logout (lines 88-94)

clears all five state variables and removes the token from `localStorage`. there's no server-side token invalidation — JWTs are **stateless** by design. the token simply becomes unusable once removed from the client.

---

## 4. API Layer — Axios Interceptors

### Concept: HTTP Interceptors

interceptors are middleware functions that run before every request or after every response. they provide **cross-cutting concerns** — behavior that applies everywhere — in a single place instead of repeating it in every api call.

### `utils/api.ts` (27 lines)

**line 3-5 — instance creation:**
```ts
const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});
```
`import.meta.env.VITE_BACKEND_URL` is vite's way of exposing environment variables. the `VITE_` prefix is required — vite only exposes env vars with this prefix to the client bundle (security measure to prevent leaking server-side secrets).

**lines 7-13 — request interceptor:**
before every outgoing request, this attaches the jwt token from localStorage as a `Bearer` authorization header. this eliminates the need to manually add auth headers in every api call throughout the app — any component that imports `api` gets authenticated requests for free.

**lines 16-25 — response interceptor:**
catches all 401 (unauthorized) responses globally. when a token expires mid-session, the server returns 401. instead of handling this in every component, the interceptor automatically clears the token and redirects to `/login`. this is a **single point of failure handling** — one place to manage session expiry for the entire app.

---

## 5. Route Protection

### `ProtectedRoute` (28 lines)

this component implements three sequential guards:

**guard 1 — loading** (line 15): while `AuthProvider` is still checking the stored token (async operation), show a `<LoadingSpinner />`. without this, users would briefly see a flash of the login page before being correctly shown the dashboard.

**guard 2 — authentication** (lines 18-20):
```tsx
if (!isAuthenticated) {
  return <Navigate to="/login" state={{ from: location }} replace />;
}
```
`state={{ from: location }}` saves the url the user was trying to reach. the login page can read this state and redirect back after successful login, creating a seamless "redirect-after-login" experience.

the `replace` prop on `<Navigate>` replaces the current history entry instead of pushing a new one. without it, the user would have to press "back" through the redirect, creating a confusing navigation loop.

**guard 3 — authorization** (lines 23-25): checks if the user's `role` is in the `allowedRoles` array. a regular user trying to access `/admin/users` would pass guard 2 (they're authenticated) but fail guard 3 (their role isn't "admin") and get redirected to `/`.

**line 27 — `<Outlet />`**: if all guards pass, renders the child routes. this makes `ProtectedRoute` a **layout route** — it wraps other routes rather than rendering a specific page.

---

## 6. Real-Time Communication — Socket.IO

### Concept: WebSockets vs HTTP

standard http is request-response: the client asks, the server answers. websockets establish a **persistent bidirectional connection** — either side can send messages at any time without the other requesting them. this is essential for real-time features like chat where the server needs to push messages to the client immediately.

**Socket.IO** adds reliability on top of raw websockets: automatic reconnection, room-based broadcasting, fallback to http long-polling if websockets aren't available, and structured event-based messaging.

### Backend: `socket.js` (163 lines)

this file sets up the server-side socket.io instance. understanding the server side is essential for understanding what the frontend receives and sends.

**connection + authentication (lines 15-35):**
when a client connects, the server immediately extracts the jwt from `socket.handshake.auth.token` (line 17). it verifies the token using the same secret key the auth system uses (line 27). invalid/expired tokens cause an immediate `socket.disconnect()`. on success, the socket object gets `userId` and `role` properties attached (lines 28-29), and the socket auto-joins a room named `account:<accountId>` (line 30).

**room system:**
socket.io **rooms** are named groups of sockets. when the server emits to a room, all sockets in that room receive the message. two room patterns are used:
- `account:<id>` — one per user, joined on connect. used for targeting a specific user (e.g., "your negotiation just started")
- `negotiation:<id>` — one per active negotiation, joined when negotiation begins. used for broadcasting chat messages and decision updates to both participants

**auto-rejoin on reconnect (lines 38-52):**
if a user refreshes the page during an active negotiation, their new socket connection needs to rejoin the `negotiation:` room. the server queries prisma for any active negotiation involving this user and auto-joins the room. this is a non-blocking `.then()` chain — if it fails, the socket still works for other purposes.

**rate limiting (lines 55-82):**
each socket connection tracks a message count with a 60-second sliding window. after 30 messages per minute, the server emits `negotiation:error` back to that specific socket. this is per-socket, not global — it prevents one user from flooding the chat without affecting others.

**message handling (lines 59-147):**
when a client emits `negotiation:message`, the server:
1. validates authentication (line 61)
2. checks rate limit (lines 70-82)
3. validates message content: text must be 1-2000 characters, negotiation_id must be a number (lines 88-101)
4. verifies the negotiation exists and is active (lines 103-113)
5. verifies the sender is a participant in that negotiation (lines 115-121)
6. verifies the negotiation matches the user's current active negotiation (lines 123-135)
7. broadcasts the message to the `negotiation:` room (line 146) — both parties receive it, including the sender

### Backend: `negotiationService.js` (367 lines)

this service contains the business logic for negotiations and is where socket events get **emitted from the server** in response to rest api calls.

**`createNegotiation` (lines 7-176):**
after creating the negotiation record in the database:
- lines 134-135: emits `negotiation:started` to both `account:` rooms — this is how both parties get notified even if they're on different pages
- lines 137-138: `socketsJoin` moves both users' sockets into the `negotiation:<id>` room, so future chat messages and updates are broadcast correctly

**`setDecision` (lines 237-364):**
after recording a decision (accept/decline) in the database:
- lines 297-316: if either party declines → status becomes "failed", interests are reset to null
- lines 319-333: if both accept → status becomes "success", job is marked "filled" with the worker assigned
- line 360: emits `negotiation:updated` to the `negotiation:` room — the other party's ui updates immediately without polling

**lazy expiry cleanup (lines 14-17, 247-250):**
before processing any create or decision request, the service runs `updateMany` to mark any expired negotiations as "failed". this is **lazy cleanup** — expired negotiations aren't cleaned up by a background job, but on-demand when someone makes a write request. this avoids the complexity of a scheduler while ensuring expired negotiations never block new ones.

### Frontend: `NegotiationProvider` (66 lines)

this context provider maintains a **global** socket connection and tracks whether the user has an active negotiation.

**why `useRef` for the socket (line 12):**
`useRef<Socket | null>` stores the socket without causing re-renders when it changes. `useState` would trigger a re-render every time the socket object updates, which is unnecessary — the socket is an imperative resource (you call methods on it), not declarative data (you don't render it).

**two separate `useEffect`s — one effect per concern:**
- **effect 1 (lines 19-33):** checks for an active negotiation via `GET /negotiations/me` on mount. sets `hasActiveNeg` boolean. this is a rest call, not socket-based.
- **effect 2 (lines 36-59):** creates the socket.io connection and listens for `negotiation:started`. when received, it sets `hasActiveNeg(true)` and auto-navigates to the negotiation page. line 50 checks `window.location.pathname` to avoid redundant navigation if the user is already there.

**cleanup (line 55-57):** the useEffect return function disconnects the socket. this runs when the component unmounts or when dependencies (`token`, `role`) change — preventing socket leaks (abandoned connections consuming server resources).

---

## 7. Negotiation Page Deep Dive

### `pages/Regular/Negotiation/index.tsx` (359 lines)

this is the most complex page in the app, combining rest api calls, socket.io real-time events, a countdown timer, and conditional rendering based on negotiation state. both regular users and business users share this exact same component.

### Page-Level Socket (lines 117-161)

the negotiation page creates its **own** socket connection, separate from the global one in `NegotiationProvider`. this is because the page needs fine-grained event handling specific to the negotiation view — the global socket only listens for `negotiation:started` (to trigger navigation), while this page-level socket handles four events:

**`negotiation:message` (lines 128-132):**
receives chat messages. the handler checks `msg.negotiation_id === negotiation.id` as a guard (in case stale messages arrive), then appends immutably:
```ts
setMessages((prev) => [...prev, msg]);
```
this is a **functional updater** — passing a function to `setState` instead of a value. it ensures we always work with the latest state, which is critical in socket handlers where closures might capture stale state.

**`negotiation:started` (lines 135-140):**
if the negotiation restarts (e.g., after job edit resets decisions), re-fetches from the server to get fresh data.

**`negotiation:updated` (lines 143-151):**
the key real-time update. when the other party makes a decision, the server emits this event. the handler updates negotiation state immutably:
```ts
setNegotiation((prev) =>
  prev ? { ...prev, status: data.status, decisions: data.decisions } : prev
);
```
the `prev ? ... : prev` guard handles the edge case where `prev` is null (shouldn't happen, but typescript requires it).

**`negotiation:error` (lines 154-156):**
server-side errors (rate limiting, validation failures) are displayed in the decision error message area.

### The Full Message Round-Trip

when a user types a message and hits send:
1. **frontend** (`handleSend`, line 169-178): emits `negotiation:message` via socket with `{ negotiation_id, text }`
2. **backend** (`socket.js`, lines 59-147): validates auth, rate limit, message content, participation — then broadcasts to the `negotiation:` room
3. **frontend** (line 128-132): both parties' `negotiation:message` handlers fire, appending the message to their local `messages` state
4. **frontend** (line 164-166): the messages `useEffect` triggers auto-scroll via `messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })`

the sender sees their own message because the server broadcasts to the entire room (including the sender). there's no optimistic local insertion — the message appears when the server confirms it.

### Accept/Decline Round-Trip

decisions use **rest**, not sockets, for the initial action — but the other party receives the update via socket:

1. **frontend** (`handleDecision`, lines 181-201): `PATCH /negotiations/me/decision` with `{ negotiation_id, decision }`
2. **backend** (`negotiationService.setDecision`): updates database, determines if negotiation succeeds/fails, emits `negotiation:updated` to the room
3. **frontend for other party** (lines 143-151): `negotiation:updated` socket handler fires, updating status and decisions immediately
4. **frontend for acting party** (line 190-191): the rest response also contains the updated state, so both parties update simultaneously

### Countdown Timer (lines 87-114)

**concept: `setInterval` with cleanup**

```ts
const id = setInterval(tick, 1000);
return () => clearInterval(id);
```

`setInterval` runs the `tick` function every 1000ms. the cleanup function (`return () => clearInterval(id)`) runs when the effect dependencies change or the component unmounts — without this, the interval would keep running forever (a **memory leak**).

the `tick` function (lines 93-108):
- calculates remaining seconds: `Math.floor((expiresAt - Date.now()) / 1000)`
- `Math.max(0, ...)` prevents negative values
- when timer hits 0: re-fetches negotiation state from the server to get the authoritative status (the server may have marked it as "failed" via lazy cleanup)

`formatCountdown` (lines 41-46) formats seconds as `mm:ss` using `String.padStart(2, "0")` for zero-padding.

**urgent warning** (line 235): when `secondsLeft <= 120` (2 minutes), a css class `neg-countdown-urgent` is applied, turning the timer display red.

### Role Detection (lines 222-228)

the same component serves both regular users and businesses. it determines whose decision is "mine" based on `role` from `useAuth()`:
```ts
const iAmCandidate = role === "regular";
const myDecision = iAmCandidate ? negotiation.decisions.candidate : negotiation.decisions.business;
const theirDecision = iAmCandidate ? negotiation.decisions.business : negotiation.decisions.candidate;
```

this is simpler and more reliable than comparing user IDs — the role directly maps to which decision field to use.

---

## 8. State Management Patterns

### Concept: useState, useRef, useEffect

these three hooks form the foundation of react state management:
- **`useState`** — declarative state that triggers re-renders when changed
- **`useRef`** — mutable container that persists across renders but does *not* trigger re-renders
- **`useEffect`** — side effects that run after render (api calls, subscriptions, timers)

### Form State with Computed Property Names

most forms use a single `useState` object instead of one `useState` per field:

```ts
const [form, setForm] = useState({ first_name: "", last_name: "", email: "" });

function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  setForm({ ...form, [e.target.name]: e.target.value });
}
```

the `[e.target.name]` syntax is javascript's **computed property name** — the input's `name` attribute determines which field to update. this means one handler serves all fields instead of writing `handleFirstName`, `handleLastName`, etc.

see: `RegisterUser`, `RegisterBusiness`, `BusinessJobCreate`, `BusinessProfileEdit`

### Immutable State Updates

react state must **never be mutated directly** — you must create new objects/arrays. the spread operator (`...`) is the primary tool:

**object update:**
```ts
setForm({ ...form, [field]: value })     // new object with one field changed
setJob(prev => prev ? { ...prev, ...updates } : prev)  // merge updates into existing
```

**array patterns:**
| Operation | Pattern | Example Location |
|---|---|---|
| update one item | `prev.map(item => item.id === id ? { ...item, ...changes } : item)` | Qualifications line 117 |
| remove one item | `prev.filter(item => item.id !== id)` | AdminPositionTypes |
| prepend | `[newItem, ...prev]` | AdminPositionTypes |
| append | `[...prev, newMsg]` | Negotiation line 130 |

the `prev.map()` pattern is especially important — it walks the array and returns a new array where only the matching item is changed. every other item passes through untouched (`item` without spread).

### Pagination State Pattern

used across 10+ pages with a consistent shape:

```ts
const [page, setPage] = useState(1);          // current page
const [count, setCount] = useState(0);         // total items from server
const limit = 10;                              // items per page (constant)
const totalPages = Math.ceil(count / limit);   // derived — not stored in state
```

`totalPages` is **derived state** — calculated from `count` and `limit` rather than stored separately. storing it would create a synchronization problem (what if `count` updates but `totalPages` doesn't?).

the `Pagination` component (`components/Pagination/index.tsx`, 30 lines) is a **controlled component** — it receives `page`, `totalPages`, and `onPageChange` as props and has no internal state. the parent component owns the page state and passes `setPage` as the callback.

### Per-Row Loading/Error States

for lists where each row has independent actions (suspend, verify, invite), loading and error states are tracked per-item:

```ts
const [actionLoading, setActionLoading] = useState<number | null>(null);  // which item id is loading
const [actionError, setActionError] = useState<Record<number, string>>({}); // error per item id
```

`actionLoading` being a single `number | null` means only one action can be in-flight at a time — clicking "suspend" on user 5 disables the button for user 5 specifically (`disabled={actionLoading === item.id}`) while other rows remain interactive.

see: `Qualifications` lines 51-52, `AdminUsers`, `Business/Candidates`

### Filter Reset to Page 1 (useRef Pattern)

**the problem:** when filters change, you want page to reset to 1. but `setPage(1)` triggers a re-render, and the fetch `useEffect` also depends on `page`. this could cause two fetches — one with the old page (from the filter-change render) and one with page 1 (from the setPage render).

**the solution** (`Regular/Jobs` lines 88-99):
```ts
const prevFiltersRef = useRef({ debouncedPosition, sortField, sortOrder });

useEffect(() => {
  const prev = prevFiltersRef.current;
  if (prev.debouncedPosition !== debouncedPosition || ...) {
    prevFiltersRef.current = { debouncedPosition, sortField, sortOrder };
    setPage(1);  // triggers a separate render that re-runs the fetch effect
  }
}, [debouncedPosition, sortField, sortOrder]);
```

`useRef` tracks the previous filter values across renders without causing re-renders itself. the effect compares current vs previous — if filters changed, it resets the page. the fetch effect then fires on the next render with `page === 1`.

### Boolean Toggle Pattern

for actions like suspend/unsuspend, verify/unverify, invite/withdraw — the pattern is:
1. send `!currentValue` to the api
2. on success, update local state: `prev.map(item => item.id === id ? { ...item, field: !item.field } : item)`
3. no full refetch needed — the local update reflects the server state

this is not "optimistic" (which updates *before* the server confirms) — it updates *after* server success, but without re-fetching the entire list.

---

## 9. Data Fetching Patterns

### Async useEffect Pattern

`useEffect` callbacks cannot be `async` directly (they must return either nothing or a cleanup function, not a promise). the standard pattern wraps an async function inside:

```ts
useEffect(() => {
  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/endpoint");
      setData(res.data);
    } catch (err) { ... }
    finally { setLoading(false); }
  }
  load();
}, [dependencies]);
```

every page follows this pattern. the dependency array controls when the effect re-runs — adding `[page]` means the fetch fires whenever the page number changes.

### Parallel Fetching with Promise.all

when a page needs data from multiple independent endpoints, `Promise.all` fetches them simultaneously instead of sequentially:

```ts
const [jobRes, interestsRes] = await Promise.all([
  api.get(`/jobs/${jobId}`),
  api.get("/users/me/interests", { params: { limit: 200 } }),
]);
```

this cuts loading time roughly in half compared to `await api.get(...); await api.get(...)`.

see: `Regular/JobDetail`, `Regular/Profile`

### Debouncing with useDebounce

**concept:** debouncing delays an action until a pause in activity. for search inputs, this prevents firing an api call on every keystroke — instead, it waits until the user stops typing.

**`hooks/useDebounce.ts`** (13 lines):
```ts
export default function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}
```

how it works:
1. every time `value` changes, a new `setTimeout` is created
2. the cleanup function (`return () => clearTimeout(handler)`) cancels the *previous* timeout
3. only when the user pauses for `delay` ms does `setDebouncedValue` actually fire
4. the component using the debounced value sees it update only after the pause

the `<T>` makes this a **generic hook** — it works with any type (string, number, etc.) without needing separate implementations.

used with 200-300ms delays across: `Regular/Jobs`, `AdminUsers`, `AdminBusinesses`, `AdminQualifications`, `AdminPositionTypes`, `AddressSearch`

### Error Handling Pattern

every api call uses `axios.isAxiosError()` as a **type guard** to safely access error response data:

```ts
catch (err) {
  const message = axios.isAxiosError(err)
    ? err.response?.data?.error || "Fallback message"
    : "Fallback message";
  setError(message);
}
```

`axios.isAxiosError(err)` narrows the type from `unknown` to `AxiosError`, making `err.response` accessible. the optional chaining (`?.`) handles cases where the response or its data might be undefined (e.g., network errors with no server response).

specific http statuses get special handling:
- **404** → "not found" messages
- **409** → "conflict" messages (e.g., "you already have a qualification for this position")
- **403** → "forbidden" / "not qualified" messages
- **401** → handled globally by the axios response interceptor (auto-logout)

---

## 10. Form Handling & File Uploads

### Controlled Components

all form inputs are **controlled** — their value comes from react state, and changes flow through event handlers:

```tsx
<input name="email" value={form.email} onChange={handleChange} />
```

the value is always in sync with state. this is react's "single source of truth" pattern — the input never has a value that state doesn't know about.

### `e.preventDefault()`

every form `onSubmit` handler calls `e.preventDefault()` to stop the browser's default form submission behavior (which would cause a full page reload, destroying react state).

### Client-Side Validation

forms validate before sending to the api. `BusinessJobCreate` (lines 76-95) checks:
- salary_min must be non-negative
- salary_max must be >= salary_min
- end_time must be after start_time
- start_time must be in the future

these checks provide immediate feedback without a server round-trip. the server also validates (defense in depth), but client-side validation improves ux.

### File Uploads with FormData

the browser's `FormData` api builds multipart requests for file uploads:

```ts
const formData = new FormData();
formData.append("file", file);
await api.put(`/qualifications/${qualId}/document`, formData, {
  headers: { "Content-Type": "multipart/form-data" },
});
```

see: `Qualifications` lines 130-150, `Regular/Profile`

### Hidden File Input Pattern

html file inputs are notoriously hard to style. the solution is a **hidden input + programmatic click**:

```tsx
// hidden input
<input type="file" accept="application/pdf"
  style={{ display: "none" }}
  ref={(el) => { fileRefs.current[q.id] = el; }}
  onChange={(e) => { /* handle file */ }}
/>

// visible button that triggers the hidden input
<button onClick={() => fileRefs.current[q.id]?.click()}>
  Upload PDF
</button>
```

`useRef` stores a reference to each hidden input element (keyed by qualification id). clicking the styled button programmatically clicks the hidden input, opening the native file picker.

see: `Qualifications` lines 228-246

### Status Transition Map

`Qualifications` lines 24-30 defines a lookup table for valid status transitions:

```ts
const ALLOWED_SUBMIT: Record<string, string | null> = {
  created: "submitted",
  rejected: "revised",
  approved: "revised",
  submitted: null,    // no further transition
  revised: null,      // no further transition
};
```

this is **data-driven ui** — the status transition button only renders when `ALLOWED_SUBMIT[currentStatus]` is non-null. the button label adapts based on the target status. this is cleaner than a chain of `if/else` statements and makes the valid transitions explicit and auditable.

---

## 11. Component Design Patterns

### DashboardLayout — Role-Conditional Sidebar

`components/DashboardLayout/index.tsx` (74 lines) uses **static data arrays** to define sidebar links per role:

```ts
const regularLinks = [
  { to: "/jobs", label: "Browse jobs" },
  { to: "/my-jobs", label: "My jobs" },
  ...
];
```

the active role selects which array to render (line 36-37). links use react router's `NavLink` with an `isActive` callback for highlighting the current page.

**the `end` prop** (line 54): for routes that share prefixes (e.g., `/business/jobs` and `/business/jobs/new`), `end` forces exact-match so the parent doesn't highlight when the child is active.

**live negotiation indicator** (lines 58-59): when `hasActiveNeg` is true (from `NegotiationContext`), a pulsing dot appears next to the "Negotiation" sidebar link — this is a visual cue that pulls users toward the active negotiation.

### Navbar — Conditional Rendering by Auth State

`components/Navbar/index.tsx` (146 lines) has four rendering blocks based on authentication:
- unauthenticated: sign in + register links
- regular: job browsing + qualifications + profile links
- business: job management + profile links
- admin: user/business/qualification management links

**deferred navigation** (line 18): `setTimeout(() => navigate("/login"), 0)` — the `0ms` timeout defers navigation to the next event loop tick. this lets react flush the auth state change (from `logout()`) before the route changes, preventing a flash of stale navbar links on the login page.

**logout confirmation** (lines 130-141): a popover appears on sign-out click, requiring confirmation. the `Escape` key handler (lines 28-32) dismisses it — a common accessibility pattern.

### Pagination — Reusable Controlled Component

`components/Pagination/index.tsx` (30 lines) is a textbook **controlled component**:
- receives `page`, `totalPages`, `onPageChange` as props
- has zero internal state
- **early return** (line 11): `if (totalPages <= 1) return null` — renders nothing if there's only one page
- disabled states at boundaries: `disabled={page <= 1}`, `disabled={page >= totalPages}`

### AddressSearch — External API Integration

`components/AddressSearch/index.tsx` (243 lines) is the most complex component. key techniques:

- **`AbortController`** (line 113): cancels in-flight fetch requests when the query changes. without this, an older slower request might overwrite results from a newer faster request (**race condition**).
- **`useId()`** (line 96): react 18+ hook that generates a stable, unique id for aria attributes. unlike random ids, these are consistent between server and client rendering.
- **aria combobox pattern**: `role="combobox"`, `aria-expanded`, `aria-controls`, `role="listbox"`, `role="option"` — makes the autocomplete accessible to screen readers.
- **`onMouseDown` with `preventDefault`** (line 232): prevents the input from losing focus (blur) before the click event registers on a suggestion. without this, clicking a suggestion would close the dropdown before the selection could be processed.

### MapEmbed — Leaflet Integration

`components/MapEmbed/index.tsx` (56 lines) solves a leaflet-specific problem: `MapContainer` ignores prop updates after its initial render. the `MapUpdater` inner component (lines 26-32) uses `useMap()` (from react-leaflet) to **imperatively** call `map.setView()` when lat/lon props change.

### Admin Settings — Data-Driven Rendering

`pages/Admin/Settings/index.tsx` (160 lines) defines a `SETTINGS` config array (lines 20-61) where each entry specifies:
- endpoint, field name, label, description
- display unit (minutes/days) and a **multiplier** to convert to the backend's native unit

the entire ui is driven by mapping over this array (line 122). each setting has independent save/loading/error/saved state tracked in a `Record<string, SettingState>`. the `updateState` helper (line 78-80) uses immutable nested updates:
```ts
setStates((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
```

---

## 12. TypeScript Techniques

### Interfaces for API Response Shapes

every page defines interfaces at the top for the data it expects from the api:

```ts
interface Job {
  id: number;
  status: string;
  position_type: { id: number; name: string };
  business: { id: number; business_name: string };
  salary_min: number;
  salary_max: number;
  start_time: string;
  end_time: string;
}
```

this gives you autocomplete, type checking, and documentation in one place. if the api response changes shape, typescript catches mismatches at build time.

### Generic Type Parameter

`useDebounce<T>` uses a generic `T` so it works with any value type:

```ts
const debouncedSearch = useDebounce<string>(searchTerm, 300);
const debouncedFilter = useDebounce<number>(filterId, 200);
```

without generics, you'd need separate hooks for strings, numbers, etc.

### Record<K, V> Utility Type

`Record<string, string>` creates an object type where keys are strings and values are strings. used for:
- status-to-css-class maps: `Record<string, string>`
- error-per-item tracking: `Record<number, string>`
- form state: `Record<string, string | number>`

### Union Types for Constrained Values

```ts
type Tab = "interests" | "invitations" | "confirmed";
```

only these three string values are allowed — typescript catches typos at compile time.

### Optional Chaining (`?.`)

```ts
err.response?.data?.error
user?.first_name?.[0]
```

short-circuits and returns `undefined` if any step in the chain is null/undefined, instead of throwing. eliminates verbose null checks.

### Non-Null Assertion (`!`)

```ts
document.getElementById("root")!
```

tells typescript "i guarantee this is not null". use sparingly — it bypasses safety checks. appropriate when you *know* the value exists (like the root element in vite's html template).

### Type Guards

```ts
if (axios.isAxiosError(err)) {
  // typescript now knows err has .response, .config, etc.
  err.response?.data?.error;
}
```

a type guard is a function that narrows a value's type within a conditional block. `isAxiosError` narrows `unknown` to `AxiosError`, making axios-specific properties accessible.

---

## 13. CSS & Theming

### Concept: CSS Custom Properties (Variables)

css variables (declared with `--name` in `:root`) provide a single source of truth for design tokens. changing `--accent: #5C8DC5` updates every element that references `var(--accent)`.

### Global Theme (`index.css`)

the "harbor haze" theme uses warm off-white tones with harbor blue accents:

| Variable | Value | Purpose |
|---|---|---|
| `--bg` | `#f7f5f2` | page background |
| `--accent` | `#5C8DC5` | primary blue (buttons, links) |
| `--error` | `#c1121f` | error red |
| `--success` | `#4a8b6e` | success green |
| `--accent-warm` | `#AD9E90` | taupe accent |
| `--font-body` | `"Sora"` | body text font |
| `--font-mono` | `"JetBrains Mono"` | code/mono font |

### Component-Scoped Styles

each component imports its own `style.css`. these aren't css modules (no automatic scoping) — they rely on class naming conventions to avoid collisions. the component name prefix (e.g., `.Negotiation`, `.Jobs`, `.AdminSettings`) acts as a namespace.

### Status Badge System

status badges use a consistent pattern:
```css
.qual-status-approved { background: var(--status-green-bg); color: var(--success); }
.qual-status-rejected { background: var(--error-bg); color: var(--error); }
.qual-status-submitted { background: var(--status-amber-bg); color: var(--status-amber-text); }
```

the class name follows the pattern `{component}-status-{statusValue}`, making it easy to derive the class from the data.

---

## 14. Workflow Walkthroughs — How Files Connect

### Walkthrough 1: Login → Dashboard

| Step | What Happens | File |
|---|---|---|
| 1 | user enters email + password, submits form | `pages/Auth/Login/index.tsx` |
| 2 | `login()` from `useAuth()` is called | `contexts/AuthContext/AuthProvider.tsx` line 73 |
| 3 | POST `/auth/tokens` → server returns jwt | `utils/api.ts` (attaches no auth header yet) |
| 4 | jwt stored in localStorage, `loadUser()` called | `AuthProvider.tsx` lines 75-78 |
| 5 | jwt decoded → role extracted → profile fetched from role-specific endpoint | `AuthProvider.tsx` lines 38-57 |
| 6 | `isAuthenticated` becomes true, component tree re-renders | `AuthProvider.tsx` line 59 |
| 7 | login page navigates to `/` or role-based dashboard | `Login/index.tsx` navigate call |
| 8 | `ProtectedRoute` checks auth + role, allows access | `components/ProtectedRoute/index.tsx` lines 15-27 |
| 9 | `DashboardLayout` renders sidebar with role-specific links | `components/DashboardLayout/index.tsx` lines 36-37 |

### Walkthrough 2: Express Interest → Negotiation

| Step | What Happens | File |
|---|---|---|
| 1 | regular user browses jobs, clicks one | `pages/Regular/Jobs/index.tsx` → Link to `/jobs/:id` |
| 2 | job detail loads, user clicks "express interest" | `pages/Regular/JobDetail/index.tsx` |
| 3 | PATCH `/jobs/:id/interested` with `{ interested: true }` | `Regular/JobDetail` |
| 4 | business user views candidates, clicks "invite" | `pages/Business/Candidates/index.tsx` |
| 5 | PATCH `/jobs/:jobId/candidates/:userId/interested` with `{ interested: true }` | `Business/Candidates` |
| 6 | user visits MyJobs page, sees mutual interest with "start negotiation" button | `pages/Regular/MyJobs/index.tsx` |
| 7 | POST `/negotiations` → server creates negotiation + emits `negotiation:started` | `backend/src/services/negotiationService.js` lines 110-138 |
| 8 | initiating party navigates to `/negotiations/me` via rest response | `Regular/MyJobs` |
| 9 | other party's `NegotiationProvider` receives `negotiation:started` via socket → auto-navigates | `contexts/NegotiationContext/NegotiationProvider.tsx` lines 47-53 |
| 10 | both parties land on negotiation page, socket connects, countdown starts | `pages/Regular/Negotiation/index.tsx` |
| 11 | chat messages flow: emit → server validates → broadcast → both receive | `socket.js` lines 59-147 + `Negotiation` lines 128-132, 169-178 |
| 12 | both accept → server marks negotiation "success" + job "filled", emits `negotiation:updated` | `negotiationService.js` lines 319-333, 360 |

### Walkthrough 3: Qualification Lifecycle

| Step | What Happens | File |
|---|---|---|
| 1 | user selects position type, adds notes, clicks "create qualification" | `pages/Regular/Qualifications/index.tsx` `handleCreate` line 78 |
| 2 | POST `/qualifications` → status is "created" | `Qualifications` line 83 |
| 3 | user clicks hidden file input via "upload pdf" button, selects file | `Qualifications` lines 228-246 |
| 4 | PUT `/qualifications/:id/document` with FormData → document path saved | `Qualifications` `handleDocUpload` line 130 |
| 5 | user clicks "submit for review" → PATCH status to "submitted" | `Qualifications` `handleStatusChange` line 111 |
| 6 | admin opens qualification review, expands the row | `pages/Admin/Qualifications/index.tsx` |
| 7 | admin clicks "approve" → PATCH `/qualifications/:id` with `{ status: "approved" }` | `Admin/Qualifications` |
| 8 | if rejected: user sees status change, clicks "mark as revised" → status becomes "revised" | `Qualifications` using `ALLOWED_SUBMIT` map line 24 |

---

## 15. Complete File Index

| File | Lines | Purpose |
|---|---|---|
| `src/main.tsx` | 10 | react root creation with StrictMode |
| `src/App.tsx` | 126 | route definitions + provider nesting |
| `src/index.css` | ~200 | global theme: css variables, reset, typography |
| **Utils & Hooks** | | |
| `src/utils/api.ts` | 27 | axios instance with auth + error interceptors |
| `src/hooks/useDebounce.ts` | 13 | generic debounce hook (setTimeout + cleanup) |
| **Contexts** | | |
| `src/contexts/AuthContext/AuthContext.ts` | 22 | auth context type + useAuth hook |
| `src/contexts/AuthContext/AuthProvider.tsx` | 99 | jwt auth state management |
| `src/contexts/NegotiationContext/NegotiationContext.ts` | 18 | negotiation context type + useNegotiation hook |
| `src/contexts/NegotiationContext/NegotiationProvider.tsx` | 66 | global socket + active negotiation tracking |
| **Components** | | |
| `src/components/Layout/index.tsx` | 14 | public layout: navbar + outlet |
| `src/components/DashboardLayout/index.tsx` | 74 | dashboard layout: navbar + sidebar + outlet |
| `src/components/ProtectedRoute/index.tsx` | 28 | auth + role guard (layout route) |
| `src/components/Navbar/index.tsx` | 146 | top nav with role-conditional links + logout confirmation |
| `src/components/Pagination/index.tsx` | 30 | reusable prev/next pagination |
| `src/components/PasswordInput/index.tsx` | 74 | password field with show/hide toggle |
| `src/components/AddressSearch/index.tsx` | 243 | address autocomplete with Nominatim API |
| `src/components/MapEmbed/index.tsx` | 56 | leaflet map with custom marker |
| `src/components/LoadingSpinner/index.tsx` | 9 | css loading animation |
| **Auth Pages** | | |
| `src/pages/Auth/Login/index.tsx` | 90 | login form with error handling |
| `src/pages/Auth/RegisterUser/index.tsx` | 139 | regular user registration |
| `src/pages/Auth/RegisterBusiness/index.tsx` | 187 | business registration |
| `src/pages/Auth/AccountActivation/index.tsx` | 79 | activate account via reset token |
| `src/pages/Auth/ForgotPassword/index.tsx` | 83 | request password reset |
| `src/pages/Auth/ResetPassword/index.tsx` | 114 | complete password reset |
| **Public Pages** | | |
| `src/pages/Public/Landing/index.tsx` | 134 | landing page with hero + stats |
| `src/pages/Public/BusinessList/index.tsx` | 122 | browse businesses (public) |
| `src/pages/Public/BusinessProfile/index.tsx` | 123 | single business profile (public) |
| **Regular User Pages** | | |
| `src/pages/Regular/Jobs/index.tsx` | 170 | browse open jobs with filters + sort + pagination |
| `src/pages/Regular/JobDetail/index.tsx` | 208 | job detail + express interest |
| `src/pages/Regular/MyJobs/index.tsx` | 282 | tab view: interests / invitations / work history |
| `src/pages/Regular/Qualifications/index.tsx` | 276 | manage qualifications + file upload |
| `src/pages/Regular/PositionTypes/index.tsx` | 135 | browse position types |
| `src/pages/Regular/Profile/index.tsx` | 343 | view/edit profile + avatar/resume upload |
| `src/pages/Regular/Negotiation/index.tsx` | 359 | real-time negotiation chat + timer + decisions |
| **Business Pages** | | |
| `src/pages/Business/Jobs/index.tsx` | 220 | business job list with status filters |
| `src/pages/Business/JobCreate/index.tsx` | 259 | create job posting form |
| `src/pages/Business/JobDetail/index.tsx` | 398 | job detail + edit + delete + status actions |
| `src/pages/Business/Candidates/index.tsx` | 133 | discoverable candidates for a job |
| `src/pages/Business/CandidateDetail/index.tsx` | 229 | candidate profile + invite toggle |
| `src/pages/Business/JobInterests/index.tsx` | 172 | users interested in a job |
| `src/pages/Business/Profile/index.tsx` | 187 | business profile view |
| `src/pages/Business/ProfileEdit/index.tsx` | 210 | business profile edit form |
| **Admin Pages** | | |
| `src/pages/Admin/Users/index.tsx` | 215 | user management: search + suspend/unsuspend |
| `src/pages/Admin/Businesses/index.tsx` | 254 | business management: search + verify |
| `src/pages/Admin/PositionTypes/index.tsx` | 394 | position type CRUD + inline edit |
| `src/pages/Admin/Qualifications/index.tsx` | 337 | qualification review: expandable rows + approve/reject |
| `src/pages/Admin/Settings/index.tsx` | 160 | system settings: data-driven config cards |
| **Backend (Socket)** | | |
| `backend/src/socket.js` | 163 | socket.io server setup: jwt auth, rooms, rate limiting, message handling |
| `backend/src/services/negotiationService.js` | 367 | negotiation CRUD + socket event emissions |
| **Other** | | |
| `src/pages/NotFound/index.tsx` | 12 | 404 catch-all page |
