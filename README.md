# Calcolo Provvigioni - Commission Management System

A production-ready React application for managing sales agents, commission rules, orders, and calculating commissions with comprehensive analytics.

## Features

### 📊 Dashboard

- **KPI Cards**: Real-time metrics for contracts and commissions
- **Interactive Charts**: 
  - Monthly contracts histogram
  - Monthly commissions trend
  - Product distribution analysis
- **Advanced Filtering**: Filter by year and agent
- **Visual Analytics**: Comprehensive data visualization with Recharts

### 👥 Agent Management (Agenti)

- Create, edit, and delete sales agents
- Configure agent-specific commission rules
- Support for agent hierarchy (parent-child relationships)
- Toggle statistics inclusion per agent
- Dynamic rule assignment with custom values
- Bulk agent operations

### 📋 Rules Management (Regole)

- Define and manage commission rules
- Enable/disable rules dynamically
- Set default values for each rule
- Rules automatically created from liquidation imports
- Track active vs. inactive rules

### 📦 Orders Management (Ordini)

- **Import Orders**: Upload Excel files with order data
- **Import Liquidations**: Upload liquidation files with competency period selection
- **Pending Orders View**: 
  - Track orders without associated liquidations
  - Advanced filtering and search
  - Sortable columns (customer, POD/PDR, product, agent, status, date, payment method)
  - Date range filtering
  - Real-time status badges
  - Automatic refresh after imports

### 💰 Commission Calculation (Provvigioni)

- Upload liquidation data for calculation
- Match liquidations to agents using dynamic rules
- Handle unmatched agents with warnings
- Detailed calculation results
- Export capabilities
- Visual feedback for calculation progress

### 🔐 Authentication

- Secure login system
- Session management with automatic expiry handling
- Protected routes and API endpoints
- Credential-based authentication

### ⚙️ Settings & Customization

- **Dark Mode**: Light, Dark, or System theme preference
- **Language Support**: Italian (default) and English
- **Persistent Settings**: All preferences saved to localStorage
- **Responsive Design**: Mobile-friendly interface
- **Theme Context**: Global theme and language management

### 🎨 Modern UI/UX

- Single-page application with hash-based navigation
- Responsive design optimized for all screen sizes
- Accessible keyboard navigation
- Drag-and-drop file uploads with progress tracking
- Toast notifications for user feedback
- Sortable and filterable tables
- Loading states and skeleton screens
- Empty state illustrations
- Real-time data updates

## Tech Stack

### Frontend
- **React 19** + **TypeScript**
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling with custom theme
- **shadcn/ui** - High-quality Radix UI component library
- **react-hook-form** + **zod** - Type-safe form validation
- **lucide-react** - Beautiful icon library
- **Recharts** - Data visualization and charts
- **xlsx** - Excel file processing
- **jszip** - File compression utilities
- **Agentation** - Development toolbar (dev mode only)

### Backend Integration
- **Flask API** - Python backend (port 5000)
- **Session-based Authentication** - Secure credential management
- **RESTful API** - Standard HTTP endpoints with JSON responses

## Getting Started

### Prerequisites

- **Node.js 18+** and **pnpm**
- **Python 3.8+** (for backend)
- **Flask** backend server running on port 5000

### Installation

```bash
# Install frontend dependencies
pnpm install

# Start development server (frontend only)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Type check
pnpm typecheck

# Lint code
pnpm lint
```

### Development Server

- **Frontend**: `http://localhost:5173` (Vite dev server)
- **Backend**: `http://localhost:5000` (Flask API server)

**Note**: Both frontend and backend servers must be running for full functionality.

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_BASE=http://localhost:5000/api
```

**Default**: If not specified, the app defaults to `http://localhost:5000/api`

### Backend Integration

The application is **fully integrated with a Flask backend**. All data operations (agents, rules, orders, liquidations, calculations, dashboard) communicate with real API endpoints.

**Authentication**: The app uses session-based authentication. Users must log in before accessing any features.

### Brand Colors

The application uses the **Infinita Energia** brand palette, configured in `tailwind.config.js`:

```javascript
colors: {
  "energia-primary": {
    DEFAULT: "#6EC1E4",  // Sky blue
    light: "#8fd0eb",
    dark: "#4aa8d4",
  },
  "energia-accent": {
    DEFAULT: "#61CE70",  // Green
    light: "#7ed98a",
    dark: "#4ab85a",
  },
  "energia-secondary": {
    DEFAULT: "#54595F",  // Dark gray
    light: "#6b7178",
  },
}
```

**Custom Fonts**:
- Display: Roboto Slab (headings)
- Body: Roboto (text)
- Mono: IBM Plex Mono (code/numbers)

## Project Structure

```
calcolo-provvigioni/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui base components
│   │   ├── layout/         # AppHeader, AppFooter
│   │   ├── AgentDialog.tsx
│   │   ├── AgentsTable.tsx
│   │   ├── RegoleTable.tsx
│   │   ├── CalcoloResults.tsx
│   │   ├── FileDropzone.tsx
│   │   ├── EmptyState.tsx
│   │   ├── KPICard.tsx
│   │   ├── DashboardKPISection.tsx
│   │   ├── ContractsHistogram.tsx
│   │   ├── CommissionsChart.tsx
│   │   ├── ProductsChart.tsx
│   │   ├── YearFilter.tsx
│   │   ├── AgentFilter.tsx
│   │   ├── SettingsPanel.tsx
│   │   ├── LiquidazioniUploadDialog.tsx
│   │   └── LoginDialog.tsx
│   ├── pages/              # Page components
│   │   ├── DashboardTab.tsx
│   │   ├── AgentsTab.tsx
│   │   ├── RegoleTab.tsx
│   │   ├── OrdiniTab.tsx
│   │   └── CalcoloTab.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useAgents.ts
│   │   ├── useRegole.ts
│   │   ├── useOrders.ts
│   │   ├── useLiquidazioni.ts
│   │   ├── useCalcolo.ts
│   │   ├── usePendingOrders.ts
│   │   ├── useDashboard.ts
│   │   ├── useAppSettings.ts
│   │   ├── useTranslation.ts
│   │   ├── useThemeLanguage.ts
│   │   └── use-toast.ts
│   ├── contexts/           # React contexts
│   │   ├── AuthContext.tsx
│   │   └── ThemeLanguageContext.tsx
│   ├── types/              # TypeScript type definitions
│   │   ├── domain.ts       # Domain models (Agente, Regola, Liquidazione)
│   │   ├── api.ts          # API request/response types
│   │   ├── components.ts   # Component prop types
│   │   └── index.ts        # Type exports
│   ├── lib/                # Utility libraries
│   │   ├── utils.ts        # General utilities
│   │   └── exportUtils.ts  # Excel export utilities
│   ├── api.ts              # API client (Flask integration)
│   ├── translations.ts     # i18n translations (IT/EN)
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # Application entry point
│   └── index.css           # Global styles & Tailwind imports
├── public/                 # Static assets
├── index.html              # HTML entry point
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript configuration
├── tailwind.config.js      # Tailwind CSS configuration (custom theme)
├── vite.config.ts          # Vite build configuration
└── README.md               # This file
```

## API Endpoints

### Authentication

- **POST** `/api/login` - User login
- **POST** `/api/logout` - User logout
- **GET** `/api/db-status` - Check authentication status

### Agents (Agenti)

- **GET** `/api/agenti` - List all agents
- **POST** `/api/agenti` - Create new agent
- **PUT** `/api/agenti/{id}` - Update agent
- **DELETE** `/api/agenti/{id}` - Delete agent
- **PATCH** `/api/agenti/{id}/statistiche` - Toggle agent statistics

### Rules (Regole)

- **GET** `/api/regole` - List all rules
- **PATCH** `/api/regole/{id}` - Update rule (enable/disable, default value)

### Orders (Ordini)

- **POST** `/api/ordini/import-excel` - Import orders from Excel
- **GET** `/api/ordini/non-evasi` - Get pending orders (with optional date filters)

### Liquidations (Liquidazioni)

- **POST** `/api/liquidazioni/import-excel` - Import liquidations with competency period

### Calculations (Provvigioni)

- **POST** `/api/provvigioni/calcola` - Calculate commissions based on liquidations and agent rules

### Dashboard

- **GET** `/api/dashboard/contratti-totali` - Total contracts KPI
- **GET** `/api/dashboard/provvigioni-totali` - Total commissions KPI
- **GET** `/api/dashboard/contratti-mensili` - Monthly contracts data
- **GET** `/api/dashboard/provvigioni-mensili` - Monthly commissions data
- **GET** `/api/dashboard/contratti-per-prodotto` - Contracts by product

All dashboard endpoints support optional `year` and `agent` query parameters for filtering.

## Navigation

The app uses hash-based navigation for deep linking:

- `#dashboard` - Dashboard with KPIs and analytics
- `#agenti` - Agent management
- `#regole` - Rules configuration
- `#ordini` - Orders and liquidations import
- `#provvigioni` - Commission calculation

Settings are accessible via the header settings icon.

## Changing Language and Theme

### Language Switcher

Click the language icon (🌐) in the header to toggle between:

- **Italiano** (default)
- **English**

The language preference is saved to localStorage.

### Theme Switcher

Click the theme icon (☀️/🌙) in the header to choose:

- **Light** - Bright theme
- **Dark** - Dark theme
- **System** - Follows your OS preference

The theme preference is saved to localStorage.

## Usage Guide

### 1. Login

- Enter your credentials on the login screen
- Session is maintained until logout or expiry

### 2. Dashboard

- View real-time KPIs for contracts and commissions
- Filter data by year and/or agent
- Analyze trends with interactive charts:
  - Monthly contracts histogram
  - Monthly commissions line chart
  - Product distribution pie chart

### 3. Managing Agents (Agenti)

1. Navigate to **Agenti** tab
2. Click **Add Agent** to create a new agent
3. Fill in agent details:
   - Name (Nome e Cognome)
   - Parent agent (optional, for hierarchy)
   - Statistics inclusion toggle
   - Assign commission rules with custom values
4. Edit or delete existing agents using table actions
5. Toggle statistics inclusion directly from the table

### 4. Managing Rules (Regole)

1. Navigate to **Regole** tab
2. View all available commission rules
3. Enable/disable rules using the toggle
4. Update default values for each rule
5. Rules are automatically created when importing liquidations

### 5. Importing Orders (Ordini)

1. Navigate to **Ordini** tab
2. **Import Orders**:
   - Drag and drop Excel file (.xlsx, .xls)
   - Wait for import progress
   - View success message with count
3. **Import Liquidations**:
   - Select competency period (month/year)
   - Upload liquidation Excel file
   - System automatically creates new rules if needed
4. **View Pending Orders**:
   - See orders without liquidations
   - Filter by date range
   - Search and sort by any column
   - Monitor order status with color-coded badges

### 6. Calculating Commissions (Provvigioni)

1. Navigate to **Provvigioni** tab
2. Upload liquidation data (if not already imported via Ordini)
3. Review any unmatched agents warnings
4. Click **Calculate** to process commissions
5. View detailed results
6. Export results if needed

### 7. Settings

- Click the settings icon (⚙️) in the header
- Toggle between Light/Dark/System theme
- Switch language between Italian and English
- Settings are automatically saved to localStorage

## Custom Components

The application includes several custom-built components:

### Data Display
- `AgentsTable` - Sortable table with inline editing and actions
- `RegoleTable` - Rules management with toggle and value editing
- `CalcoloResults` - Commission calculation results display
- `KPICard` - Dashboard metric cards with trend indicators
- `DashboardKPISection` - Grouped KPI display

### Charts & Visualizations
- `ContractsHistogram` - Monthly contracts bar chart
- `CommissionsChart` - Monthly commissions line chart
- `ProductsChart` - Product distribution pie chart

### Forms & Input
- `FileDropzone` - Drag-and-drop file upload with validation
- `AgentDialog` - Agent creation/editing form with dynamic rules
- `LiquidazioniUploadDialog` - Liquidation upload with period selection
- `LoginDialog` - Authentication form

### Filters & Controls
- `YearFilter` - Year selection dropdown
- `AgentFilter` - Agent selection dropdown
- `SettingsPanel` - Application settings sheet

### Layout & UI
- `AppHeader` - Navigation and settings
- `AppFooter` - Status and last action display
- `EmptyState` - Empty data placeholder with icon

## Keyboard Shortcuts

- **Tab** - Navigate between elements
- **Enter** - Activate buttons and select options
- **Escape** - Close sheets/dialogs
- **Arrow keys** - Navigate dropdown menus
- **Ctrl/Cmd + Click** - Open links in new tab (where applicable)

## Browser Support

- Chrome/Edge (latest 2 versions) ✅
- Firefox (latest 2 versions) ✅
- Safari (latest 2 versions) ✅
- Mobile browsers (iOS Safari, Chrome Mobile) ✅

## Troubleshooting

### Backend Connection Issues

**Problem**: "Failed to fetch" or API errors

**Solutions**:
1. Ensure Flask backend is running on port 5000
2. Check `.env` file has correct `VITE_API_BASE` URL
3. Verify backend allows CORS from frontend origin
4. Check browser console for specific error messages

### Authentication Issues

**Problem**: Stuck on login screen or automatic logout

**Solutions**:
1. Clear browser localStorage: `localStorage.clear()`
2. Check backend session configuration
3. Verify credentials are correct
4. Check browser cookies are enabled

### File Upload Issues

**Problem**: Upload fails or shows no progress

**Solutions**:
1. Verify file format is `.xlsx` or `.xls`
2. Check file size is under 50MB
3. Ensure backend endpoint is accessible
4. Check browser console for errors

### Chart Display Issues

**Problem**: Charts not rendering or showing incorrect data

**Solutions**:
1. Refresh the page
2. Clear browser cache
3. Check if data is available (try different filters)
4. Verify Recharts is properly loaded (check console)

### Theme/Language Not Persisting

**Problem**: Settings reset on page reload

**Solutions**:
1. Check browser localStorage is enabled
2. Clear localStorage and set preferences again
3. Check for browser extensions blocking storage

## Key Features Implemented

- [x] Full backend API integration with Flask
- [x] Session-based user authentication
- [x] Agent management with hierarchy support
- [x] Dynamic commission rules system
- [x] Orders and liquidations import
- [x] Pending orders tracking
- [x] Commission calculation engine
- [x] Comprehensive dashboard with analytics
- [x] Multi-language support (Italian & English)
- [x] Dark mode theme
- [x] Real-time data visualization with charts
- [x] Advanced filtering and sorting
- [x] Date range filtering for orders
- [x] Excel file processing and export
- [x] Responsive mobile-friendly design
- [x] Toast notifications
- [x] Loading states and progress indicators

## Future Enhancements

- [ ] Export calculations to Excel/CSV
- [ ] Bulk agent import from CSV
- [ ] Advanced analytics and reporting
- [ ] Commission calculation history
- [ ] User role management
- [ ] Audit trail for data changes
- [ ] Email notifications
- [ ] PDF report generation
- [ ] Multi-currency support
- [ ] Custom date range for dashboard

## License

Proprietary - All rights reserved

## Support

For issues or questions, please contact the development team.

## Architecture Notes

### State Management

- **React Context**: Used for authentication and theme/language management
- **Custom Hooks**: Encapsulate business logic and API calls
- **Local State**: Component-level state with useState/useEffect
- **localStorage**: Persists user preferences and auth state

### Styling Approach

- **Tailwind CSS**: Utility-first styling with custom configuration
- **CSS Variables**: Dynamic theming for light/dark modes
- **Custom Classes**: Brand-specific styles (`.ledger-card`, `.btn-primary`, `.btn-ghost`, etc.)
- **Responsive Design**: Mobile-first approach with breakpoints (sm, md, lg)
- **shadcn/ui**: Pre-built accessible components with Radix UI primitives

### Data Flow

1. User interacts with UI components
2. Components call custom hooks
3. Hooks make API calls via `api.ts`
4. API responses update hook state
5. Components re-render with new data
6. Toast notifications provide feedback

### Error Handling

- API errors caught and displayed via toast notifications
- 401 responses trigger automatic logout via `setUnauthorizedCallback`
- Loading states prevent duplicate requests
- Form validation with Zod schemas and react-hook-form
- Try-catch blocks in async operations

### Type Safety

- **TypeScript**: Strict mode enabled
- **Zod Schemas**: Runtime validation for API responses
- **Type Definitions**: Organized in `src/types/` directory
- **API Types**: Separate types for requests and responses

## Development Notes

### Adding a New Feature

1. **Create types** in `src/types/domain.ts` or `src/types/api.ts`
2. **Add API endpoint** in `src/api.ts`
3. **Create custom hook** in `src/hooks/` for business logic
4. **Build components** in `src/components/`
5. **Create page component** in `src/pages/`
6. **Add navigation** in `App.tsx` and `AppHeader.tsx`
7. **Add translations** in `src/translations.ts`

### Code Style Guidelines

- Use functional components with hooks
- Prefer named exports over default exports (except for pages)
- Keep components focused and single-purpose
- Extract complex logic into custom hooks
- Use TypeScript for all files
- Follow existing naming conventions:
  - Components: PascalCase
  - Hooks: camelCase with `use` prefix
  - Files: PascalCase for components, camelCase for utilities

### Testing Locally

```bash
# Terminal 1: Start backend (Flask)
cd backend  # or wherever your Flask app is
python app.py

# Terminal 2: Start frontend (Vite)
pnpm dev
```

### Building for Production

```bash
# Type check
pnpm typecheck

# Lint
pnpm lint

# Build
pnpm build

# Preview build
pnpm preview
```

The build output will be in the `dist/` directory.

---

**Version**: 1.0.0
**Last Updated**: February 2026
**Branch**: feat/dynamic-rules
