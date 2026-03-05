# Brainstorm: Agent Enable/Disable + Marketplace Foundation

## Problem Statement
Current design shows all 5 agents to every merchant — causes noise/overwhelm. User wants to let merchants create custom agents, but app is MVP stage with stub agents.

## Evaluated Approaches

### A: Enable/Disable Agents (1-2 days)
- **Pros**: Simple, solves noise immediately, low risk, YAGNI-compliant
- **Cons**: No discovery/catalog UX
- **Verdict**: Ship now

### B: Agent Marketplace (1-2 weeks)
- **Pros**: Scalable architecture, good UX for 10+ agents, discovery page
- **Cons**: More effort, premature if <10 agents
- **Verdict**: Architect foundations now, build UI later

### C: No-code Agent Builder (1-3 months)
- **Pros**: Maximum flexibility, competitive differentiator
- **Cons**: Massive effort, security risks (user-defined logic on shop data), needs prompt engineering UI, sandbox, abuse prevention
- **Verdict**: Rejected for MVP. Revisit after PMF.

## Final Decision: A + B Hybrid
- Ship enable/disable immediately (A)
- Design DB schema and architecture ready for marketplace (B)
- Do NOT build custom agent builder (C)

## Implementation Summary
1. Add `ShopAgentConfig` model (shop + agentId + enabled + settings JSON)
2. Dashboard filters by enabled agents only
3. Settings page with agent toggles
4. Navigation auto-generates from enabled agents
5. Agent registry remains code-defined but DB stores per-shop preferences
6. Architecture supports future marketplace catalog page

## Key Constraints
- Target: all merchant segments (SMB to enterprise)
- Stage: MVP, all 5 agents are stubs
- Priority: solve noise first, scale architecture second
