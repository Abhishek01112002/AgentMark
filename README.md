# AgentMark

An Advanced Agentic AI Marketing Platform - Multi-Agent System for Complete Marketing Campaign Generation

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite
- TailwindCSS
- Lucide React Icons
- React Hot Toast
- React Router DOM

### Backend
- Node.js with Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Bcrypt

## Project Structure

```
AgentMark/
├── frontend/                      # React + Vite frontend application
│   ├── public/                    # Static assets
│   ├── src/
│   │   ├── components/
│   │   │   └── pages/
│   │   │       ├── landingPage/   # Landing page component
│   │   │       ├── login/         # Login page
│   │   │       ├── signup/        # Signup page
│   │   │       └── dashboard/     # Dashboard page
│   │   ├── App.tsx                # Main app component with routing
│   │   ├── main.tsx               # Entry point
│   │   └── index.css              # Global styles
│   ├── index.html                 # HTML template
│   ├── vite.config.ts             # Vite configuration
│   ├── tailwind.config.ts         # Tailwind CSS config
│   └── package.json
│
├── backend/                       # Node.js + Express backend API
│   ├── prisma/
│   │   └── schema.prisma          # Database schema
│   ├── src/
│   │   ├── config/                # Configuration files
│   │   ├── db/                    # Database connection
│   │   ├── middlewares/           # Express middlewares
│   │   ├── modules/               # Feature modules
│   │   ├── utils/                 # Utility functions
│   │   └── index.ts               # Server entry point
│   ├── .env                       # Environment variables
│   ├── tsconfig.json              # TypeScript config
│   └── package.json
│
├── DESIGN_SYSTEM.md               # Complete design system documentation
├── PROJECT_FOLDER_FILE_STRUCTURE.md  # Detailed folder structure
├── PROJECT_STYLE.md               # UI design specifications
├── .gitignore                     # Git ignore rules
└── README.md                      # This file
```

## Getting Started

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: http://localhost:5173

### Backend Setup

```bash
cd backend
npm install
npm run db:generate
npm run dev
```

Backend runs on: http://localhost:5001

## Features

- Landing Page with Hero Section
- Authentication (Login/Signup)
- Dashboard with Campaign Overview
- Multi-Agent Campaign System
- Real-time Agent Progress Tracking
- Campaign Results & Analytics

## Design System

Refer to `DESIGN_SYSTEM.md` for complete styling guidelines including:
- Color palette
- Typography
- Components
- Spacing
- Icons
- Animations

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:5001
```

### Backend (.env)
```
PORT=5001
DATABASE_URL="postgresql://user:password@localhost:5432/agentmark"
JWT_SECRET="your-secret-key"
```

## Contributing

Developed by Novateches Software Pvt Ltd

## License

Proprietary
