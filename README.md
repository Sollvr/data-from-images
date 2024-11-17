# Screenshot Text Extraction Tool

A web-based application that enables image upload, text extraction, and content tagging with advanced pattern recognition capabilities.

## Prerequisites

- Node.js v20+ (Recommended)
- PostgreSQL database
- OpenAI API key
- Git

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd screenshot-text-extractor
```

2. Install dependencies:
```bash
npm install
```

## Environment Setup

1. Create a `.env` file in the project root with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database>
PGHOST=<database-host>
PGPORT=<database-port>
PGUSER=<database-user>
PGPASSWORD=<database-password>
PGDATABASE=<database-name>

# API Keys
OPENAI_API_KEY=<your-openai-api-key>

# Server Configuration
PORT=5000
```

2. Create a `.env` file in the `client` directory:

```env
VITE_API_URL=http://localhost:5000
VITE_ENVIRONMENT=development
```

## Database Setup

The application uses Drizzle ORM for database management. The schema is already defined in `db/schema.ts`.

1. Push the schema to your database:
```bash
npm run db:push
```

## Running the Application

1. Start the development server:
```bash
npm run dev
```

This will start both the frontend and backend servers. The application will be available at `http://localhost:5000`.

## Features

- **Image Upload**: Support for single and batch image uploads
- **Text Extraction**: OCR powered by OpenAI Vision API
- **Pattern Recognition**: Automatic detection of:
  - Dates
  - Monetary amounts
  - Email addresses
  - Phone numbers
  - Physical addresses
  - Reference numbers/identifiers
- **Authentication**: Local username/password authentication
- **Data Export**: Export extracted data in CSV format
- **Custom Tagging**: Organize extractions with custom tags

## API Routes

### Authentication
- `POST /register` - Register a new user
- `POST /login` - User login
- `POST /logout` - User logout
- `GET /api/user` - Get current user information

### Text Extraction
- `POST /api/extract` - Extract text from images
- `GET /api/extractions` - Get user's extractions
- `GET /api/export` - Export extractions to CSV
- `POST /api/extractions/:id/tags` - Add tag to extraction

## Frontend Routes

- `/` - Landing page
- `/auth` - Authentication page (login/register)
- `/app` - Main application dashboard

## Development

### Project Structure

```
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/   # Reusable React components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Utility functions
│   │   ├── pages/       # Page components
│   │   └── styles/      # CSS styles
├── server/              # Backend Express server
│   ├── auth.ts         # Authentication logic
│   ├── openai.ts       # OpenAI integration
│   ├── routes.ts       # API routes
│   └── index.ts        # Server entry point
├── db/                 # Database configuration
│   └── schema.ts       # Drizzle schema definitions
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push database schema changes

## Error Handling

The application includes comprehensive error handling:
- Client-side form validation using Zod
- API error responses with descriptive messages
- Error boundaries for React components
- Database error handling with proper status codes

## Security Features

- Password hashing using scrypt
- Session-based authentication
- CSRF protection
- Rate limiting for API endpoints
- Secure cookie settings in production

## Production Deployment

The application is configured for deployment on Replit:

1. Fork the project on Replit
2. Set up the required environment variables
3. Run `npm install` to install dependencies
4. Use `npm run build` to build the project
5. Start the server with `npm start`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for your own purposes.
