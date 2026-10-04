# Qwen What-If --- Interactive Scenario Lab

> **Don't just ask AI what to do. Change an assumption and see what
> happens.**

Qwen What-If is an interactive decision-simulation workspace combining
**Qwen reasoning** with **Miro visual collaboration**.

Instead of treating AI output as a static report, it turns a scenario
into a visual decision model, lets a human change an assumption, asks
Qwen to reason about the consequences, and updates the same Miro model
in place.

------------------------------------------------------------------------

## 1. Problem Statement

Most AI decision tools follow a one-way workflow:

``` text
User asks a question
        ↓
AI generates an answer/report
        ↓
User reads it
```

Real-world decisions are different. They depend on assumptions such as:

-   budget
-   users
-   timeline
-   resources
-   constraints
-   priorities
-   dependencies

When one assumption changes, the consequences can propagate through the
entire decision.

For example:

> We have ₹10 lakh to launch an AI education startup for 10,000 users
> within 6 months.

Now change:

> **₹10 lakh → ₹5 lakh**

The useful question is not only *"What should we do?"* but:

> **"What else changes because this assumption changed?"**

Qwen What-If is designed to answer that question.

------------------------------------------------------------------------

# 2. Proposed Solution

## Qwen What-If --- Interactive Scenario Lab

The system turns a Miro board into a **living visual decision model**.

The core loop is:

``` text
DESCRIBE
   ↓
VISUALIZE
   ↓
CHANGE
   ↓
SIMULATE
   ↓
UNDERSTAND
   ↓
DECIDE
```

More specifically:

``` text
User describes a scenario
          ↓
      Qwen reasons
          ↓
Structured scenario model
          ↓
      Miro visualizes
          ↓
Human changes an assumption
          ↓
      Qwen re-reasons
          ↓
Changed consequences identified
          ↓
Existing Miro model is updated
```

The key idea is not:

``` text
Qwen → Report → Miro
```

It is:

``` text
Qwen → Miro → Human changes assumption → Qwen → Miro evolves
```

------------------------------------------------------------------------

# 3. How Qwen Thinks About a Scenario

Qwen is instructed to turn the scenario into a structured decision model
rather than returning an unrestricted paragraph.

``` text
Scenario
   │
   ├── Variables / Assumptions
   ├── Decisions
   ├── Dependencies
   ├── Risks
   ├── Outcomes
   ├── Recommendation
   └── Fragile Assumptions
```

The structured model makes the reasoning easier to visualize, compare,
update, and synchronize with Miro.

When an assumption changes, the previous state and the changed
assumption are supplied to Qwen so it can reason about the **delta**.

The system asks what changed, which decisions are affected, which risks
increased or decreased, which outcomes changed, whether the
recommendation changed, and what new fragile assumption appeared.

------------------------------------------------------------------------

# 4. Example

### Initial scenario

> We have ₹10 lakh to launch an AI education startup for 10,000 users
> within 6 months. We need to decide how to allocate the budget across
> product development, infrastructure, hiring, and marketing.

Qwen identifies:

**Variables / assumptions** - ₹10 lakh budget - 10,000 users - 6-month
launch timeline

**Decisions** - Build internally vs. hire - Product vs. marketing
allocation - Infrastructure strategy

**Dependencies** - Engineering capacity - Infrastructure readiness -
Hiring availability

**Risks** - Budget pressure - Scaling requirements - Hiring delays

**Outcomes** - Launch feasibility - Product readiness - User capacity -
Growth potential

**Recommendation** - A reasoned recommendation based on the current
assumptions

**Fragile assumptions** - Assumptions whose changes could significantly
affect the decision

### What-If

The user changes:

``` text
Budget
₹10 lakh
   ↓
₹5 lakh
```

Qwen evaluates the consequence:

``` text
ASSUMPTION CHANGED
₹10L → ₹5L

        ↓

DECISIONS AFFECTED
• Hiring strategy
• Product scope
• Marketing allocation

        ↓

RISKS AFFECTED
• Higher execution risk
• Reduced marketing capacity

        ↓

OUTCOMES AFFECTED
• Slower growth
• Tighter launch scope

        ↓

RECOMMENDATION
Updated based on the new constraint
```

The same Miro model is updated rather than creating another disconnected
report.

------------------------------------------------------------------------

# 5. What Actually Updates in Miro?

The system maintains one canonical scenario map:

``` text
┌──────────────────────┐
│      SCENARIO        │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ ASSUMPTIONS /        │
│ VARIABLES            │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│      DECISIONS       │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│ DEPENDENCIES + RISKS │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│       OUTCOMES       │
└──────────┬───────────┘
           ↓
┌──────────────────────┐
│    RECOMMENDATION    │
└──────────────────────┘
```

Current visualization:

-   **6 sticky-note cards**
-   **5 connectors**
-   **11 canonical Miro objects**

Repeated analysis is designed to update the existing objects rather than
continuously create duplicates.

------------------------------------------------------------------------

# 6. Architecture

``` text
                         ┌───────────────────────┐
                         │        USER           │
                         │                       │
                         │ Scenario / Assumption │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │      NEXT.JS APP      │
                         │ React + TypeScript    │
                         │ Scenario Console      │
                         └───────────┬───────────┘
                                     │ HTTP
                                     ▼
                         ┌───────────────────────┐
                         │    EXPRESS SERVER     │
                         │ TypeScript            │
                         │ API orchestration     │
                         └───────┬───────┬───────┘
                                 │       │
                         reasoning       │ visualization
                                 │       │
                    ┌────────────┘       └────────────┐
                    ▼                                 ▼
          ┌─────────────────────┐          ┌─────────────────────┐
          │        QWEN         │          │        MIRO         │
          │                     │          │                     │
          │ ModelScope          │          │ REST API v2         │
          │ OpenAI-compatible   │          │ Board visualization │
          └─────────────────────┘          └─────────────────────┘
```

------------------------------------------------------------------------

# 7. Technology Stack

### Frontend

-   Next.js 16
-   React 19
-   TypeScript
-   Tailwind CSS
-   Geist typography

### Backend

-   Node.js
-   Express 5
-   TypeScript
-   tsx
-   CORS
-   dotenv

### AI

-   Qwen
-   `Qwen-Ambassador/Qwen3.7-Max`
-   ModelScope OpenAI-compatible inference API
-   OpenAI Node SDK

### Collaboration / Visualization

-   Miro REST API v2
-   Sticky notes
-   Connectors
-   Deterministic positioning
-   Idempotent update logic

------------------------------------------------------------------------

# 8. Qwen Integration

The project uses the organizer-provided ModelScope configuration:

``` text
Base URL:
https://api-inference.modelscope.ai/v1

Model:
Qwen-Ambassador/Qwen3.7-Max
```

Conceptually:

``` text
Express
   ↓
OpenAI-compatible client
   ↓
ModelScope
   ↓
Qwen-Ambassador/Qwen3.7-Max
```

Qwen is responsible for:

-   extracting assumptions
-   identifying decisions
-   identifying dependencies
-   identifying risks
-   predicting outcomes
-   generating recommendations
-   identifying fragile assumptions
-   re-evaluating the scenario after an assumption changes

------------------------------------------------------------------------

# 9. Miro Integration

The project connects to a dedicated Miro board:

``` text
Qwen What-If — Demo
```

The backend uses Miro REST API v2 to:

-   read existing board items
-   create scenario cards
-   update existing cards
-   create connectors
-   detect duplicate/stale objects
-   maintain one canonical scenario map

The Miro access token remains exclusively on the Express server.

------------------------------------------------------------------------

# 10. API

### Health

``` http
GET /api/health
```

Checks whether the Express backend is alive.

### Connection Test

``` http
GET /api/connections
```

Checks Qwen and Miro connectivity and verifies board accessibility
without returning credentials.

### Analyze Scenario

``` http
POST /api/analyze
```

Input:

``` json
{
  "scenario": "We have ₹10 lakh to launch an AI education startup for 10,000 users within 6 months."
}
```

Returns:

``` json
{
  "scenario": "...",
  "variables": [],
  "decisions": [],
  "dependencies": [],
  "risks": [],
  "outcomes": [],
  "recommendation": "...",
  "fragileAssumptions": []
}
```

### Analyze + Visualize

``` http
POST /api/analyze-and-visualize
```

Runs:

``` text
Scenario
   ↓
Qwen analysis
   ↓
Structured JSON
   ↓
Miro upsert
   ↓
Visual scenario map
```

The response includes the analysis, board ID, Miro item IDs, and
created/updated/removed counts.

### Update Assumption

``` http
POST /api/update-assumption
```

Conceptually accepts:

``` json
{
  "scenario": "...",
  "previousAnalysis": {},
  "assumption": {
    "previous": "₹10 lakh",
    "updated": "₹5 lakh"
  }
}
```

Qwen then re-evaluates the scenario using the assumption delta.

------------------------------------------------------------------------

# 11. Idempotent Miro Updates

A key engineering decision is to avoid creating a new report for every
iteration.

Instead:

``` text
First analysis
     ↓
Create canonical map
     ↓
User changes assumption
     ↓
Qwen re-reasons
     ↓
Find existing Miro cards
     ↓
Update their content
     ↓
Same visual model evolves
```

The backend identifies canonical cards using stable markers and reuses
matching objects.

This prevents uncontrolled board growth and makes the Miro board behave
like a persistent scenario model.

------------------------------------------------------------------------

# 12. Security

Secrets stay on the server.

``` text
Browser
   │
   │ scenario data only
   ▼
Express
   │
   ├── ModelScope credential
   └── Miro credential
```

The frontend never receives:

-   ModelScope API key
-   Miro access token
-   Miro client secret

Credentials are stored in `.env.local`, and `.env*` is ignored by Git.

Example configuration:

``` env
MODELSCOPE_API_KEY=YOUR_ORGANIZER_PROVIDED_KEY
QWEN_MODEL=Qwen-Ambassador/Qwen3.7-Max

MIRO_ACCESS_TOKEN=YOUR_MIRO_ACCESS_TOKEN
MIRO_BOARD_ID=YOUR_MIRO_BOARD_ID
```

Never commit `.env.local`.

------------------------------------------------------------------------

# 13. Project Structure

``` text
qwen-what-if/
│
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   ├── globals.css
│   └── scenario-console.tsx
│
├── server/
│   ├── index.ts
│   ├── qwen.ts
│   ├── miro.ts
│   └── prompts.ts
│
├── public/
│
├── .env.local
├── .gitignore
├── package.json
├── package-lock.json
├── next.config.ts
├── tsconfig.json
└── README.md
```

------------------------------------------------------------------------

# 14. Running Locally

Install:

``` bash
npm install
```

Frontend:

``` bash
npm run dev
```

Backend, in a second terminal:

``` bash
npm run dev:server
```

Frontend:

``` text
http://localhost:3000
```

Backend:

``` text
http://127.0.0.1:4000
```

------------------------------------------------------------------------

# 15. Demo Flow

### Step 1 --- Describe

Enter:

> We have ₹10 lakh to launch an AI education startup for 10,000 users
> within 6 months. We need to decide how to allocate the budget across
> product development, infrastructure, hiring, and marketing.

### Step 2 --- Analyze

Click:

**Analyze with Qwen**

Qwen creates the structured decision model.

### Step 3 --- Visualize

The backend synchronizes the model with Miro.

### Step 4 --- Change

Change:

``` text
Budget: ₹10 lakh → ₹5 lakh
```

### Step 5 --- Simulate

Qwen evaluates the consequences of the changed assumption.

### Step 6 --- Update

The existing Miro cards are updated to represent the new decision state.

------------------------------------------------------------------------

# 16. Design Principles

### AI should explain consequences, not just recommendations

The objective is to understand *why* a decision changes.

### Assumptions are first-class objects

Budget, users, time, resources, and constraints drive the decision
model.

### Visual state should evolve

A changed assumption should update the existing model rather than create
another disconnected report.

### Human-in-the-loop

The human chooses what to change.

Qwen evaluates the consequences.

### Structured reasoning

The AI output is represented as explicit variables, decisions,
dependencies, risks, outcomes, and recommendations rather than an opaque
paragraph.

------------------------------------------------------------------------

# 17. Why This Is Different

Traditional AI workflow:

``` text
Question
   ↓
Answer
   ↓
Done
```

Qwen What-If:

``` text
Scenario
   ↓
Reasoning
   ↓
Visual model
   ↓
Human intervention
   ↓
New assumption
   ↓
Reasoning again
   ↓
Updated visual model
```

The product creates a feedback loop between **AI reasoning and human
decision-making**.

The human remains in control of the assumptions.

Qwen provides the reasoning.

Miro provides the shared visual model.

------------------------------------------------------------------------

# 18. Hackathon Value Proposition

### Problem

Decision-making happens under changing assumptions, but most AI tools
provide static answers.

### Proposed Solution

An interactive AI simulation layer that connects reasoning with a
persistent visual decision model.

### Qwen's Role

Deep scenario reasoning and consequence analysis.

### Miro's Role

Persistent visual representation and collaborative decision workspace.

### Human's Role

Change assumptions, explore alternatives, and make the final decision.

### Result

Instead of only asking:

> **"What should we do?"**

the user can ask:

> **"What happens if this changes?"**

------------------------------------------------------------------------

# 19. One-Line Pitch

> **Qwen What-If turns a Miro board into a living decision model: change
> an assumption, and Qwen reasons through the consequences while Miro
> evolves with it.**

------------------------------------------------------------------------

# 20. Core Product Loop

``` text
             ┌──────────────────────┐
             │       DESCRIBE       │
             └──────────┬───────────┘
                        ↓
             ┌──────────────────────┐
             │    QWEN REASONS      │
             └──────────┬───────────┘
                        ↓
             ┌──────────────────────┐
             │   MIRO VISUALIZES    │
             └──────────┬───────────┘
                        ↓
             ┌──────────────────────┐
             │ HUMAN CHANGES INPUT  │
             └──────────┬───────────┘
                        ↓
             ┌──────────────────────┐
             │   QWEN RE-REASONS    │
             └──────────┬───────────┘
                        ↓
             ┌──────────────────────┐
             │     MIRO EVOLVES     │
             └──────────────────────┘
```

**Qwen What-If is designed to make AI reasoning dynamic, visual, and
sensitive to changing assumptions.**
