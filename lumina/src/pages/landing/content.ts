/**
 * Seluruh teks di halaman publik bersumber dari PRD LUMINA v1.0 dan Proposal
 * LUMINA (MAPID WebGIS Competition 2026). Angka kuantitatif hanya yang
 * tercantum di dokumen — tidak ada yang ditambahkan sebagai asumsi.
 */

export const platformStats = [
  {
    value: 'KRL',
    label: 'Commuter Line network',
    note: 'Extending to rail stations across Indonesia',
  },
  { value: 'H3 · 9', label: 'Spatial analysis cell', note: '± 0,10 km² per cell' },
  {
    value: '3',
    label: 'Time slots per day',
    note: '06–09, 12–15, 16–19',
  },
  {
    value: '0–100',
    label: 'Relative density index',
    note: 'Per station, per time slot',
  },
]

// Angka ridership koridor kalibrasi — KAI Commuter, Semester I 2025.
export const stationLoad = [
  { name: 'Manggarai', value: '154.713' },
  { name: 'Tanah Abang', value: '120.608' },
  { name: 'Duri', value: '68.444' },
  { name: 'Sudirman', value: '—' },
]

export const problems = [
  {
    id: 'PS-01 · PS-02',
    title: 'On the travel side',
    body: 'Commuters have no instrument to read when a station is packed or quiet. Congestion repeats at the same hours and the same transfer points, and the decision of when to leave is made on intuition.',
  },
  {
    id: 'PS-03 · PS-04',
    title: 'On the area economy side',
    body: 'That volume of people has not converted into business success. Outlets fail because a location was chosen from how many people walk past — not from time patterns and real purchasing power. That is spatial mismatch.',
  },
]

export const method = [
  {
    step: '01',
    title: 'Derive',
    body: 'Crowding is not an attribute in any dataset. LUMINA derives it from three timestamped proxy signals: Community Maps activity, Struk Go transaction timestamps, and Menu Go buyer-crowd conditions — each normalised per H3 cell.',
  },
  {
    step: '02',
    title: 'Calibrate',
    body: 'The model is trained against ground truth from 84 scheduled field observations through MAPID APPS — 4 interchange stations × 3 time slots × 7 days. That corridor is the research subject, not the boundary of the product: once the method holds there, the same engine reads any station on the network.',
  },
  {
    step: '03',
    title: 'Validate & explain',
    body: 'Block spatial cross-validation keeps neighbouring cells inside the same fold so spatial similarity cannot leak into the test set. The model only ships if it beats a naive model and a linear regression without neighbourhood features. SHAP explains every output.',
  },
]

export const audiences = [
  {
    persona: 'P1 · Daily commuter',
    title: 'Know before you leave',
    points: [
      'Read a station’s busy-hour profile across all time slots at once',
      'Switch the time slot and watch the density map redraw',
      'Get a quieter departure slot, with the factors that drive it',
      'Check interchange points and station facilities',
    ],
  },
  {
    persona: 'P2 · Small business owner',
    title: 'Validate a location with evidence',
    points: [
      'Pick an H3 cell and read its location potential score and risk index',
      'See which business categories are viable, not just which are popular',
      'Every recommendation carries three proofs: demand, competition, available space',
      'Low-confidence cells say so, plainly',
    ],
  },
]

export const features = [
  {
    id: 'F1',
    name: 'Station Busy-Hour Profile',
    priority: 'P0',
    body: 'The density profile of one station across every time slot, shown as a comparison rather than a single number. The scale is stated explicitly as a relative 0–100 index — never a passenger count.',
  },
  {
    id: 'F2',
    name: 'Density Index Map per Time Slot',
    priority: 'P0',
    body: 'A density heatmap per H3 cell over the MAPID MAPS basemap. Change the time slot and the map redraws; the activity-point layer can be toggled; and any set of stations can be compared on the same slot with an identical colour scale.',
  },
  {
    id: 'F3',
    name: 'Crowd Prediction & Departure Advice',
    priority: 'P0',
    body: 'A predictive density index per station per slot from a Spatial XGBoost model, with at least one quieter alternative slot and the driving factors behind it derived from SHAP values.',
  },
  {
    id: 'F4',
    name: 'Routes & Intermodal Interchange',
    priority: 'P1',
    body: 'The transit network from OpenStreetMap as a context layer, with interchange points across the network marked and openable.',
  },
  {
    id: 'F5',
    name: 'Station & Facilities Map',
    priority: 'P1',
    body: 'Facility POIs around each station from OpenStreetMap, each with an attribute popup.',
  },
  {
    id: 'F6',
    name: 'Conversational AI Assistant',
    priority: 'P1',
    body: 'A narrative summary when you select a station or a cell, and free-form questions answered by pulling scores back from the system. It may only speak from model output — it will never invent a number. If the language service is down, the map and every score still work.',
  },
  {
    id: 'F7',
    name: 'Area Economic Potential Insight',
    priority: 'P0',
    body: 'A location potential score and risk index per H3 cell. Business categories come straight from the Properti Go property-category attribute, and a category is only marked viable when three conditions hold at once.',
  },
  {
    id: 'F8',
    name: 'Reliability Indicator',
    priority: 'P0',
    body: 'Cells with sparse data are marked low-reliability. Every number on screen carries its reliability level, and its source and metadata can be traced from the interface.',
  },
]

export const guardrails = [
  {
    title: 'No absolute passenger counts',
    body: 'LUMINA does not claim to read how many people are at a station. The density index is relative, 0–100.',
  },
  {
    title: 'No revenue projections',
    body: 'The MAPID ecosystem records consumer spending, not outlet revenue. With no revenue label to learn from, any projection would be fabrication.',
  },
  {
    title: 'Economic estimates stay indicative',
    body: 'Spending figures are presented as indicative ranges, never as a promise of income.',
  },
  {
    title: 'Empty cells are marked, not zeroed',
    body: 'A cell with no proxy data is labelled “data unavailable”. It is never given a score of 0, which would read as “quiet”.',
  },
]

export const dataSources = [
  {
    name: 'Community Maps — Activity',
    role: 'Timestamped activity locations — the primary signal behind the density index',
    status: 'Required',
  },
  {
    name: 'Data Mission — Struk Go',
    role: 'Real purchasing power plus transaction timestamps as a rhythm marker for peak hours',
    status: 'Required',
  },
  {
    name: 'Data Mission — Menu Go',
    role: 'Taste, culinary price range, and buyer-crowd conditions',
    status: 'Required',
  },
  {
    name: 'Data Mission — Properti Go',
    role: 'Commercial units and land available for sale or lease',
    status: 'Required',
  },
  {
    name: 'OpenStreetMap',
    role: 'Area context, competitor density, transit network and interchange',
    status: 'Supporting',
  },
  {
    name: 'MAPID APPS — Survey activities',
    role: 'Field ground truth and the basis for calibration',
    status: 'Required for the model',
  },
]

export const team = [
  { name: 'Dedy Risyaldi', role: 'Project Leader', scope: 'Roadmap, milestones, operational risk' },
  { name: 'Acaryanandana Alif Fajar', role: 'WebGIS Developer', scope: 'Frontend, API, map integration' },
  { name: 'Tiara Vania Wijaya Putri', role: 'Business & Product Analyst', scope: 'Requirements, personas, data compliance' },
  { name: 'Zahra Aurelia Djanaid', role: 'UI/UX Designer', scope: 'User flows, design system, index legibility' },
  { name: 'Iklil Najmi Hamzah', role: 'Data & AI Analyst', scope: 'ETL, feature engineering, model & validation' },
]

export const stack = [
  { layer: 'Spatial database', tools: 'PostgreSQL + PostGIS, QGIS' },
  { layer: 'Data processing', tools: 'Python — GeoPandas, Shapely, H3' },
  { layer: 'Predictive model', tools: 'Spatial XGBoost, SHAP' },
  { layer: 'Backend & API', tools: 'Flask — REST JSON + vector tiles' },
  { layer: 'Frontend WebGIS', tools: 'React + MapLibre GL' },
  { layer: 'Basemap & publishing', tools: 'MAPID MAPS + GEO MAPID' },
]

export const faqs = [
  {
    q: 'What does the density index actually mean?',
    a: 'It is a relative index from 0 to 100 for one H3 cell in one time slot. It is not a passenger count, and LUMINA never claims to read one. A 90 means this cell is far busier than most cells in the corridor for that slot — nothing more.',
  },
  {
    q: 'Why is there no revenue projection?',
    a: 'The MAPID ecosystem records consumer spending through Struk Go, not outlet revenue. There is no revenue label to train a model on, so any projection would be invented. The location potential score is a transparent weighted composite index instead, so the formula can be traced.',
  },
  {
    q: 'Which time slots are covered?',
    a: '06.00–09.00, 12.00–15.00 and 16.00–19.00. These are the three slots validated by field survey. Anything outside them is marked as not survey-calibrated rather than silently estimated.',
  },
  {
    q: 'What is an H3 cell?',
    a: 'A hexagonal grid cell at resolution 9, roughly 0,10 km². Every signal is aggregated into these cells so that space and time can be compared consistently across the corridor.',
  },
  {
    q: 'What does the reliability marker tell me?',
    a: 'How much data sits behind a number. A cell with very little data is marked low-reliability, and one with none is marked “data unavailable” rather than being scored 0. The marker is never carried by colour alone.',
  },
  {
    q: 'Which stations are covered?',
    a: 'LUMINA is built for the KRL Commuter Line network, and the same engine extends to rail stations across Indonesia. Manggarai, Tanah Abang, Duri and Sudirman are where the model is calibrated and validated against field survey — so readings there carry the highest reliability. Stations outside the calibrated corridor are still read from the proxy signals, and their reliability marker says so.',
  },
  {
    q: 'Why does the research only mention four stations?',
    a: 'Because a method has to be proven somewhere before it can be trusted everywhere. The Manggarai–Tanah Abang–Duri–Sudirman interchange corridor is dense, complex and heavily transferred through — a hard test. It is the validation ground, not the coverage limit.',
  },
  {
    q: 'How is a business category marked viable?',
    a: 'Three conditions must hold at the same time: demand is high, similar competitors are few, and a property with a matching category is actually available. If Properti Go has no listing in that cell, the category cannot be marked viable.',
  },
  {
    q: 'What happens if the AI assistant is unavailable?',
    a: 'The map and every score keep working. The language service is deliberately isolated as a non-critical dependency — the assistant is an explanation layer, not the product.',
  },
]
