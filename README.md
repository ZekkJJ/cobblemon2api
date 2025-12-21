# 🎮 Cobblemon Los Pitufos - Backend API

Express.js REST API for managing a Cobblemon Minecraft server with gacha system, shop, tournaments, and player management.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# nano .env
```

### Configuration

Create a `.env` file with:

```env
NODE_ENV=development
PORT=4000

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/database

# JWT
JWT_SECRET=your-super-secret-key-change-this

# Discord OAuth
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_REDIRECT_URI=http://localhost:4000/api/auth/discord/callback

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Groq AI (optional)
GROQ_API_KEY=your-groq-api-key

# Admin IPs (optional, comma-separated)
ADMIN_IPS=127.0.0.1
```

### Run Development Server

```bash
npm run dev
```

Server runs on http://localhost:4000

### Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── modules/              # Feature modules
│   │   ├── auth/            # Authentication & authorization
│   │   ├── players/         # Player management
│   │   ├── gacha/           # Gacha system
│   │   ├── shop/            # Shop system
│   │   ├── tournaments/     # Tournament management
│   │   ├── verification/    # Player verification
│   │   ├── level-caps/      # Level cap system
│   │   └── admin/           # Admin operations
│   ├── shared/              # Shared utilities
│   │   ├── middleware/      # Express middleware
│   │   ├── utils/           # Helper functions
│   │   ├── types/           # TypeScript types
│   │   └── data/            # Static data
│   ├── config/              # Configuration
│   ├── app.ts               # Express app setup
│   └── server.ts            # Server entry point
├── tests/                   # Tests
│   ├── unit/               # Unit tests
│   └── property/           # Property-based tests
├── Dockerfile              # Docker configuration
├── package.json
└── tsconfig.json
```

## 🔌 API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication
- `GET /api/auth/discord` - Discord OAuth login
- `GET /api/auth/discord/callback` - OAuth callback
- `GET /api/auth/session` - Get current session
- `POST /api/auth/logout` - Logout

### Players
- `GET /api/players` - Get all players
- `GET /api/players/:uuid` - Get player by UUID
- `POST /api/players/sync` - Sync player data

### Gacha
- `GET /api/gacha/roll?discordId=:id` - Get gacha status
- `POST /api/gacha/roll` - Roll gacha
- `POST /api/gacha/soul-driven` - AI-powered gacha roll

### Shop
- `GET /api/shop/stock` - Get shop stock
- `GET /api/shop/balance?uuid=:uuid` - Get player balance
- `POST /api/shop/purchase` - Purchase item
- `GET /api/shop/purchases?uuid=:uuid` - Get purchase history
- `POST /api/shop/claim` - Claim purchased item

### Tournaments
- `GET /api/tournaments` - Get all tournaments
- `GET /api/tournaments/:id` - Get tournament by ID
- `POST /api/tournaments` - Create tournament (admin)
- `PATCH /api/tournaments/:id` - Update tournament (admin)

### Verification
- `POST /api/verification/generate` - Generate verification code
- `POST /api/verification/verify` - Verify code
- `GET /api/verification/status?discordId=:id` - Check status

### Level Caps
- `GET /api/level-caps/effective?uuid=:uuid` - Get effective level cap
- `GET /api/level-caps/version` - Get level cap version
- `GET /api/admin/level-caps/config` - Get config (admin)
- `PUT /api/admin/level-caps/config` - Update config (admin)
- `GET /api/admin/level-caps/history` - Get history (admin)

### Starters
- `GET /api/starters` - Get all starters data

### Admin
- `POST /api/admin/ban` - Ban player
- `POST /api/admin/reset-db` - Reset database

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Type checking
npm run typecheck

# Linting
npm run lint
```

**Test Coverage:**
- ✅ 97 tests passing
- ✅ Unit tests for all modules
- ✅ Property-based tests for critical logic
- ✅ Integration tests for API endpoints

## 🐳 Docker

### Build Image
```bash
docker build -t cobblemon-api .
```

### Run Container
```bash
docker run -p 4000:4000 --env-file .env cobblemon-api
```

### Docker Compose
```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "4000:4000"
    environment:
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      - FRONTEND_URL=${FRONTEND_URL}
    restart: unless-stopped
```

## ☁️ Deployment

### Render.com (Recommended - Free Tier)

1. Connect your GitHub repository
2. Select this backend directory
3. Render auto-detects `render.yaml`
4. Add environment variables in dashboard
5. Deploy!

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Railway.app

```bash
railway init
railway up
```

### Fly.io

```bash
fly launch
fly deploy
```

## 🔒 Security Features

- ✅ JWT authentication
- ✅ Discord OAuth integration
- ✅ Rate limiting (100 requests/15min per IP)
- ✅ CORS protection
- ✅ Helmet security headers
- ✅ Input validation with Zod
- ✅ IP whitelisting for admin endpoints
- ✅ MongoDB injection prevention
- ✅ XSS protection

## 🛠️ Tech Stack

- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB
- **Auth**: JWT + Discord OAuth
- **Validation**: Zod
- **Testing**: Vitest + fast-check (property-based testing)
- **AI**: Groq SDK (for soul-driven gacha)

## 📊 Architecture

```
┌─────────────────────────────────────┐
│         Express Application         │
├─────────────────────────────────────┤
│  Middleware Layer                   │
│  - CORS                             │
│  - Helmet (Security)                │
│  - Rate Limiting                    │
│  - Error Handler                    │
│  - IP Whitelist (Admin)             │
├─────────────────────────────────────┤
│  Module Layer                       │
│  - Auth (JWT + Discord OAuth)       │
│  - Players (CRUD + Sync)            │
│  - Gacha (Roll + Soul-Driven)       │
│  - Shop (Stock + Purchase)          │
│  - Tournaments (CRUD)               │
│  - Verification (Code Gen + Verify) │
│  - Level Caps (Dynamic Rules)       │
│  - Admin (Ban + Reset)              │
├─────────────────────────────────────┤
│  Service Layer                      │
│  - Business Logic                   │
│  - Data Validation                  │
│  - External API Calls               │
├─────────────────────────────────────┤
│  Data Layer                         │
│  - MongoDB Driver                   │
│  - Schema Validation                │
│  - Query Builders                   │
└─────────────────────────────────────┘
```

## 🔧 Development

### Code Style
- TypeScript strict mode
- ESLint for linting
- Prettier for formatting (if configured)

### Adding a New Module

1. Create module directory in `src/modules/`
2. Add routes, controller, service files
3. Define types in `src/shared/types/`
4. Register routes in `src/app.ts`
5. Write tests in `tests/unit/modules/`
6. Add property tests if needed

### Environment Variables

All environment variables are loaded from `.env` file using `dotenv`.

Required variables are validated on startup in `src/config/env.ts`.

## 🆘 Troubleshooting

### MongoDB Connection Failed
- Check `MONGODB_URI` is correct
- Verify MongoDB Atlas IP whitelist
- Ensure database user has correct permissions

### CORS Errors
- Set `FRONTEND_URL` to your frontend URL
- Check CORS configuration in `src/app.ts`

### Auth Not Working
- Verify `JWT_SECRET` is set
- Check Discord OAuth credentials
- Ensure `DISCORD_REDIRECT_URI` matches Discord app settings

### Tests Failing
- Run `npm install` to ensure dependencies are up to date
- Check MongoDB connection for integration tests
- Run `npm run typecheck` to check for TypeScript errors

## 📝 Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Lint code with ESLint
- `npm run typecheck` - Check TypeScript types

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details

## 🔗 Links

- **Frontend Repository**: [Link to frontend repo]
- **Documentation**: See DEPLOYMENT.md
- **Discord**: [Your Discord server]

---

Made with ❤️ by Los Pitufos Team
