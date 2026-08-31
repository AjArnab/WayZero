# WayZero — SIH26124

A modular Next.js 14 (App Router) prototype of an urban incident + transit
command platform, mapped to the SIH26124 brief: onboard vision detection
(potholes, waterlogging, missing dividers/crossings, damaged signboards,
congestion, pedestrian risk), ANPR hit-and-run tracking, a GIS congestion
heat layer, route-delay / origin-destination analytics, municipal department
triage with automated notification, predictive/proactive maintenance
scoring, a public hazard-data API, an open research dataset export, a
route-broadcast + advisory bot, and a real onboard edge-detection image
scanner — backed by an **actual Node.js server**, not a client-side
simulation, and centered on **your real location with real nearby roads**
pulled from OpenStreetMap. No API keys required anywhere (one feature has an
*optional* upgrade path if you provide one — see below).

## Stack

- **Next.js 14** (App Router, `app/`)
- **Tailwind CSS** — design tokens in `tailwind.config.ts`
- **React-Leaflet** — dark-mode operations map
- **lucide-react** — icon set, also rendered into Leaflet markers via
  `react-dom/server`'s `renderToStaticMarkup`

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Structure

```
app/
  layout.tsx             Root shell: fonts, global CSS
  page.tsx               Client shell: fetches /api/state, subscribes to
                          /api/stream, renders every panel
  globals.css            Tailwind layers + Leaflet dark-mode + marker CSS
  api/
    state/route.ts        GET  — one-shot snapshot fetch
    stream/route.ts        GET  — Server-Sent Events, pushes live snapshots
    tickets/[id]/route.ts  PATCH — advance a ticket's status
    anpr/[id]/report/route.ts  POST — mark an ANPR report generated
    scan/route.ts          POST — REAL Laplacian edge-detection on an
                            uploaded photo, via `sharp`
    center/route.ts         POST — recenter on real GPS coords (Overpass/Nominatim)
    geocode/route.ts        POST — recenter on a typed place name
    advisory/ask/route.ts   POST — the advisory bot (rule-based, or real
                            Claude if ANTHROPIC_API_KEY is set)
    public/hazards/route.ts GET — public GeoJSON hazard feed, no auth
    public/dataset/route.ts GET — public anonymized CSV export, no auth
components/
  CommandMap.tsx          Fullscreen dark Leaflet map: buses, routes, incidents,
                          congestion density (heat) layer — real Esri/OSM tiles
  LiveFeed.tsx            Real-time detection stream, severity badges, snapshots
  AnprModal.tsx           ANPR case detail + "Generate Police Report"
  IncidentModal.tsx       Detail view for every OTHER incident type, with
                          a "Download Incident Report" button
  DepartmentPortal.tsx    Kanban triage board; auto-tag badges, predictive risk,
                          "Notify Department" intimation-letter download
  AnalyticsDashboard.tsx  Centralized-platform view: KPIs, incident/severity
                          breakdown, route delay, OD flows, 24h trend,
                          predictive-maintenance ranking, open-data links
  DefectScanner.tsx       Upload a road photo, get a REAL edge-detection result
  AdvisoryCenter.tsx      Route broadcast (real browser text-to-speech) +
                          the "Ask WayZero" advisory bot
lib/
  types.ts                Shared TypeScript contracts for every data shape
  mockTelemetry.ts        Synthetic GPS/CAN-bus/vision-anomaly + analytics generators
  serverStore.ts          THE REAL BACKEND — singleton server-side store,
                          runs the simulation loop, persists to .data/, and
                          broadcasts updates over SSE to every connected client
  roads.ts                Real Overpass/Nominatim lookups (roads + place names)
  predictive.ts           Predictive-maintenance risk scoring (age + severity)
  advisory.ts             Plain-English route advisories + the rule-based bot
```

## It runs on your real location, with real roads

On load, the app asks your browser for permission to use your location (a
normal browser geolocation prompt). If you allow it, the server tries THREE
independent strategies, in order, to get real road geometry:

1. **A local cache** (`.data/road-cache/`) — if real road data was ever
   successfully fetched for this spot before, it's reused instantly with
   zero network calls.
2. **OSRM's public routing engine** (`router.project-osrm.org`) — asks for
   an actual drivable route between several nearby points. Since OSRM only
   ever returns paths that exist on the real road network, this is
   guaranteed to visually follow real roads, no stitching required.
3. **Overpass API**, across 3 mirrors and up to 3 widening search radii —
   fetches raw tagged road segments and chains same-named ones end-to-end
   into long corridors (a real street is usually split into many short OSM
   "ways" at every intersection).

Whichever strategy succeeds gets cached to disk for next time. Only if
**all three fail** does it fall back to a synthetic street grid: two rough
axes with parallel curving roads, each starting from a different point —
and even then, hover the "(approximate roads)" text in the header for
exactly which service failed and why.

**New detections anchor to a real, currently-moving bus.** Every new
incident is placed within ~150-300m of a randomly chosen live bus's current
position — not scattered independently across the whole city — so a pin
visibly appears where a bus just drove past, the way a real onboard camera
pipeline would actually surface a defect.

**⚠️ Before your actual presentation:** if your venue or campus network
restricts outbound API calls (a common issue on college WiFi — this is
likely why VIT-AP shows "(approximate roads)" on that network), do this
once, from any network that works — your phone's mobile hotspot is fine:
open the app, click "Use my location" (or search your venue's address),
and confirm the header stops saying "(approximate roads)". That result is
cached in `.data/road-cache/` permanently — your live demo will use it
even if the venue WiFi can't reach any of these services on the day. If it
*still* says "(approximate roads)" after trying from a completely
different network, hover that text for the exact error from each strategy.

**Worth knowing:** the server holds one shared simulation. If you open two
tabs, or someone else hits the same server, a recenter from either one
moves the map for both — that's the same shared-backend behavior that makes
ticket updates sync across tabs, just applied to location too.

## This has a real backend now

Everything under `app/api/` runs on the Node.js process, not in the browser:

- **State lives on the server** (`lib/serverStore.ts`), not in React state.
  Open the app in two browser tabs — both show identical, live-synced data,
  because both are subscribed to the same server via Server-Sent Events
  (`/api/stream`).
- **It persists.** Every change is written to `.data/wayzero-state.json`.
  Stop the server, start it again, and your ticket statuses and ANPR case
  history are still there — this is a real file-backed store, not
  in-memory-only state that resets on refresh.
- **Ticket updates and report generation are real server calls** (`PATCH
  /api/tickets/:id`, `POST /api/anpr/:id/report`) — the client never mutates
  its own copy of the truth, it asks the server to and gets the update
  pushed back.
- **The Onboard Edge Scanner does real image processing.** Upload any photo
  in the "Scanner" tab and `app/api/scan/route.ts` runs an actual Laplacian
  edge-detection convolution over it with `sharp` — a real computer-vision
  library operating on real pixel data you provided, not a canned demo
  image. It's honestly labeled as a classical filter, not a trained
  pothole-classification model — that's the one piece a from-scratch build
  genuinely can't fake, since it would require training data and a real
  camera feed to be real in the deep-learning sense.

## How to prove this to judges (not just tell them)

**Prove the backend is real — two tabs, no talking required:**
1. Open the app in two browser windows side by side.
2. In the Departments tab in one window, click "Move to Acknowledged" on any ticket.
3. Point at the other window — it updates instantly, without you touching it.
That's the whole proof: if it were fake client-side state, the second window would never move.

**Prove it further, if someone doubts it:**
- Open DevTools → Network → filter to Fetch/XHR. Show the `/api/stream` request with type `eventsource` sitting open, and the `PATCH /api/tickets/...` request firing when you click "Move to Acknowledged."
- Stop the dev server (Ctrl+C in the terminal), run `npm run dev` again, reload the page. The ticket status you changed is still there — because it's in `.data/wayzero-state.json` on disk, not in a React variable that resets on refresh. You can even open that JSON file in a text editor next to the browser and point at the matching value.

**Prove the image scanner is real, not a canned screenshot:**
- Go to the Scanner tab. **Have a judge pick or take the photo** — their own phone photo of the floor, a wall, anything with texture. Upload it live.
- The edge-detection result and the percentage score are computed from *that specific image*, in front of them, in under a second. There's no way to fake this convincingly on the spot — a canned demo can't process an image it's never seen before.
- If they want proof at the network level too: DevTools → Network → the `POST /api/scan` request → show the response JSON contains the actual `edgeDensityPct` number displayed on screen.

**Prove the public API / open dataset are real:**
- Just open `http://localhost:3000/api/public/hazards` directly in a browser tab. It's real JSON, not a mockup — refresh it and watch the incident list change as the live simulation ticks.
- Same for `/api/public/dataset` — it downloads an actual CSV you can open in Excel/Sheets on the spot.

## Optional: a real LLM for the advisory bot

The "Ask WayZero" bot in the Advisory tab works out of the box with zero
setup, using a rule-based matcher (see `lib/advisory.ts`). If you want it to
answer more flexible phrasing using a real Claude call instead, copy
`.env.example` to `.env.local` and set `ANTHROPIC_API_KEY`. The bot will
automatically use it, and the UI shows "Answered by Claude" instead of
"Rule-based match" — an honest, visible signal of which path actually
answered your question.

## Recent fixes worth knowing about

- **Visual redesign — warm, traffic-signal palette instead of generic dark
  dashboard neon.** The old near-black-navy + scattered cyan/violet/neon-
  yellow accent combo is a documented pattern for "AI-generated dashboard"
  — replaced with a warmer, restrained palette: severity colors now map to
  real traffic-light red/amber/green instead of an arbitrary rainbow, and
  bus route colors use a completely separate muted palette so a route's
  color can never be confused with a severity color on the map. Section
  headers were also de-tracked-caps'd (the "EYEBROW LABEL" look) to normal
  sentence case throughout.
- **Fixed a real contrast bug.** The predictive-risk score on department
  ticket cards was 10px text in the faintest available color with no
  background separation — genuinely hard to read on the dark panel. Now
  has a proper contrast chip, larger text, and severity-based coloring.
- **Broadcast is now a real cross-client alert, not a local text line.**
  Starting a broadcast now stores it in the shared server snapshot
  (`activeBroadcast`) and pushes it over SSE to every connected client — a
  compact corner card (`BroadcastBanner.tsx`, bottom-right, visible app-wide
  regardless of which tab is open) appears for everyone until someone stops
  it. Verified directly: started a broadcast via the API and confirmed the
  exact object appears in the live SSE stream. Text-to-speech still only
  plays on the device that started it (browsers can't push audio to other
  devices — a real limit, stated plainly rather than glossed over).
- **Every incident type now has a working detail view.** Previously only
  ANPR-type events opened a modal on click — every other type (pothole,
  signal fault, congestion, damaged signboard, missing zebra-crossing,
  etc.) had no click handler at all, which is why clicking those tiles did
  nothing no matter how many times you tried. New `IncidentModal.tsx`
  handles every non-ANPR type, including detections that never escalated
  to a full incident (below the confidence threshold) — those now show a
  clear "logged for reference only" message instead of silently failing.
  Every feed tile and every map marker now opens something.
- **Typography rebalanced.** Swapped Space Grotesk + JetBrains Mono (a very
  common default pairing that reads as "templated AI dashboard") for IBM
  Plex Sans + IBM Plex Mono, and — more importantly — removed `font-mono`
  from roughly 40 places it was applied purely for a "techy" look (badges,
  buttons, tab labels, section headers, form inputs). Monospace now only
  appears on genuinely technical readouts: device IDs, GPS coordinates,
  plate numbers, confidence percentages, and risk scores.
- **Route chaining no longer teleports across gaps.** Same-named OSM road
  segments used to get stitched together regardless of distance, which
  could connect two genuinely unrelated stretches of road (same generic
  name, different neighborhoods) with an impossible straight-line jump.
  Segments now only chain when their endpoints are within 350m of each
  other — a name that appears in disconnected areas now correctly produces
  multiple separate corridors instead of one route that cuts across open
  space. **If you cached road data before this fix, delete
  `.data/road-cache/` once and re-fetch** — the cache doesn't know it was
  storing buggy geometry.
- **Bus fleet and plates are now Andhra Pradesh-accurate.** Fleet IDs read
  `APSRTC-XXXX` (the real operator running buses on the actual
  Amaravati-Thullur-Mangalagiri route) instead of Chennai's MTC branding.
  Every bus and ANPR-tracked vehicle gets a realistic AP-format plate (`AP
  07`, `AP 16`, or `AP 39` — the real RTO codes for Guntur, Krishna, and
  the newer statewide series), shown in the map popup.
- **The advisory bot no longer answers about the wrong route.** Route names
  like "Route North"/"Route South" all start with the same generic word,
  so the old matcher picked whichever route came first in the list
  regardless of which direction was actually asked about. It now matches
  on the distinguishing word in the name. Advisory phrasing was also
  cleaned up — it no longer repeats the incident type twice (e.g. the old
  "waterlogging (critical) reported near waterlogging detected").

## The six new features, briefly

- **Predictive/proactive maintenance** (`lib/predictive.ts`) — every open
  incident gets a live risk score that climbs with age and severity, ranked
  in the Insights tab's "Predictive Maintenance" panel. It's a transparent
  rule-based heuristic, not a trained model — say so if asked.
- **Automated department tagging** — already happens invisibly (every
  incident auto-routes to PWD/Traffic Police/Sanitation on creation); now
  visible via an "Auto-tagged" badge, plus a "Notify Department" button on
  each ticket that downloads a real formatted intimation letter.
- **Broadcast channel** (`AdvisoryCenter.tsx`) — pick a route, get a live
  advisory read aloud via the browser's real text-to-speech engine.
- **Public hazard-data API** (`/api/public/hazards`) — a real, unauthenticated
  GeoJSON feed, the shape Google Maps/Waze-style consumers would ingest.
- **Public advisory bot** (`AdvisoryCenter.tsx`'s "Ask" box) — see above.
- **Open dataset for research** (`/api/public/dataset`) — a real downloadable
  CSV of anonymized incident history.

## Mapping to the SIH26124 brief

| Brief requirement | Where it lives |
| --- | --- |
| Onboard detection: potholes, damaged roads, missing dividers/crossings, damaged signboards, waterlogging | `lib/mockTelemetry.ts` incident generators, run server-side → `LiveFeed`, map markers |
| Onboard vision processing on camera streams | `app/api/scan` + `DefectScanner.tsx` — real edge-detection on an uploaded photo |
| Vehicle density / congestion, bottlenecks | `generateDensityGrid()` → CommandMap's toggleable congestion layer |
| Vulnerable pedestrian situations | `pedestrian-risk` incident type |
| Hit-and-run tracking, plate OCR, GPS + timestamp, secure sharing with a central system | `generateAnprCase()` (server-side) → `AnprModal`, synced to every client over SSE |
| GIS map visualization | `CommandMap.tsx` (real Leaflet + Esri/OpenStreetMap tiles) |
| Congestion heat maps | Congestion layer toggle in the top bar |
| OD traffic patterns, route delay estimation | `AnalyticsDashboard.tsx` |
| Actionable insights / incident reports for authorities | `DepartmentPortal.tsx` (server-persisted), `AnprModal`'s report download |
| Proactive maintenance planning | `lib/predictive.ts`'s risk ranking |
| Public/external data sharing | `/api/public/hazards`, `/api/public/dataset` |

**What's real vs. simulated, plainly:** the server, the persistence, the
live multi-client sync, the edge-detection image processing, the real
OpenStreetMap road/place lookups, the text-to-speech broadcast, and the
public API endpoints are all genuinely functioning code — run it and see
for yourself. What's necessarily synthetic is the *data source*: there's no
physical bus fleet, no real onboard cameras, and no trained defect-
classification model, because those require hardware and labeled training
data this project can't manufacture. `lib/mockTelemetry.ts` generates
plausible values in their place. Swapping it for real GPS/camera feeds
means replacing that one file's generators with real ingestion code —
every route and component downstream of it already expects the same shapes.

## Data flow

`lib/serverStore.ts` is the real backend and the single source of truth.
`app/page.tsx` fetches its initial snapshot once, then subscribes to live
updates over Server-Sent Events, and passes typed slices down to each
component as props. Every component reports interaction back up via
callbacks (`onIncidentClick`, `onSelectEvent`, `onUpdateStatus`,
`onGenerateReport`) which call real API routes — no component mutates its
own copy of the truth, so what's on screen always reflects what the server
actually has.

Every source file opens with a three-part header comment (what it does, how
data flows through it, expected input/output types) per the project brief.
