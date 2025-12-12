# Calcolo Provvigioni - Commission Calculator

A production-ready single-page React application for commission calculation and contract auditing.

## Features

### 📊 Commission Calculation
- Upload Excel files with supplies/contracts data
- Automatic per-agent commission calculation
- Detailed line-item view with filters and sorting
- Per-agent summary with bonuses and deductions
- Downloadable Excel reports

### 🔍 Contract Cross-Check (Audit)
- Compare signed vs. invoiced contracts
- Identify discrepancies automatically
- Configurable unique key matching (Contract Code, PDR/POD, Customer Code)
- Two-category reporting:
  - Signed but not invoiced (to verify)
  - Invoiced but not signed (potential errors)

### ⚙️ Settings & Customization
- **Dark Mode**: Light, Dark, or System theme preference
- **Language Support**: Italian (default) and English
- Currency selection (EUR, USD, GBP)
- Date format preferences
- Default unique key configuration
- Adjustable max upload size
- Persistent localStorage settings

### 🎨 Modern UI/UX
- Single-page application with hash-based navigation
- Responsive design (mobile-friendly)
- Accessible keyboard navigation
- Drag-and-drop file uploads
- Real-time progress indicators
- Toast notifications
- Sortable and filterable tables

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality component library
- **react-hook-form** + **zod** - Type-safe form validation
- **lucide-react** - Beautiful icons

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Type check
pnpm typecheck
```

### Development Server

The app will be available at `http://localhost:5173`

## Configuration

### Environment Variables

Create a `.env` file (already created) and update the backend API URL:

```env
VITE_API_BASE=http://localhost:8000/api
```

### Mock vs Real Backend

The application currently uses **mock data** for development. To switch to a real backend:

1. Update `.env` with your backend API URL
2. In `src/api.ts`, change `USE_MOCK` from `true` to `false`

```typescript
const USE_MOCK = false; // Toggle to use real backend
```

### Brand Colors

Brand colors are configured in `tailwind.config.js`:

```javascript
colors: {
  brand: {
    DEFAULT: "#0066cc",  // Primary blue
    accent: "#ff6600",   // Accent orange
  },
}
```

## Project Structure

```
calcolo-provvigioni/
├── src/
│   ├── components/
│   │   └── ui/              # shadcn/ui components
│   ├── hooks/
│   │   └── use-toast.ts     # Toast notification hook
│   ├── lib/
│   │   └── utils.ts         # Utility functions
│   ├── api.ts               # API client with mock data
│   ├── types.ts             # TypeScript types & Zod schemas
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles & Tailwind imports
├── public/                  # Static assets
├── index.html               # HTML entry point
├── package.json             # Dependencies & scripts
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── vite.config.ts           # Vite build configuration
└── README.md                # This file
```

## API Contract

### Commission Upload

**POST** `/commissions/upload`

- **Request**: `multipart/form-data` with `file` field
- **Response**:
```typescript
{
  runId: string;
  summary: AgentSummary[];
  items: CommissionItem[];
  reportUrl?: string;
}
```

### Audit Upload

**POST** `/audit/upload`

- **Request**: `multipart/form-data` with `signedFile`, `invoicedFile`, and `uniqueKey` fields
- **Response**:
```typescript
{
  runId: string;
  categories: {
    signedNotInvoiced: AuditRow[];
    invoicedNotSigned: AuditRow[];
  };
  reportUrl?: string;
}
```

## Navigation

The app uses hash-based navigation for deep linking:

- `#dashboard` - KPI cards and recent runs
- `#commissions` - Commission calculation
- `#audit` - Contract cross-check
- `#settings` - Application settings

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

## Usage

### Uploading Commission Files

1. Navigate to the **Commissions** tab
2. Drag and drop or click to upload an Excel file (.xlsx, .xls, .csv)
3. Wait for processing (progress bar shown)
4. View results in **Summary** (per-agent) or **Details** (line items) tabs
5. Download Excel report if available

### Running Contract Audit

1. Navigate to the **Audit** tab
2. Upload two files:
   - Signed Contracts file
   - Invoiced Contracts file
3. Select the unique key field for matching
4. Click "Run Audit"
5. Review discrepancies in two categories:
   - Signed ▸ Not Invoiced
   - Invoiced ▸ Not Signed
6. Download audit report if available

### Configuring Settings

- Click the settings icon (⚙️) in the header, or
- Navigate to the **Settings** tab
- Adjust preferences:
  - Currency (EUR, USD, GBP)
  - Date format (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
  - Default unique key field
  - Max upload size (1-50 MB)
- Click "Save Settings"

## Keyboard Shortcuts

- **Tab** - Navigate between elements
- **Enter** - Activate buttons and select options
- **Escape** - Close sheets/dialogs
- **Arrow keys** - Navigate dropdown menus

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

## Future Enhancements

- [ ] Backend API integration
- [ ] User authentication
- [ ] Historical run tracking
- [ ] Export to CSV
- [ ] Advanced filtering options
- [x] Multi-language support (Italian & English)
- [x] Dark mode theme

## License

Proprietary - All rights reserved

## Support

For issues or questions, please contact the development team.

---

**Version**: 1.0.0
**Last Updated**: October 2025
