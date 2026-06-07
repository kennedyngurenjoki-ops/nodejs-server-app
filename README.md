# Node.js Server Application

A comprehensive Node.js server application with authentication, rate limiting, and robust architecture.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **Rate Limiting**: Redis-backed rate limiting with adaptive controls
- **Security**: Helmet.js, CORS, input validation, and secure headers
- **Database**: MongoDB with Mongoose ODM
- **API Documentation**: Swagger/OpenAPI 3.0 documentation
- **Logging**: Winston-based logging with file rotation
- **Error Handling**: Comprehensive error handling and validation
- **Docker**: Production-ready Docker configuration
- **Testing Ready**: Structure for unit and integration tests

## 📦 Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
4. Update the `.env` file with your configuration
5. Start the development server:
   ```bash
   npm run dev
   ```

## 🐳 Docker

Build and run with Docker:

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run
```

## 📚 API Documentation

Once running, visit:
- Swagger UI: `http://localhost:3000/api-docs`
- API Spec JSON: `http://localhost:3000/api-docs.json`

## 🔧 Configuration

Key environment variables:

- `NODE_ENV`: Environment (development/production/test)
- `PORT`: Server port (default: 3000)
- `JWT_SECRET`: Secret for JWT tokens
- `DATABASE_URL`: MongoDB connection string
- `REDIS_ENABLED`: Enable Redis for rate limiting

## 🛡️ Security Features

- JWT authentication
- Role-based authorization
- Rate limiting (global, per-user, per-service)
- Input validation and sanitization
- Secure headers with Helmet.js
- CORS configuration
- API key authentication for service-to-service

## 📁 Project Structure

```
src/
├── config/           # Configuration files
├── middleware/       # Custom middleware
├── models/          # Database models
├── routes/          # API routes
├── utils/           # Utility functions
└── server.js        # Main server file
```

## 🚦 Available Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user

### Users
- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update profile
- `GET /api/v1/users` - List users (admin only)

### Admin
- `GET /api/v1/admin/users/:id` - Get user by ID
- `PUT /api/v1/admin/users/:id/role` - Update user role
- `GET /api/v1/admin/stats` - System statistics

### System
- `GET /health` - Health check
- `GET /metrics` - System metrics

## 📝 Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix linting issues

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.
