# CLAUDE.md - AI Assistant Guide

> **Purpose**: This document provides comprehensive guidance for AI assistants (like Claude) working on the Agentic Investment Research codebase. It explains the architecture, conventions, workflows, and best practices to follow when implementing features or fixing bugs.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Codebase Structure](#codebase-structure)
3. [Key Technologies](#key-technologies)
4. [Architecture Patterns](#architecture-patterns)
5. [Development Workflows](#development-workflows)
6. [Code Conventions](#code-conventions)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Environment Variables](#environment-variables)
10. [Known Issues](#known-issues)
11. [Adding New Features](#adding-new-features)
12. [Testing Guidelines](#testing-guidelines)
13. [Best Practices](#best-practices)

---

## Project Overview

**Agentic Investment Research** is a portfolio analysis and research platform that uses a multi-agent architecture to:
- Analyze investment portfolios
- Compute statistics and risk metrics
- Generate educational explanations
- Provide diversification suggestions
- Create research briefings with market news

### Core Capabilities

- **Portfolio Import**: CSV upload of holdings
- **Live Price Updates**: Integration with Polygon.io for market data
- **Multi-Agent Analysis**: Orchestrated via LangGraph state machine
- **Risk Assessment**: Automatic categorization (LOW/MEDIUM/HIGH)
- **AI-Generated Insights**: OpenAI GPT-4.1-mini for explanations
- **Research Reports**: Persistent analysis results

---

## Codebase Structure

```
agentic-investment-research/
├── src/
│   ├── agents/              # Pure agent functions
│   │   ├── statsAgent.ts
│   │   ├── riskAgent.ts
│   │   ├── explainerAgent.ts
│   │   ├── warningAgent.ts
│   │   ├── diversificationAgent.ts
│   │   ├── diversifierCandidatesAgent.ts
│   │   ├── deepResearchAgent.ts
│   │   └── priceUpdateAgent.ts
│   │
│   ├── services/            # Business logic orchestrators
│   │   ├── portfolioAnalysis.service.ts
│   │   ├── portfolioImport.service.ts
│   │   └── weeklyResearch.service.ts
│   │
│   ├── routes/              # Express API endpoints
│   │   ├── health.routes.ts
│   │   ├── portfolio.routes.ts
│   │   ├── analyze.routes.ts
│   │   └── research.routes.ts
│   │
│   ├── graph/               # LangGraph orchestration
│   │   └── portfolioExplainerGraph.ts
│   │
│   ├── repos/               # Data access layer (Prisma)
│   │   ├── portfolio.repo.ts
│   │   ├── user.repo.ts
│   │   └── researchReport.repo.ts
│   │
│   ├── tools/               # Utilities and helpers
│   │   ├── computeStats.ts
│   │   ├── marketData/
│   │   │   ├── polygonClient.ts
│   │   │   └── priceUpdateTool.ts
│   │   └── logging/
│   │       └── runLogger.ts
│   │
│   ├── types/               # TypeScript type definitions
│   │   ├── portfolio.ts
│   │   └── research.ts
│   │
│   ├── domain/              # Domain logic
│   │   ├── portfolioDiff.ts
│   │   └── research/
│   │       └── researchBrief.schema.ts
│   │
│   ├── middleware/          # Express middleware
│   │   └── requireClerkAuth.ts
│   │
│   ├── app.ts               # Express app factory
│   └── server.ts            # Entry point
│
├── prisma/
│   └── schema.prisma        # Database schema
│
├── tsconfig.json            # TypeScript configuration
├── package.json             # Dependencies and scripts
└── .env                     # Environment variables (gitignored)
```

### Directory Purposes

| Directory | Purpose | Key Pattern |
|-----------|---------|-------------|
| `/src/agents` | Pure functions that perform specific analysis tasks | Take `ExplainState`, return `ExplainState` |
| `/src/services` | Business logic orchestrators | Coordinate agents, repos, and external APIs |
| `/src/routes` | HTTP request handlers | Express route definitions |
| `/src/graph` | Agent workflow orchestration | LangGraph state machines |
| `/src/repos` | Data persistence layer | Prisma-based CRUD operations |
| `/src/tools` | Reusable utilities | Domain logic, API clients, helpers |
| `/src/types` | Type definitions | TypeScript interfaces and types |
| `/src/domain` | Domain models and logic | Business rules, validations |
| `/src/middleware` | Express middleware | Auth, logging, error handling |

---

## Key Technologies

### Runtime & Framework
- **Node.js + TypeScript**: ES2020 target, CommonJS modules
- **Express 5.2.1**: REST API server with JSON middleware (2MB limit)

### Database
- **PostgreSQL**: Primary database
- **Prisma 7.2.0**: ORM with type-safe client
- **@prisma/adapter-pg**: Connection pooling with pg driver

### AI/ML Orchestration
- **LangChain Core 1.1.8**: Base abstractions
- **LangGraph 1.0.3**: State machine for agent orchestration
- **OpenAI SDK 1.2.0**: GPT-4.1-mini integration

### External Services
- **Clerk SDK**: User authentication and JWT verification
- **Polygon.io**: Market data API (prices, news)

### Utilities
- **axios 1.13.2**: HTTP client
- **csv-parse 6.1.0**: Portfolio CSV import
- **zod 4.2.1**: Runtime schema validation
- **p-limit 7.2.0**: Concurrency control
- **jsonwebtoken 9.0.3**: JWT handling

---

## Architecture Patterns

### 1. Multi-Agent Architecture

Each agent is a **pure function** that:
1. Accepts the current `ExplainState`
2. Performs a specific computation/analysis
3. Returns the updated `ExplainState`

**Example Agent Pattern:**
```typescript
// src/agents/statsAgent.ts
export function statsAgent(state: ExplainState): ExplainState {
  if (!state.holdings?.length) {
    throw new Error("No holdings in state");
  }

  const stats = computePortfolioStats(state.holdings);

  return {
    ...state,
    stats,
  };
}
```

**Agent Types:**
- **Synchronous**: `statsAgent`, `riskAgent`, `diversifierCandidatesAgent`
- **Asynchronous**: `explainerAgent`, `deepResearchAgent`, `warningAgent`, `priceUpdateAgent`

### 2. LangGraph State Machine

The portfolio analysis workflow is orchestrated via a directed acyclic graph (DAG):

```
START
  ↓
priceUpdate (conditional on useLivePrices)
  ↓
statsNode (compute portfolio statistics)
  ↓
risk (assess risk level)
  ↓
diversifierCandidates (select tickers)
  ↓
deepResearch (fetch market news)
  ↓
diversification (generate ideas)
  ↓
[CONDITIONAL BRANCH]
  ├─→ warningNode (if HIGH risk) → explain → END
  └─→ explain → END
```

**Key Features:**
- Type-safe state annotations via `Annotation.Root`
- Conditional edges for dynamic branching
- Partial state updates (nodes only return changed fields)

**Example Graph Definition:**
```typescript
// src/graph/portfolioExplainerGraph.ts
export function buildPortfolioExplainerGraph() {
  const workflow = new StateGraph(ExplainAnnotation)
    .addNode("priceUpdate", priceUpdateNode)
    .addNode("statsNode", statsNode)
    .addNode("risk", riskNode)
    // ... more nodes
    .addEdge(START, "priceUpdate")
    .addEdge("priceUpdate", "statsNode")
    .addConditionalEdges("diversification", async (state) => {
      return state.riskLevel === "HIGH" ? "warning" : "explain";
    }, {
      warning: "warningNode",
      explain: "explain",
    })
    .addEdge("explain", END);

  return workflow.compile();
}
```

### 3. Repository Pattern

Data access is abstracted via repositories:

```typescript
// src/repos/portfolio.repo.ts
export async function getLatestTwoSnapshots(userId: string) {
  return await prisma.portfolioSnapshot.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 2,
    include: { holdings: true },
  });
}
```

**Benefits:**
- Decouples business logic from database
- Enables easy testing with mocks
- Centralizes query logic

### 4. Service Layer Pattern

Services orchestrate complex workflows:

```typescript
// src/services/portfolioAnalysis.service.ts
export async function analyzeLatestPortfolioForUser(
  userId: string,
  opts?: { useLivePrices?: boolean }
): Promise<{ snapshotId: string; result: ExplainState; portfolioDiff?: PortfolioDiff }> {
  // 1. Ensure user exists
  await ensureUser(userId);

  // 2. Fetch latest snapshots
  const [latest, prev] = await getLatestTwoSnapshots(userId);

  // 3. Compute portfolio diff if previous exists
  let portfolioDiff: PortfolioDiff | undefined;
  if (prev) {
    portfolioDiff = diffFromStats(prevStats, nextStats);
  }

  // 4. Invoke graph
  const finalState = await graph.invoke({
    holdings,
    useLivePrices: opts?.useLivePrices ?? false
  });

  return { snapshotId: latest.id, result: finalState, portfolioDiff };
}
```

### 5. Middleware Pattern

Express middleware for cross-cutting concerns:

```typescript
// src/middleware/requireClerkAuth.ts
export async function requireClerkAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { sub } = await verifyToken(token);
    req.userId = sub;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}
```

---

## Development Workflows

### Initial Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env  # Create if doesn't exist
# Edit .env with required values

# 3. Run database migrations
npx prisma migrate dev

# 4. Generate Prisma client
npx prisma generate

# 5. Build TypeScript
npm run build

# 6. Start server
npm start
```

### Development Cycle

```bash
# Make code changes in src/

# Rebuild
npm run build

# Restart server
npm start
```

### Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name add_new_field

# Apply migrations in production
npx prisma migrate deploy

# Reset database (WARNING: destructive)
npx prisma migrate reset
```

### Prisma Studio (Database GUI)

```bash
npx prisma studio
```

---

## Code Conventions

### TypeScript Style

1. **Strict Mode**: All strict TypeScript checks enabled
2. **Type Imports**: Use `import type` for type-only imports
   ```typescript
   import type { ExplainState } from "../types/portfolio";
   ```

3. **Function Exports**: Use named exports, not default exports
   ```typescript
   // Good
   export function statsAgent(state: ExplainState) { ... }

   // Avoid
   export default function(state: ExplainState) { ... }
   ```

4. **Error Handling**: Throw descriptive errors with context
   ```typescript
   if (!state.holdings?.length) {
     throw new Error("No holdings in state");
   }
   ```

### Agent Conventions

1. **Pure Functions**: Agents should be stateless and deterministic (except for async LLM calls)
2. **State Spreading**: Always spread existing state, then override specific fields
   ```typescript
   return {
     ...state,
     stats,
   };
   ```

3. **Type Safety**: Accept `ExplainState`, return `ExplainState`
4. **Naming**: Use descriptive names ending in `Agent` (e.g., `statsAgent`, `riskAgent`)

### Service Conventions

1. **Async/Await**: All service functions are async
2. **Error Propagation**: Let errors bubble up, don't swallow them
3. **Transactional Thinking**: Ensure data consistency
4. **Naming**: Use verb phrases (e.g., `analyzeLatestPortfolioForUser`)

### Route Conventions

1. **Express Router**: Use `express.Router()` for modularity
2. **Middleware**: Apply auth middleware at route level
   ```typescript
   router.post("/import", requireClerkAuth, async (req, res) => { ... });
   ```

3. **Response Format**: Return JSON with consistent structure
   ```typescript
   // Success
   res.json({ data: result });

   // Error
   res.status(400).json({ error: "Description" });
   ```

4. **Status Codes**: Use appropriate HTTP status codes
   - 200: Success
   - 201: Created
   - 400: Bad request
   - 401: Unauthorized
   - 404: Not found
   - 500: Server error

### File Naming

- **Lowercase with hyphens**: Not used in this codebase
- **camelCase**: Used for all files (e.g., `portfolioAnalysis.service.ts`)
- **Suffixes**: Use `.service.ts`, `.repo.ts`, `.routes.ts`, `Agent.ts` for clarity

---

## Database Schema

### User Model

```prisma
model User {
  id        String   @id // Clerk sub (external ID)
  email     String?
  createdAt DateTime @default(now())

  snapshots       PortfolioSnapshot[]
  researchReports ResearchReport[]
}
```

### PortfolioSnapshot Model

```prisma
model PortfolioSnapshot {
  id        String   @id @default(uuid())
  userId    String
  source    String   // e.g., "CSV_UPLOAD", "MANUAL"
  createdAt DateTime @default(now())

  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  holdings        Holding[]
  researchReports ResearchReport[]

  @@index([userId, createdAt])
}
```

### Holding Model

```prisma
model Holding {
  id         String  @id @default(uuid())
  snapshotId String
  symbol     String  // Stock ticker (e.g., "AAPL")
  shares     Float   // Number of shares
  price      Float?  // Price per share (nullable until updated)
  assetClass String? // e.g., "STOCK_US", "BOND", "CRYPTO"

  snapshot PortfolioSnapshot @relation(fields: [snapshotId], references: [id], onDelete: Cascade)

  @@index([snapshotId])
  @@index([symbol])
}
```

### ResearchReport Model

```prisma
model ResearchReport {
  id         String   @id @default(cuid())
  userId     String
  snapshotId String?  // Optional: for ad-hoc reports
  runType    String   @default("WEEKLY") // WEEKLY | MANUAL | MONTHLY
  createdAt  DateTime @default(now())

  inputJson  Json?    // Context used for generation
  outputMd   String   // Final report (markdown)

  status     String   @default("SUCCESS") // SUCCESS | FAILED | RUNNING
  error      String?  // Error message if failed

  user     User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  snapshot PortfolioSnapshot? @relation(fields: [snapshotId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@index([snapshotId])
  @@index([runType, createdAt])
}
```

### Relationships

- **User → PortfolioSnapshot**: One-to-many (cascade delete)
- **PortfolioSnapshot → Holding**: One-to-many (cascade delete)
- **User → ResearchReport**: One-to-many (cascade delete)
- **PortfolioSnapshot → ResearchReport**: One-to-many (set null on delete)

---

## API Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-10T12:00:00.000Z"
}
```

### Portfolio Import

```http
POST /portfolio/import
Authorization: Bearer <clerk-jwt>
Content-Type: application/json

{
  "csv": "symbol,shares,price\nAAPL,100,150.00\nGOOG,50,2800.00"
}
```

**Response:**
```json
{
  "snapshotId": "uuid-here",
  "holdingsCount": 2
}
```

### Portfolio Analysis

```http
POST /analyze
Authorization: Bearer <clerk-jwt>
Content-Type: application/json

{
  "useLivePrices": true
}
```

**Response:**
```json
{
  "snapshotId": "uuid-here",
  "stats": { ... },
  "riskLevel": "MEDIUM",
  "riskFactors": ["Top position is more than 20% of the portfolio."],
  "explanation": "Your portfolio shows...",
  "diversificationIdeas": "Consider adding...",
  "portfolioDiff": { ... }
}
```

### Weekly Research

```http
POST /research
Authorization: Bearer <clerk-jwt>
Content-Type: application/json

{
  "useLivePrices": true
}
```

**Response:**
```json
{
  "reportId": "cuid-here",
  "markdown": "# Portfolio Research Report\n\n..."
}
```

---

## Environment Variables

Create a `.env` file in the project root:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/portfolio_db"

# Authentication
CLERK_SECRET_KEY="sk_test_..." # Clerk JWT verification secret

# Market Data
POLYGON_API_KEY="your-polygon-api-key"
MARKET_DATA_PROVIDER="polygon" # Default provider
USE_LIVE_PRICES="true" # Enable live price updates

# AI/ML
OPENAI_API_KEY="sk-..." # OpenAI API key for GPT-4.1-mini

# Server
PORT="3000" # Optional, defaults to 3000

# Logging
LOG_RUNS="true" # Enable JSONL run logging
```

**Security Notes:**
- Never commit `.env` to version control
- Use different keys for development/production
- Rotate API keys regularly

---

## Known Issues

### 1. Missing Market News Integration

**Location**: `src/agents/deepResearchAgent.ts`

**Issue**: The agent imports from `src/integrations/marketNews/PolygonNewsProvider` which doesn't exist.

```typescript
// This import will fail at runtime
import { PolygonNewsProvider } from "../../integrations/marketNews/PolygonNewsProvider";
```

**Impact**: Deep research node will crash if executed.

**Fix**: Implement the missing integration:
1. Create `/src/integrations/marketNews/PolygonNewsProvider.ts`
2. Implement `fetchNewsForSymbol(symbol: string): Promise<NewsArticle[]>`
3. Use existing `polygonClient.ts` as reference

### 2. No Testing Infrastructure

**Issue**: Zero test coverage.

**Impact**: No automated verification of correctness.

**Recommendation**: Add Jest or Vitest:
```bash
npm install --save-dev jest @types/jest ts-jest
```

### 3. Research Route Misconfiguration

**Location**: `src/app.ts:13`

```typescript
app.use("/research", analyzeRouter); // Should be researchRouter
```

**Impact**: Research endpoint uses wrong route handler.

---

## Adding New Features

### Adding a New Agent

1. **Create agent file**: `src/agents/newAgent.ts`
   ```typescript
   import type { ExplainState } from "../types/portfolio";

   export async function newAgent(state: ExplainState): Promise<ExplainState> {
     // Your logic here
     return {
       ...state,
       newField: computedValue,
     };
   }
   ```

2. **Update state type**: `src/types/portfolio.ts`
   ```typescript
   export type ExplainState = {
     // ... existing fields
     newField?: YourType;
   };
   ```

3. **Add to graph**: `src/graph/portfolioExplainerGraph.ts`
   ```typescript
   import { newAgent } from "../agents/newAgent";

   // Add to annotation
   const ExplainAnnotation = Annotation.Root({
     // ... existing fields
     newField: Annotation<ExplainState["newField"]>(),
   });

   // Create node wrapper
   async function newNode(state: GraphState): Promise<Partial<GraphState>> {
     const updated = await newAgent(state as unknown as ExplainState);
     return { newField: updated.newField };
   }

   // Add to workflow
   .addNode("newNode", newNode)
   .addEdge("previousNode", "newNode")
   .addEdge("newNode", "nextNode")
   ```

### Adding a New API Endpoint

1. **Create route file**: `src/routes/feature.routes.ts`
   ```typescript
   import { Router } from "express";
   import { requireClerkAuth } from "../middleware/requireClerkAuth";

   export const featureRouter = Router();

   featureRouter.post("/action", requireClerkAuth, async (req, res) => {
     try {
       const userId = req.userId;
       const result = await yourService(userId, req.body);
       res.json({ data: result });
     } catch (err) {
       console.error(err);
       res.status(500).json({ error: "Internal error" });
     }
   });
   ```

2. **Register in app**: `src/app.ts`
   ```typescript
   import { featureRouter } from "./routes/feature.routes";

   export function createApp() {
     const app = express();
     // ... existing middleware
     app.use("/feature", featureRouter);
     return app;
   }
   ```

### Adding a Database Model

1. **Update schema**: `prisma/schema.prisma`
   ```prisma
   model NewModel {
     id        String   @id @default(uuid())
     userId    String
     data      String
     createdAt DateTime @default(now())

     user User @relation(fields: [userId], references: [id])

     @@index([userId, createdAt])
   }

   // Add relation to User
   model User {
     // ... existing fields
     newModels NewModel[]
   }
   ```

2. **Create migration**:
   ```bash
   npx prisma migrate dev --name add_new_model
   ```

3. **Create repository**: `src/repos/newModel.repo.ts`
   ```typescript
   import { prisma } from "../db";

   export async function createNewModel(userId: string, data: string) {
     return await prisma.newModel.create({
       data: { userId, data },
     });
   }
   ```

---

## Testing Guidelines

### Recommended Testing Stack

```bash
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @testing-library/node
```

### Testing Patterns

**Unit Test (Agent):**
```typescript
// src/agents/__tests__/statsAgent.test.ts
import { statsAgent } from "../statsAgent";

describe("statsAgent", () => {
  it("should compute portfolio statistics", () => {
    const state = {
      holdings: [
        { symbol: "AAPL", shares: 100, price: 150, assetClass: "STOCK_US" },
      ],
    };

    const result = statsAgent(state);

    expect(result.stats).toBeDefined();
    expect(result.stats.totalValue).toBe(15000);
  });
});
```

**Integration Test (Service):**
```typescript
// src/services/__tests__/portfolioAnalysis.test.ts
import { analyzeLatestPortfolioForUser } from "../portfolioAnalysis.service";

jest.mock("../../repos/portfolio.repo");
jest.mock("../../graph/portfolioExplainerGraph");

describe("analyzeLatestPortfolioForUser", () => {
  it("should analyze latest portfolio", async () => {
    // Mock setup
    const result = await analyzeLatestPortfolioForUser("user-123");

    expect(result.snapshotId).toBeDefined();
    expect(result.result.stats).toBeDefined();
  });
});
```

---

## Best Practices

### For AI Assistants

1. **Read Before Writing**: Always read existing files before modifying them
2. **Follow Patterns**: Match the established patterns in the codebase
3. **Type Safety**: Ensure all TypeScript types are correct
4. **Error Handling**: Add proper error handling with descriptive messages
5. **Testing**: Write tests for new features (when testing is set up)
6. **Documentation**: Update this CLAUDE.md when adding new patterns
7. **Environment**: Check `.env` requirements for new features
8. **Migrations**: Always create Prisma migrations for schema changes

### Code Quality

1. **No Any Types**: Avoid `any`, use proper TypeScript types
2. **Async/Await**: Prefer async/await over promises/callbacks
3. **Error Messages**: Include context in error messages
4. **Validation**: Use Zod for runtime validation of external data
5. **SQL Injection**: Use Prisma parameterized queries (automatic)
6. **XSS Protection**: Sanitize user inputs (especially CSV data)

### Performance

1. **Database Indexes**: Add indexes for frequently queried fields
2. **Concurrency Control**: Use `p-limit` for rate-limited APIs
3. **Caching**: Consider caching for expensive computations
4. **Batch Operations**: Use Prisma's `createMany` for bulk inserts

### Security

1. **Authentication**: Always use `requireClerkAuth` on protected routes
2. **Authorization**: Verify user owns resources (check userId)
3. **Environment Variables**: Never hardcode secrets
4. **Input Validation**: Validate all user inputs
5. **SQL Injection**: Prisma prevents this automatically
6. **XSS**: Express doesn't render HTML, but sanitize if needed

---

## Quick Reference

### Common Commands

```bash
# Development
npm run build          # Compile TypeScript
npm start              # Start server

# Database
npx prisma migrate dev # Create/apply migrations
npx prisma studio      # Open database GUI
npx prisma generate    # Regenerate Prisma client

# Git
git status             # Check status
git add .              # Stage all changes
git commit -m "..."    # Commit changes
git push               # Push to remote
```

### File Locations

| What | Where |
|------|-------|
| Add agent | `src/agents/newAgent.ts` |
| Add service | `src/services/newService.service.ts` |
| Add route | `src/routes/newRoute.routes.ts` |
| Add type | `src/types/` |
| Add repo | `src/repos/newRepo.repo.ts` |
| Database schema | `prisma/schema.prisma` |
| Environment vars | `.env` (create if missing) |

### State Type Reference

```typescript
type ExplainState = {
  holdings: Holding[];
  stats?: PortfolioStats;
  explanation?: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  riskFactors?: string[];
  warning?: string;
  diversificationIdeas?: string;
  useLivePrices?: boolean;
  portfolioDiff?: PortfolioDiff;
  researchBrief?: ResearchBrief;
  evidenceBundle?: EvidenceBundle;
  diversifierCandidates?: DiversifierCandidate[];
};
```

---

## Version History

- **v1.0.0** (2026-01-10): Initial CLAUDE.md creation with comprehensive codebase documentation

---

## Support & Resources

- **Prisma Docs**: https://www.prisma.io/docs
- **LangChain Docs**: https://js.langchain.com/docs
- **LangGraph Docs**: https://langchain-ai.github.io/langgraphjs/
- **Clerk Docs**: https://clerk.com/docs
- **Polygon.io API**: https://polygon.io/docs

---

**Last Updated**: 2026-01-10
**Maintainer**: AI Assistant (Claude)
**Project**: Agentic Investment Research
**Version**: 1.0.0
