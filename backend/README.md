# DigiSign Backend API

Flask-based backend API for DigiSign signature verification system.

## 🚀 Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py
```

The server will start on `http://localhost:5000`

## 📡 API Endpoints

### Health Check
- `GET /health` - Server health status

### Signature Verification
- `POST /verify-signature` - Verify handwritten signature
- `POST /enroll-signature` - Enroll new signature profile

### OTP Fallback
- `POST /verify-otp` - Verify OTP code
- `POST /generate-otp` - Generate OTP code

## 🔧 Development

The backend includes:
- CORS support for React frontend integration
- Base64 image processing for signature capture
- OpenCV integration for image analysis
- Session-based OTP management
- Comprehensive error handling

## 📦 Dependencies

- Flask 3.0.0 - Web framework
- Flask-CORS 4.0.0 - Cross-origin resource sharing
- OpenCV - Computer vision processing
- NumPy - Numerical computing
- Pillow - Image processing
