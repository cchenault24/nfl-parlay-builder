# Development Workflow

This document outlines the Git workflow and deployment strategy for the NFL Parlay Builder project.

## Branch Structure

- **`main`**: Production branch - only receives merges from `dev`
- **`dev`**: Development branch - default branch for all feature development
- **Feature branches**: Created from `dev` for individual features

## Deployment Strategy

### 1. Feature Development
- Create feature branches from `dev`
- All PRs target the `dev` branch
- PRs to `dev` deploy to: `nfl-parlay-builder-dev--pr-{number}.web.app`

### 2. Development Environment
- When PRs are merged into `dev`, it deploys to: `nfl-parlay-builder-dev.web.app`
- This serves as the staging environment for testing

### 3. Production Staging
- PRs from `dev` to `main` deploy to: `nfl-parlay-builder--pr-{number}.web.app`
- This serves as the final staging before production

### 4. Production
- When `dev` is merged into `main`, it deploys to: `nfl-parlay-builder.web.app`
- This is the live production environment

## Workflow Steps

### For Feature Development:
1. Create feature branch from `dev`
2. Make changes and commit
3. Push feature branch
4. Create PR targeting `dev`
5. Review and merge PR into `dev`
6. Feature is now available at `nfl-parlay-builder-dev.web.app`

### For Production Release:
1. Create PR from `dev` to `main`
2. Review and test at `nfl-parlay-builder--pr-{number}.web.app`
3. Merge PR into `main`
4. Production deploys to `nfl-parlay-builder.web.app`

## GitHub Actions Workflows

- `deploy-dev-pr.yml`: Handles PR previews for dev branch
- `deploy-dev.yml`: Deploys dev branch to dev environment
- `deploy-main-pr.yml`: Handles PR previews for main branch
- `deploy-production.yml`: Deploys main branch to production

## Branch Protection Rules

- `main` branch is protected and only allows merges from `dev`
- All PRs require review before merging
- CI checks must pass before merging
