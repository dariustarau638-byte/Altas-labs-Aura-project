# Aura AI — Tier & Plans Breakdown

Comprehensive comparison of features, limits, and capabilities across **Free**, **Pro**, and **Enterprise** tiers.

---

## Plan Comparison Matrix

| Feature / Capability | Free Tier | Aura Pro | Aura Enterprise |
| :--- | :---: | :---: | :---: |
| **Pricing (Monthly)** | **$0** (Free Forever) | **$20** / month | **$50** / month (or custom) |
| **Pricing (Annual)** | **$0** | **$240** / year | **$600** / year |
| **Daily Action Limit** | **50 actions / day** | **Unlimited** (∞) | **Unlimited** (∞) + Priority |
| **Model Support** | **Local Models Only** (Ollama: Llama 3.2, Qwen 2.5) | **Cloud LLMs** (GPT-4o, Claude 3.5 Sonnet, Gemini 1.5) + Local | **Multi-Cloud Router** + Dedicated On-Premise Endpoints |
| **Screen Perception & Vision** | ❌ Disabled | **Full Screen Vision** (On-demand context snapshot) | **Real-Time Visual Recall** & 60fps Visual Timeline |
| **Autonomous PC Control** | ❌ Disabled | **Basic PC Automation** (Shortcuts, Safe Tools) | **Full Cursor Co-Pilot** (Autonomous Mouse & Click) |
| **Jarvis System Tools (40+)** | Safe & Diagnostic Tools Only | **All 40+ System Tools** (with Approval Gate) | **Full System Tools** + Remote Headless Agent Swarm |
| **Scheduled Routines** | 1 Active Routine (Manual) | **Unlimited Routines** (Time of Day, Interval) | **Multi-Machine Synced Routines** |
| **Contextual Memory (Pieces)** | Last 15 Snippets | **Unlimited Clipboard Memory** (500+ items) | **Team Knowledge Base** & Organization Sync |
| **Cloud Connectors** | ❌ None | **Gmail, Google Drive, Calendar, GitHub, Notion** | **Enterprise SSO, SCIM & Custom Webhooks** |
| **Isolated Cloud Workspace** | ❌ None | ❌ None | **Dedicated Windows Cloud VM** |
| **Device Allowance** | 1 PC | Up to 3 PCs / Laptops | Up to 10 PCs + Team Management |
| **Telemetry & Usage Dashboard** | Basic Daily Quota View | Detailed Usage Aggregates (Web + Desktop) | Enterprise Audit Logs & Real-Time Telemetry Export |
| **Support & SLA** | Community / Discord | Priority 24-Hour Email Support | Dedicated Account Manager + 99.9% Uptime SLA |

---

## Detailed Tier Overview

### 1. Free Tier (`free`)
- **Ideal For**: Hobbyists, privacy-focused developers, and users testing Aura with local hardware.
- **Core Principle**: 100% on-device local inference with zero cloud dependency.
- **Key Limitations**:
  - Capped at **50 actions per 24 hours** (resets daily).
  - Only local models via Ollama (`llama3.2`, `qwen2.5-coder`, `mistral`).
  - Screen Vision context capture disabled.
  - Dangerous system operations (disk format, process kill) locked.

### 2. Aura Pro (`pro`)
- **Ideal For**: Power users, software engineers, and busy professionals seeking full desktop acceleration.
- **Core Principle**: Blends local speed with state-of-the-art cloud AI intelligence.
- **Key Benefits**:
  - **Unlimited daily actions** — no caps or throttling.
  - Access to premier cloud models (OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, Google Gemini 1.5 Pro).
  - **Screen-Aware Vision**: Attach desktop screen snapshots for visual context in chat and automation.
  - Full Jarvis System Tools suite with Human-in-the-Loop Security Gates.
  - Permanent license for up to 3 personal devices.

### 3. Aura Enterprise (`enterprise`)
- **Ideal For**: Teams, organizations, and power automation architects.
- **Core Principle**: Multi-machine orchestration, compliance, and dedicated computing capacity.
- **Key Benefits**:
  - Autonomous Cursor Co-Pilot for robotic desktop workflow automation.
  - Isolated Cloud Windows Workspaces for running untrusted tasks safely.
  - Team-wide clipboard memory sharing and centralized policy management.
  - SLA guarantees, custom token allocations, and dedicated model hosting.

---

## Enforcement & Upgrade Protocol

1. **Backend Rate-Limiting**: Every action sent through `/api/usage/track` evaluates the caller's JWT tier. If a Free user exceeds 50 actions within 24 hours, the backend returns a `403 Forbidden` response (`code: "DAILY_LIMIT_EXCEEDED"`).
2. **Feature Access Gates**: Gated endpoints (e.g. cloud LLM routing, screen vision) immediately verify entitlement, returning `code: "PRO_FEATURE_REQUIRED"`.
3. **Non-Intrusive Client Alerts**: When a restriction is hit, Aura displays an ergonomic banner with a direct one-click route to the Billing & Upgrade section.
