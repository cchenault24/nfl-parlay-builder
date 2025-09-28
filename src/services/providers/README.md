# Unified Provider System

The Unified Provider System provides a robust, configuration-driven abstraction layer for managing AI and data providers in the NFL Parlay Builder application. It supports dynamic provider loading, intelligent selection, health monitoring, and failover mechanisms.

## 🏗️ Architecture

### Core Components

1. **IProvider** - Base interface that all providers must implement
2. **IAIProvider** - Interface for AI model providers (OpenAI, Mock, etc.)
3. **IDataProvider** - Interface for data source providers (ESPN, Mock, etc.)
4. **ProviderFactory** - Dynamic provider creation and configuration
5. **ProviderRegistry** - Provider management and health monitoring
6. **ProviderManager** - Orchestrates factory and registry operations

### Key Features

- ✅ **Configuration-driven loading** - Environment-specific provider configurations
- ✅ **Intelligent selection** - Smart provider selection based on health, performance, and cost
- ✅ **Health monitoring** - Automatic health checks and failover
- ✅ **Type safety** - Full TypeScript support with strict typing
- ✅ **Error handling** - Comprehensive error handling and recovery
- ✅ **Extensibility** - Easy to add new providers

## 🚀 Quick Start

### Basic Usage

```typescript
import { ProviderManager } from './services/providers/ProviderManager'

// Initialize the provider manager
const providerManager = new ProviderManager()
await providerManager.initialize()

// Select an AI provider
const aiProvider = await providerManager.selectAIProvider('performance')

// Select a data provider
const dataProvider = await providerManager.selectDataProvider('reliability')

// Use providers
const parlay = await aiProvider.generateParlay(game, rosters, context)
const games = await dataProvider.getCurrentWeekGames()
```

### Using React Context

```typescript
import { useProviderContext } from './contexts/ProviderContext'

function MyComponent() {
  const { selectBestAIProvider, selectBestDataProvider } = useProviderContext()

  const handleGenerateParlay = async () => {
    const aiProvider = await selectBestAIProvider('performance')
    const dataProvider = await selectBestDataProvider('reliability')

    // Use providers...
  }

  return <button onClick={handleGenerateParlay}>Generate Parlay</button>
}
```

## ⚙️ Configuration

### Environment-Specific Configurations

The system automatically loads environment-specific configurations:

```typescript
// Development
{
  ai: {
    primary: 'mock',
    fallback: ['openai'],
    providers: {
      mock: { enabled: true, priority: 1, config: { debugMode: true } },
      openai: { enabled: true, priority: 2, config: { model: 'gpt-4o-mini' } }
    }
  },
  data: {
    primary: 'mock',
    fallback: ['espn'],
    providers: {
      mock: { enabled: true, priority: 1, config: { debugMode: true } },
      espn: { enabled: true, priority: 2, config: { timeout: 30000 } }
    }
  }
}
```

### Custom Configuration

```typescript
const providerManager = new ProviderManager({
  defaultAIProvider: 'openai',
  defaultDataProvider: 'espn',
  factory: {
    enableFallback: true,
    healthCheckInterval: 300000, // 5 minutes
  },
  registry: {
    enableHealthMonitoring: true,
    autoFailover: true,
  },
})
```

## 🎯 Provider Selection

### Selection Criteria

The system supports multiple selection criteria:

```typescript
// Preset criteria
const aiProvider = await providerManager.selectAIProvider('performance')
const dataProvider = await providerManager.selectDataProvider('reliability')

// Custom criteria
const customProvider = await providerManager.selectAIProvider({
  priority: 'performance',
  maxCost: 0.01,
  minSuccessRate: 0.95,
  maxResponseTime: 5000,
  capabilities: ['chat_completion', 'json_mode'],
  preferredModels: ['gpt-4o', 'gpt-4o-mini'],
  exclude: ['mock'],
  require: ['openai'],
})
```

### Available Presets

- **performance** - Optimize for speed and response time
- **reliability** - Optimize for uptime and success rate
- **cost** - Optimize for cost efficiency
- **balanced** - Balance all factors

## 🏥 Health Monitoring

### Automatic Health Checks

The system automatically monitors provider health:

```typescript
// Get health status for a specific provider
const health = providerManager.getProviderHealth('openai')
console.log(health.healthy, health.responseTime, health.lastChecked)

// Get all provider health statuses
const allHealth = providerManager.getAllProviderHealth()
for (const [name, health] of allHealth) {
  console.log(`${name}: ${health.healthy ? 'Healthy' : 'Unhealthy'}`)
}
```

### Manual Health Refresh

```typescript
// Refresh health status
await providerManager.refreshProviderHealth()
```

## 🔧 Provider Management

### Registering New Providers

```typescript
// Register a new AI provider
const aiProvider = await providerManager.registerAIProvider(
  'custom-ai',
  'openai',
  { model: 'gpt-4', temperature: 0.7 },
  1 // priority
)

// Register a new data provider
const dataProvider = await providerManager.registerDataProvider(
  'custom-data',
  'espn',
  { timeout: 30000, retries: 3 },
  1 // priority
)
```

### Provider Configuration

```typescript
// Update provider configuration
providerManager.updateProviderConfig('openai', {
  temperature: 0.8,
  maxTokens: 8000,
})

// Enable/disable providers
providerManager.setProviderEnabled('mock', false)
```

## 📊 Provider Statistics

```typescript
// Get provider usage statistics
const stats = providerManager.getProviderStats('openai')
console.log({
  usageCount: stats.usageCount,
  lastUsed: stats.lastUsed,
  averageResponseTime: stats.averageResponseTime,
  successRate: stats.successRate,
})
```

## 🧪 Testing

### Running Tests

```bash
npm test src/services/providers/__tests__/ProviderSystem.test.ts
```

### Test Coverage

The test suite covers:

- Provider registration and loading
- Provider selection with different criteria
- Health monitoring
- Configuration management
- Error handling
- Provider lifecycle

## 🔌 Adding New Providers

### 1. Create Provider Implementation

```typescript
// src/services/providers/ai/NewAIProvider.ts
export class NewAIProvider implements IAIProvider {
  public readonly metadata: AIProviderMetadata
  public readonly config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    // Initialize provider
  }

  async generateParlay(
    game: NFLGame,
    rosters: GameRosters,
    context: AIGenerationContext
  ): Promise<AIProviderResponse> {
    // Implement parlay generation
  }

  // Implement other required methods...
}
```

### 2. Register Provider Type

```typescript
// src/types/providers/ai.ts
export type AIProviderType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'mock'
  | 'new-provider'
```

### 3. Add Factory Creator

```typescript
// src/services/providers/ProviderManager.ts
this.factory.registerAICreator('new-provider', async (config: any) => {
  const NewAIProviderModule = await import('./ai/NewAIProvider')
  const NewAIProvider = NewAIProviderModule.default
  return new NewAIProvider(config.config)
})
```

### 4. Add Configuration

```typescript
// src/config/providers.ts
export const PROVIDER_CONFIGS = {
  development: {
    ai: {
      providers: {
        'new-provider': {
          enabled: true,
          priority: 3,
          config: {
            name: 'new-provider-dev',
            // provider-specific config
          },
        },
      },
    },
  },
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Provider not found**
   - Check if provider is registered in factory
   - Verify provider type is correct
   - Ensure provider is enabled in configuration

2. **Health check failures**
   - Check provider connection settings
   - Verify API keys are correct
   - Check network connectivity

3. **Selection criteria not working**
   - Verify criteria syntax
   - Check if providers meet criteria requirements
   - Ensure fallback is enabled if needed

### Debug Mode

Enable debug mode for detailed logging:

```typescript
const providerManager = new ProviderManager({
  factory: {
    debugMode: true,
  },
})
```

## 📈 Performance Considerations

- Health checks run every 5 minutes by default
- Provider selection is cached for performance
- Lazy loading of providers reduces startup time
- Automatic failover prevents service disruption

## 🔒 Security

- API keys are loaded from environment variables
- Provider configurations are validated
- Error messages don't expose sensitive information
- Health monitoring doesn't log sensitive data

## 📚 API Reference

### ProviderManager

- `initialize()` - Initialize the provider system
- `getAIProvider(name?, criteria?)` - Get AI provider
- `getDataProvider(name?, criteria?)` - Get data provider
- `selectAIProvider(criteria)` - Select AI provider with criteria
- `selectDataProvider(criteria)` - Select data provider with criteria
- `getProviderHealth(name)` - Get provider health
- `getAllProviderHealth()` - Get all provider health
- `dispose()` - Cleanup resources

### ProviderSelectionCriteria

- `type` - Provider type ('ai' | 'data')
- `priority` - Selection priority ('performance' | 'reliability' | 'cost' | 'balanced')
- `maxCost` - Maximum cost per request
- `minSuccessRate` - Minimum success rate
- `maxResponseTime` - Maximum response time
- `preferredModels` - Preferred AI models
- `capabilities` - Required capabilities
- `exclude` - Providers to exclude
- `require` - Required providers
- `fallback` - Enable fallback to unhealthy providers
