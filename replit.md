# Overview

This is a blockchain-based electronic voting (e-voting) system that combines traditional web application architecture with Ethereum smart contracts. The system allows users to register, authenticate, vote for candidates, and view voting statistics in real-time. The platform ensures vote integrity through blockchain technology while providing a user-friendly web interface.

The application consists of three main components:
- **Frontend**: React-based single-page application with Vite
- **Backend**: FastAPI REST API with SQLite database
- **Smart Contract**: Ethereum-based voting smart contract using Hardhat

# User Preferences

Preferred communication style: Simple, everyday language.
Database preference: Use SQLite (not PostgreSQL)

# System Architecture

## Frontend Architecture

**Technology Stack**: React 19.1.1 with Vite 7.1.2 build tool

**Design Pattern**: Component-based architecture with client-side routing using React Router DOM v7.8.2

**Key Features**:
- Single-page application (SPA) with route-based navigation
- Real-time chart visualization using Chart.js and react-chartjs-2
- Ethereum wallet integration via ethers.js v6.15.0
- Toast notifications for user feedback (react-toastify)
- Neon/futuristic UI theme with CSS modules

**Rationale**: Vite was chosen over Create React App for faster development builds and hot module replacement. React Router provides seamless navigation without page reloads. The ethers.js library enables direct interaction with Ethereum smart contracts from the browser.

**Development Server**: Configured to run on host 0.0.0.0:5000 for container/cloud compatibility

## Backend Architecture

**Framework**: FastAPI (Python async web framework)

**Authentication**: JWT-based authentication with HTTP Bearer tokens
- Access tokens expire after 30 minutes
- Password hashing using bcrypt (limited to 72 bytes per bcrypt specification)
- Email verification via OTP codes sent through SMTP

**Design Patterns**:
- Repository pattern with SQLAlchemy ORM
- Dependency injection for database sessions
- Modular routing with dedicated auth routes

**Key Features**:
- User registration with email verification
- OTP-based email verification system
- Protected endpoints using JWT tokens
- One vote per user constraint enforced at database level
- Timezone handling (WIB to UTC conversion)

**Rationale**: FastAPI was selected for its native async support, automatic API documentation, and type safety via Pydantic. JWT tokens provide stateless authentication suitable for distributed systems. Email verification adds security to prevent fake registrations.

## Database Architecture

**Primary Database**: SQLite (local development and Replit environment)

**Replit Setup**: The workflow explicitly unsets DATABASE_URL to force SQLite usage instead of Replit's auto-injected PostgreSQL

**Schema Design**:
- **Users Table**: Stores user credentials, email, verification status, and OTP codes
- **Candidates Table**: Stores candidate information including name, image URL, and vision/mission text
- **Votes Table**: Records votes with unique constraint on user_id (one vote per user)
- **VotingPeriods Table**: Manages voting time windows with timezone-aware datetime fields

**Key Constraints**:
- Unique constraint on user_id in votes table prevents duplicate voting
- Email and username uniqueness enforced at database level

**Rationale**: SQLite is preferred for this project as it provides ACID compliance, requires no external database service, and stores data locally in evoting.db file. The unique vote constraint is the core mechanism preventing voter fraud at the database level.

## Smart Contract Architecture

**Blockchain Platform**: Ethereum (local Hardhat network for development)

**Development Framework**: Hardhat v2.26.3

**Contract Structure**:
- Voting.sol smart contract (not included in files but referenced in deployment scripts)
- Candidate management functions (addCandidate)
- Vote recording with on-chain verification
- Vote counting and candidate retrieval functions

**Test Accounts**: Pre-configured with 10 Hardhat test accounts, each loaded with 10,000 ETH for testing

**Rationale**: Hardhat provides a complete development environment with built-in Ethereum network, testing framework, and deployment tools. Smart contracts ensure vote immutability and transparency once recorded on-chain. Local network allows testing without gas costs.

**Integration**: Frontend connects to deployed contract via ethers.js using contract ABI and address

## Hybrid Architecture Decision

**Why Both Database and Blockchain?**
- **Database**: Fast queries for user authentication, candidate info, and real-time statistics
- **Blockchain**: Immutable vote recording and transparent verification
- **Sync Strategy**: Votes likely recorded in both systems (database for quick access, blockchain for immutability)

This hybrid approach balances performance (database) with transparency and security (blockchain).

# External Dependencies

## Email Services
- **SMTP Server**: Configured via environment variables (MAIL_SERVER, MAIL_PORT)
- **Library**: fastapi-mail v1.4.1 with aiosmtplib for async email sending
- **Purpose**: Sending OTP verification codes to user emails during registration

## Blockchain Network
- **Development**: Local Hardhat node (http://127.0.0.1:8545)
- **Accounts**: Pre-funded test accounts for development and testing
- **Libraries**: 
  - ethers.js v6.15.0 (frontend web3 interactions)
  - web3.js v4.16.0 (smart contract backend utilities)

## Database Services
- **Development**: SQLite via backend/.env file (DATABASE_URL=sqlite:///./evoting.db)
- **Replit Deployment**: Workflow unsets DATABASE_URL to use SQLite instead of auto-injected PostgreSQL
- **ORM**: SQLAlchemy (supports both SQLite and PostgreSQL)

## Frontend Deployment
- **Platform**: Vercel (configured via vercel.json)
- **Build Output**: Static files in dist/ directory
- **Routing**: SPA fallback routing (all routes serve index.html)

## Authentication
- **JWT Library**: python-jose with cryptography backend
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Secret Key**: Configured via JWT_SECRET environment variable

## Development Tools
- **Frontend Linting**: ESLint v9 with React hooks and refresh plugins
- **Smart Contract Testing**: Chai v4.5.0 with Hardhat toolbox
- **Type Safety**: TypeChain for Ethereum contract type generation

## Environment Variables Required
- DATABASE_URL (PostgreSQL connection string)
- JWT_SECRET (signing key for tokens)
- MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM (email configuration)
- MAIL_PORT, MAIL_SERVER (SMTP settings)
- MAIL_TLS, MAIL_SSL (email security flags)