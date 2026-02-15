# Prompt Manager

A powerful prompt management tool built with React and Vite.

## Features
- Manage prompts in a tree structure.
- Version control for prompts.
- Search and filter capabilities.
- Local storage support for offline/demo use.
- API integration for backend persistence.
- Markdown rendering with GFM support.

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
To start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

By default, local development uses the **API** storage mode (`VITE_STORAGE_TYPE=api`). To use mock data or local storage locally, modify `.env` or set the variable inline:
```bash
VITE_STORAGE_TYPE=local npm run dev
```

## Deployment

### GitHub Pages
This project is configured to deploy to GitHub Pages automatically via GitHub Actions.

1. Push your changes to the `main` branch.
2. The `.github/workflows/deploy.yml` workflow will trigger.
3. It builds the project with `VITE_STORAGE_TYPE=local` (configured in `.env.github`).
4. The output is deployed to the `gh-pages` branch.

To manually deploy:
```bash
npm run deploy
```

## Project Structure
- `src/`: Source code
  - `components/`: React components
  - `services/`: Data services (API, Mock, LocalStorage)
  - `utils/`: Helper functions
  - `App.tsx`: Main application entry
- `vite.config.ts`: Vite configuration
- `.github/workflows/`: CI/CD configurations
