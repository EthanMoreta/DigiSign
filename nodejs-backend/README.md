# DigiSign Node.js Backend

A simple Node.js/Express backend API for DigiSign with stub endpoints for signature and OTP verification.

## Features

- ✅ Health check endpoint
- ✅ Signature verification endpoint (`/verify-signature`) - stub implementation
- ✅ OTP verification endpoint (`/verify-otp`) - stub implementation
- ✅ Signature enrollment endpoint (`/enroll-signature`) - saves baseline signature
- ✅ CORS enabled for React frontend
- ✅ Stub endpoints return success by default

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

3. **Server will run on:** `http://localhost:3001`

## API Endpoints

#### Health Check
- **GET** `/health`
- Returns server status and basic info

#### Verify Signature (Stub)
- **POST** `/verify-signature`
- Always returns `{"success": true, "message": "Signature verification endpoint is working"}`

#### Verify OTP (Stub)
- **POST** `/verify-otp`
- Always returns `{"success": true, "message": "OTP verification endpoint is working"}`

#### Enroll Signature
- **POST** `/enroll-signature`
- **Body:** `{"image": "base64_encoded_image_data"}`
- Saves image as `baseline_signature.png` in the server directory
- Returns `{"enrolled": true}`
  ```
- **Response:**
  ```json
  {
    "success": true,
    "verified": true,
    "confidence_score": 0.85,
    "user_id": "user123",
    "session_id": "session123",
    "timestamp": "2025-10-04T...",
    "message": "Signature verified successfully"
  }
  ```

#### Verify OTP
- **POST** `/verify-otp`
- **Body:**
  ```json
  {
    "user_id": "string",
    "otp_code": "123456",
    "session_id": "string"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "verified": true,
    "user_id": "user123",
    "session_id": "session123",
    "timestamp": "2025-10-04T...",
    "message": "OTP verified successfully"
  }
  ```

### Helper Endpoints (for testing)

#### Generate OTP
- **POST** `/generate-otp`
- **Body:**
  ```json
  {
    "user_id": "string",
    "session_id": "string",
    "phone_number": "string"
  }
  ```

#### Enroll Signature
- **POST** `/enroll-signature`
- **Body:**
  ```json
  {
    "user_id": "string",
    "signature_image": "base64_encoded_image",
    "user_name": "string"
  }
  ```

#### Get Session Status
- **GET** `/session/:session_id`

## Testing the API

### Using curl:

1. **Health check:**
   ```bash
   curl http://localhost:3001/health
   ```

2. **Enroll a signature:**
   ```bash
   curl -X POST http://localhost:3001/enroll-signature \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "test_user",
       "signature_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
       "user_name": "Test User"
     }'
   ```

3. **Generate OTP:**
   ```bash
   curl -X POST http://localhost:3001/generate-otp \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "test_user",
       "session_id": "test_session",
       "phone_number": "+1234567890"
     }'
   ```

4. **Verify signature:**
   ```bash
   curl -X POST http://localhost:3001/verify-signature \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "test_user",
       "signature_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
       "session_id": "test_session"
     }'
   ```

5. **Verify OTP:**
   ```bash
   curl -X POST http://localhost:3001/verify-otp \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "test_user",
       "otp_code": "123456",
       "session_id": "test_session"
     }'
   ```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `JWT_SECRET`: Secret for JWT tokens
- `OTP_EXPIRY_MINUTES`: OTP expiration time
- `SIGNATURE_THRESHOLD`: Signature verification threshold

## Production Considerations

- Replace in-memory storage with a proper database (MongoDB, PostgreSQL, etc.)
- Implement actual ML/AI signature verification
- Add authentication and authorization
- Integrate with SMS/email services for OTP delivery
- Add rate limiting and security middleware
- Implement proper logging
- Add comprehensive error handling
- Use environment-specific configurations

## Dependencies

- **express**: Web framework
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable loading
- **body-parser**: Request body parsing
- **uuid**: UUID generation
- **bcrypt**: Password hashing (for future auth)
- **jsonwebtoken**: JWT token handling (for future auth)

## Development Dependencies

- **nodemon**: Auto-restart during development
- **jest**: Testing framework
- **supertest**: HTTP testing

## Scripts

- `npm start`: Start the server
- `npm run dev`: Start with nodemon (development)
- `npm test`: Run tests (when implemented)

## License

ISC