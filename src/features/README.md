# Unified State Management System

This document explains the new unified state management system implemented as part of the rearchitecture plan.

## Overview

The unified state management system provides:

- Feature-specific Zustand stores
- Standardized React Query patterns
- Provider abstraction with health monitoring
- Custom hooks for each feature
- Global provider management

## Architecture

### 1. Feature-Specific Stores

Each feature has its own Zustand store located in `features/{feature}/store/`:

- **Auth Store** (`features/auth/store/authStore.ts`): User authentication and auth modal state
- **Parlay Store** (`features/parlay/store/parlayStore.ts`): Parlay data, generation state, and provider selection
- **Games Store** (`features/games/store/gamesStore.ts`): NFL games data and week selection
- **Legal Store** (`features/legal/store/legalStore.ts`): Legal compliance and modal states

### 2. Provider Management

- **Provider Store** (`store/providerStore.ts`): Global provider health monitoring and statistics
- **Provider Context** (`contexts/ProviderContext.tsx`): Provider manager and selection logic
- **Provider Hooks** (`hooks/providers/useProviderQueries.ts`): React Query hooks for provider operations

### 3. Standardized React Query

- **Query Config** (`hooks/query/useQueryConfig.ts`): Standardized configuration and query keys
- **Feature Hooks**: Each feature has dedicated query hooks in `features/{feature}/hooks/`

## Usage Examples

### Basic Store Usage

```typescript
import { useParlayStore } from '../features/parlay/store/parlayStore'
import { useGamesStore } from '../features/games/store/gamesStore'

function MyComponent() {
  // Access parlay state
  const { parlay, selectedGame, setParlay } = useParlayStore()

  // Access games state
  const { games, selectedWeek, setSelectedWeek } = useGamesStore()

  // Use the state...
}
```

### Provider Selection

```typescript
import { useParlayGeneratorWithProviders } from '../features/parlay/hooks/useParlayGeneratorWithProviders'

function ParlayComponent() {
  const {
    generateWithAutoSelection,
    generateWithProviders,
    selectedAIProvider,
    availableAIProviders,
    setSelectedAIProvider,
  } = useParlayGeneratorWithProviders()

  // Auto-select best providers
  const handleAutoGenerate = () => {
    generateWithAutoSelection(preferences)
  }

  // Use specific providers
  const handleGenerateWithProvider = () => {
    generateWithProviders(preferences, 'openai', 'espn')
  }

  // Manual provider selection
  const handleProviderChange = (provider: string) => {
    setSelectedAIProvider(provider)
  }
}
```

### React Query with Provider Abstraction

```typescript
import { useNFLGamesQuery } from '../features/games/hooks/useGamesQueries'
import { useProviderHealthQuery } from '../hooks/providers'

function GamesComponent() {
  // Games query with automatic provider selection
  const { data: games, isLoading, error } = useNFLGamesQuery(week)

  // Provider health monitoring
  const { data: providerHealth } = useProviderHealthQuery()

  // Use the data...
}
```

### Provider Health Monitoring

```typescript
import { useProviderStore } from '../store/providerStore'
import { useProviderHealthQuery } from '../hooks/providers'

function ProviderStatusComponent() {
  const { getHealthyProviders } = useProviderStore()
  const { data: health, mutate: refreshHealth } = useProviderHealthQuery()

  const healthyAI = getHealthyProviders('ai')
  const healthyData = getHealthyProviders('data')

  return (
    <div>
      <h3>Provider Status</h3>
      <p>Healthy AI Providers: {healthyAI.join(', ')}</p>
      <p>Healthy Data Providers: {healthyData.join(', ')}</p>
      <button onClick={() => refreshHealth()}>Refresh</button>
    </div>
  )
}
```

## Migration Guide

### From Old Stores

Replace old store imports:

```typescript
// Old
import useParlayStore from '../store/parlayStore'
import useModalStore from '../store/modalStore'

// New
import { useParlayStore } from '../features/parlay/store/parlayStore'
import { useLegalStore } from '../features/legal/store/legalStore'
```

### From Direct Service Calls

Replace direct service calls with provider-abstracted hooks:

```typescript
// Old
const nflDataService = getNFLDataService()
const games = await nflDataService.getNFLGames(week)

// New
const { data: games } = useNFLGamesQuery(week)
```

### From Manual Provider Management

Replace manual provider management with context-based selection:

```typescript
// Old
const parlayService = new ParlayService('openai')
const result = await parlayService.generateParlay(preferences)

// New
const { generateWithAutoSelection } = useParlayGeneratorWithProviders()
await generateWithAutoSelection(preferences)
```

## Benefits

1. **Consistency**: Standardized patterns across all features
2. **Provider Abstraction**: Easy switching between AI and data providers
3. **Health Monitoring**: Automatic provider health tracking and fallback
4. **Type Safety**: Full TypeScript support with proper typing
5. **Performance**: Optimized React Query caching and state management
6. **Maintainability**: Clear separation of concerns and feature boundaries

## Best Practices

1. **Use Feature Hooks**: Always use feature-specific hooks instead of direct store access
2. **Provider Selection**: Let the system auto-select providers unless specific selection is needed
3. **Error Handling**: Use the standardized error handling patterns in the hooks
4. **Caching**: Leverage React Query's caching for better performance
5. **Health Monitoring**: Monitor provider health for better user experience
