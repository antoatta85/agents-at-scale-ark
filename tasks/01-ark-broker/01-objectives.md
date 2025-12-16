---
owner: Ark Protocol Orchestrator
description: Objectives for the Ark Broker
---

# Ark Broker - Objectives

A number of objectives, goals and deficiencies for the current system have been identified. These are all somewhat related and it is possible that a single well-defined and well-architected service - the Ark Broker - may be able to solve for all.

**Offloading Query Events from K8S Events**

- ToolCallStart, ToolCallEnd, etc, are currently written as K8S events so that other parts of the system can read them.
- This is duplicative of our OTEL work, where we already fire these events to an OTEL endpoint
- This is problematic because K8S events are rate-limited and not guaranteed, and large numbers of queries will create huge numbers of events and cause performance issues
- K8S events expire after a short time (1hr) meaning that it is very hard to see what has happened for earlier queries

This suggests a better solution for events is needed, ideally one that is not duplicative of what we are doing for OTEL.

**Better User Experience for Observing Queries**

- Users have been asking for a better more interactive and real-time experience building agents and testing queries
- The most asked-for items are tool call events in the Chat View and Dashboard and CLIs etc [these are available but some users not using them]
- Users would like to see _everything_ that's happening for a query - the LLM completion stream, the tool calls, etc

This suggests a single, well defined endpoint that provides all events to users is needed.

**An aggregate 'Sessions' view**

- Users want to be able to group related queries together into 'sessions' and real-time see all events that relate to a session

This suggests some kind of storage or stream that can filter or aggregate by sessions is needed.

**Fine-grained query data such as MCP Session ID**

- Some features, such as an MCP "Questions" service would be greatly simplified if the code was able to load the 'session' for a query and see what the MCP session ID was for a tool call (e.g. find the MCP session that the "Ask Question" call came from and use that for the "Answer Question" call, see the dwmkerr fork 'questions' investigation)

This suggests as above that being able to keep all key data for the queries and sessions that the controller produces and make it more accessible is needed.

**Replay or resume**

- Having a sufficient amount of data stored for a session (such as the MCP session ID, MCP task ID, tool calls, etc) would allow for 'replay' or 'resume' of queries, which is another asked for feature

This suggests that (again) keeping all essential query data is essential to support advanced features like this.

**Reduce technical debt / poorly named services / platform for the future**

- Ideally replace the 'ark cluster memory' (which is poorly named and handling multiple responsibilities) with a more well-structured service.
- Simplify how conversations are handled and break them out from sessions

The suggests that replacing ark cluster memory with a single broker service would simplify. If the broker service itself already receives all queries and messages then it may be possible to simplify how conversations are loaded.

**Architecture to enable query reconciliation**

- We will have to move query reconciliation off the controller at some point (or at least allow it to run off controller)
- This'll likely mean a broker for queries with a processor/reconciler

This suggests that the broker/db pattern, along with a reconciler which can process query events would be an enabling capability for the future. If we get this right we have the architectural components needed to offload query reconciliation.

**Create a source of data for higher order Ark services**

The Ark controller must be able to operate without the broker, but higher order components could depend upon data in the broker, for example a questions service could use the broker for data, the Noah agent could consume the data if needed, an MCP server could build on top of this data.

## Users

Who might use these capabilities?

- The Ark Dashboard users - they want to see what is going on (tool calls etc)
- The Ark CLI and Fark CLI - similar to above
- People building on top of Ark - e.g. someone is building a VS Code extension

## Summary - the Ark Broker

Our hypothesis is that a single 'Ark Broker', which is the main 'sink' for all controller data (LLM completion chunks, query events, correlation data, etc) which operates as an event stream (with the option to persist data for long term storage) would support this. We would receive the same OTEL data that we send to the OTEL endpoints, as well as handle the LLM completion streams, and in future the A2A Task Updates.
