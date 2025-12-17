# Ark Architecture Conventions

Conventions and patterns for Ark architecture design.

The **essential** goal of this skill is to propose architecture solutions which are either clearly correct and idiomatic for Ark because they follow existing conventions with nothing 'surprising' OR that this skill is used to surface key questions around technical design.

This skill will lead to discussions with the user - the user should have their assumptions challenged, and the use of this skill will surface unexpected one-way decisions, impact to users, potential compatibility issues and so on.

This skill should be **self-improving** - as questions around architecture are raised, we can often define or clarify our conventions, making this skill more refined and allowing us to 'one shot' architecture more regularly.

The goal is that as we move forwards, most architecture decisions are simple - we follow our documented conventions. For anything more complex, we discuss and then collaboratively improve our conventions over time.

## Principles

- **Discuss and challenge** - Work with the user to raise the important points that should be discussed - challenge the users assumptions
- **Reuse over creation** - Extend existing services, models, patterns, 
- **Incremental delivery** - Design so features can be shipped in stages if possible or discuss if this is not possible
- **Reversibility** - Identify and discuss decisions that lock in future options
- **No assumed compatibility** - Do not assume backwards compatibility is needed; raise compatibility points to discuss

## Conventions

Each of these conventions has been surfaced during architecture discussions. The goal of this skill is that as we surface more questions in the future, we can document more conventions.

**CRD Design**
- Confirm CRD designs follow Kubernetes conventions
- Read actual CRD definitions from `ark/api/v1alpha1/*_types.go` before showing examples

**API Design**
- Watch and SSE Streaming: For Ark APIs use `?watch=true` query parameter for SSE streaming (inspired by K8s watch semantics, but using SSE transport - `text/event-stream` with `data:` prefixed lines)
- Real-time APIs for the Dashboard: The pattern is two-shot - first use classic REST to load resources and fetch `resource version` and then start a `watch=true` to real-time update on server side changes

**Charts and Services**
- Service ports: Use named ports (e.g., `port: mcp`) rather than port numbers

These conventions will grow over time.

## Output Format

Architecture documents should include:

- **Overview**: 2-3 sentences on approach
- **Component Diagram**: ASCII or Mermaid showing interactions
- **Data Model**: CRD schemas, database tables (as YAML/JSON examples)
- **CRDs**: Show YAML examples, not Go structs
- **APIs**: Show JSON payloads and API endpoints with example requests/responses, not implementation code
- **Data files**: Show file structure, such as JSON, not code
- **One-Way Decisions**: Irreversible choices needing team alignment
- **Open Questions**: The most essential output - what are open questions to discuss

Note: your goal is **not** to plan implementation, there are other agents for this that will take your output. Your goal is to provoke discussion, improve our conventions, and work with the user(s) to build a target state architecture as needed for a feature or change.
