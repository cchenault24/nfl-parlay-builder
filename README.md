# NFL Parlay Builder

An intelligent NFL betting parlay generator powered by AI agents that analyzes real-time game data, team statistics, weather conditions, and betting odds to create data-driven parlay recommendations.

## 🏈 Overview

The NFL Parlay Builder is a sophisticated web application that combines multiple data sources with advanced AI to generate intelligent 3-leg NFL parlays. The system uses an agentic AI approach where specialized agents gather data from various sources, analyze matchups, and generate betting recommendations based on comprehensive statistical analysis.

## 🤖 AI Architecture

### Agentic AI System

The application employs a multi-agent architecture where different AI agents work together to:

1. **Data Collection Agents**: Gather real-time data from multiple sources
2. **Analysis Agents**: Process and analyze team statistics, weather, and odds
3. **Generation Agents**: Create intelligent parlay recommendations
4. **Validation Agents**: Ensure betting logic consistency and data accuracy

## 🔧 Core Features

### Data Integration

- **Pro Football Reference (PFR)**: Real-time NFL schedule, team statistics, and player data
- **Weather API**: Live weather conditions for game venues
- **Odds API**: Current betting lines and spreads
- **Stadium Data**: Venue information and home field advantages

### Intelligent Analysis

- **Team Performance**: Offensive/defensive rankings and statistics
- **Matchup Analysis**: Head-to-head records and situational factors
- **Weather Impact**: How conditions affect gameplay and betting outcomes
- **Risk Assessment**: Conservative, moderate, and aggressive betting strategies

### User Experience

- **Week Selection**: Browse games by NFL week
- **Game Selection**: Choose specific matchups for analysis
- **Parlay History**: Save and track generated parlays
- **Real-time Loading**: Dynamic progress indicators during AI processing
- **Responsive Design**: Optimized for desktop and mobile devices

## 🏗️ Technical Architecture

### Frontend (React + TypeScript)

- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) for consistent design
- **State Management**: Zustand for lightweight state management
- **Data Fetching**: TanStack Query for efficient API calls
- **Authentication**: Firebase Auth with user profiles

### Backend (Firebase Functions + Node.js)

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js with Firebase Functions
- **AI Integration**: OpenAI GPT-4o-mini for parlay generation
- **Data Sources**: PFR scraping, weather APIs, odds providers
- **Observability**: Comprehensive logging, metrics, and tracing

### Data Flow

1. **User Selection**: Choose game and parlay mode
2. **Data Gathering**: Agents collect team stats, weather, odds
3. **AI Analysis**: Multi-agent system analyzes data
4. **Parlay Generation**: AI creates 3-leg parlay with reasoning
5. **Validation**: System validates betting logic and consistency
6. **Display**: Results shown with detailed analysis and confidence levels

## 🎯 Key Components

### Frontend Components

- **GameSelector**: Week and game selection interface
- **ParlayDisplay**: Shows generated parlays with detailed analysis
- **GameStatsPanel**: Displays team statistics and matchup data
- **ParlayHistory**: User's saved parlay history
- **AuthGate**: Authentication and feature showcase
- **DevStatus**: Development tools and service status

### Backend Services

- **Agent Orchestrator**: Coordinates multi-agent workflows
- **PFR Provider**: Scrapes and processes NFL data
- **Weather Service**: Fetches venue weather conditions
- **Odds Service**: Retrieves current betting lines
- **AI Service**: Handles parlay generation and validation

## 🔐 Security & Compliance

### Legal Compliance

- **Age Verification**: 18+ requirement with verification modal
- **Responsible Gambling**: Educational resources and warnings
- **Terms of Service**: Comprehensive legal documentation
- **Privacy Policy**: Data protection and usage policies

### Data Security

- **Firebase Authentication**: Secure user management
- **Rate Limiting**: Prevents API abuse and ensures fair usage
- **Data Validation**: Strict input validation and sanitization
- **Error Handling**: Graceful failure handling with user feedback

## 🚀 Development Workflow

### Branch Strategy

- **`main`**: Production branch (nfl-parlay-builder.web.app)
- **`dev`**: Development branch (nfl-parlay-builder-dev.web.app)
- **Feature branches**: Individual feature development

### Deployment Pipeline

1. **Feature Development**: Create branch from `dev`
2. **PR Preview**: Automatic deployment for testing
3. **Dev Environment**: Merge to `dev` for staging
4. **Production Staging**: PR from `dev` to `main`
5. **Production**: Merge to `main` for live deployment

### Development Tools

- **Hot Reloading**: Vite for fast development
- **TypeScript**: Full type safety across the stack
- **ESLint + Prettier**: Code quality and formatting
- **Firebase Emulators**: Local development environment

## 📊 Data Sources

### Primary Sources

- **Pro Football Reference**: Team statistics, schedules, player data
- **Weather APIs**: Real-time venue conditions
- **Odds Providers**: Current betting lines and spreads
- **NFL Official Data**: Game schedules and team information

### Data Processing

- **Real-time Scraping**: Live data updates during games
- **Caching**: Intelligent caching for performance
- **Validation**: Data quality checks and error handling
- **Fallbacks**: Graceful degradation when data unavailable

## 🎮 Usage

1. **Authentication**: Sign in with Google or email
2. **Age Verification**: Confirm 18+ status
3. **Select Week**: Choose NFL week to analyze
4. **Pick Game**: Select specific matchup
5. **Choose Mode**: Agentic (comprehensive) or Single-shot (fast)
6. **Generate**: AI creates intelligent 3-leg parlay
7. **Review**: Analyze recommendations with detailed reasoning
8. **Save**: Store parlay in personal history

## 🔮 Future Enhancements

- **Live Game Updates**: Real-time parlay adjustments during games
- **Advanced Analytics**: Machine learning model improvements
- **Social Features**: Share and compare parlays with other users
- **Mobile App**: Native iOS and Android applications
- **Additional Sports**: Expand beyond NFL to other sports

## 📈 Performance

- **Response Times**: Optimized for sub-30 second parlay generation
- **Caching**: Intelligent data caching for improved performance
- **Rate Limiting**: Fair usage policies to ensure system stability
- **Monitoring**: Comprehensive observability and error tracking

---

_Built with ❤️ for NFL fans who want data-driven betting insights_
