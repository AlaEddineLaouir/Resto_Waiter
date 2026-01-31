# Migrating Restaurant Menu Chatbot to Next.js + MCP

## Overview
Transform the current Node.js/Express MVP into a modern Next.js application with MCP integration for a restaurant menu chatbot.

## Technology Stack

### Frontend & Backend
- **Next.js 14+** (App Router) - Fullstack React framework
- **Vercel AI SDK** - Chat UI with streaming support via `useChat()` hook
- **TypeScript** - Type safety across the stack

### MCP Integration
- **@modelcontextprotocol/sdk** - Official MCP TypeScript SDK for client/server connections
- **Transport Options**:
  - Development: `stdio` transport (local MCP servers)
  - Production: SSE/HTTP transport (Vercel deployment)

### AI Provider
- **Perplexity AI** - Chat completions (integrated via Vercel AI SDK)

## Architecture

### Option 1: Embedded MCP Server (Recommended for MVP)
Run MCP server logic inside Next.js API routes:
- `app/api/chat/route.ts` - Chat endpoint with streaming
- `app/api/mcp/route.ts` - MCP tool execution endpoint
- MCP tools run in the same process as Next.js

**Pros**: Simple deployment, single codebase
**Cons**: Limited scalability for many tools

### Option 2: Separate MCP Server Process
Keep MCP server as standalone Node.js process:
- Next.js app connects to MCP server via stdio/SSE
- Better separation of concerns
- Easier to add more MCP servers later

**Pros**: Better for multi-tool scenarios, cleaner architecture
**Cons**: Requires managing separate process

## Implementation Plan

### 1. Project Setup