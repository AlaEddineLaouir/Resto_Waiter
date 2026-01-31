You are tasked with migrating the frontend of a restaurant menu chatbot from vanilla JavaScript to React.js while preserving all existing functionality and architecture.

## Critical Requirements

1. **Preserve Multi-tenant Architecture**: Maintain all tenant-specific configurations, routing, and data isolation
2. **Maintain MCP Integration**: Keep all Model Context Protocol client connections and tool interactions intact
3. **Preserve REST API Communication**: Maintain all existing API endpoints and request/response patterns
4. **Keep Authentication Flow**: Preserve any existing auth mechanisms and API key management
5. **Maintain Feature Parity**: All current features must work identically after migration

## Migration Strategy

### Phase 1: Project Setup
- Initialize React with Vite or Create React App in a new `frontend/` directory
- Keep `public/` as legacy reference until migration complete
- Set up environment variables for API base URL and tenant configuration
- Configure proxy for API calls during development

### Phase 2: Component Architecture
- **App.js**: Main container with routing and tenant context
- **ChatInterface.js**: Main chat UI component
- **MessageList.js**: Display chat history
- **MessageInput.js**: User input with send button
- **SetupPage.js**: API key configuration (if exists)
- **MenuDisplay.js**: Restaurant menu visualization (if exists)
- **TenantProvider.js**: Context provider for multi-tenant state

### Phase 3: State Management
- Use React Context API for global state (tenant, user, API config)
- useState/useEffect for component-level state
- Consider React Query or SWR for API data fetching and caching

### Phase 4: API Integration
- Create `services/api.js` with axios or fetch wrappers
- Implement hooks: `useChat`, `useMenu`, `useMCPTools`
- Maintain exact same API endpoint structure

### Phase 5: Styling Migration
- Convert existing CSS to CSS Modules or styled-components
- Maintain current design system and branding
- Ensure responsive design is preserved

### Phase 6: Testing & Validation
- Test all MCP tool calls (get_menu, get_dish_details, etc.)
- Verify multi-tenant isolation
- Test chat flow end-to-end
- Cross-browser compatibility check

## Key Considerations

- **Environment Variables**: Use `.env` for tenant configs (e.g., `VITE_TENANT_ID`, `VITE_API_BASE_URL`)
- **Routing**: Use React Router if multiple pages exist
- **Performance**: Implement lazy loading for components
- **Error Boundaries**: Add React error boundaries for graceful error handling
- **Build Output**: Configure build to output to `public/` or update Express static serving

## Migration Checklist

- [ ] Initialize React project structure
- [ ] Create component hierarchy
- [ ] Migrate state management
- [ ] Port API integration logic
- [ ] Convert CSS/styling
- [ ] Implement routing (if needed)
- [ ] Add error handling
- [ ] Test multi-tenant functionality
- [ ] Test MCP tool integration
- [ ] Update build configuration
- [ ] Update documentation


