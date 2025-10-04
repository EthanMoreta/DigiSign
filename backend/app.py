from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import cv2
import numpy as np
import io
from PIL import Image
import json
import random
import time

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# In-memory storage for demo purposes
# In production, use a proper database
signature_profiles = {}
otp_codes = {}

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'DigiSign Backend API',
        'version': '1.0.0'
    })

@app.route('/verify-signature', methods=['POST'])
def verify_signature():
    """
    Verify a handwritten signature against stored profile
    
    Expected payload:
    {
        "user_id": "string",
        "signature_image": "base64_encoded_image",
        "session_id": "string"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400
        
        # Extract required fields
        user_id = data.get('user_id')
        signature_image = data.get('signature_image')
        session_id = data.get('session_id')
        
        if not all([user_id, signature_image, session_id]):
            return jsonify({
                'success': False,
                'error': 'Missing required fields: user_id, signature_image, session_id'
            }), 400
        
        # Decode base64 image
        try:
            # Remove data URL prefix if present
            if signature_image.startswith('data:image'):
                signature_image = signature_image.split(',')[1]
            
            image_data = base64.b64decode(signature_image)
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to OpenCV format
            opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Invalid image data: {str(e)}'
            }), 400
        
        # Check if user has a stored signature profile
        if user_id not in signature_profiles:
            return jsonify({
                'success': False,
                'error': 'No signature profile found for user',
                'action_required': 'enroll_signature'
            }), 404
        
        # TODO: Implement actual signature verification using ML model
        # For now, simulate verification with basic image processing
        
        # Basic image analysis (placeholder for ML model)
        gray = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        edge_count = np.sum(edges > 0)
        
        # Simulate verification logic
        stored_profile = signature_profiles[user_id]
        similarity_score = simulate_signature_similarity(opencv_image, stored_profile)
        
        # Determine if signature matches (threshold: 0.7)
        is_verified = similarity_score > 0.7
        
        return jsonify({
            'success': True,
            'verified': is_verified,
            'confidence_score': similarity_score,
            'session_id': session_id,
            'timestamp': int(time.time())
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Signature verification failed: {str(e)}'
        }), 500

@app.route('/enroll-signature', methods=['POST'])
def enroll_signature():
    """
    Enroll a new signature profile for a user
    
    Expected payload:
    {
        "user_id": "string",
        "signature_image": "base64_encoded_image",
        "session_id": "string"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400
        
        user_id = data.get('user_id')
        signature_image = data.get('signature_image')
        session_id = data.get('session_id')
        
        if not all([user_id, signature_image, session_id]):
            return jsonify({
                'success': False,
                'error': 'Missing required fields: user_id, signature_image, session_id'
            }), 400
        
        # Decode and process signature image
        try:
            if signature_image.startswith('data:image'):
                signature_image = signature_image.split(',')[1]
            
            image_data = base64.b64decode(signature_image)
            image = Image.open(io.BytesIO(image_data))
            opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'Invalid image data: {str(e)}'
            }), 400
        
        # Store signature profile (in production, use proper storage)
        signature_profiles[user_id] = {
            'image_data': signature_image,
            'enrolled_at': int(time.time()),
            'session_id': session_id
        }
        
        return jsonify({
            'success': True,
            'message': 'Signature profile enrolled successfully',
            'user_id': user_id,
            'session_id': session_id,
            'timestamp': int(time.time())
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Signature enrollment failed: {str(e)}'
        }), 500

@app.route('/verify-otp', methods=['POST'])
def verify_otp():
    """
    Verify OTP code for fallback authentication
    
    Expected payload:
    {
        "user_id": "string",
        "otp_code": "string",
        "session_id": "string"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400
        
        user_id = data.get('user_id')
        otp_code = data.get('otp_code')
        session_id = data.get('session_id')
        
        if not all([user_id, otp_code, session_id]):
            return jsonify({
                'success': False,
                'error': 'Missing required fields: user_id, otp_code, session_id'
            }), 400
        
        # Check if OTP exists and is valid
        if session_id not in otp_codes:
            return jsonify({
                'success': False,
                'error': 'Invalid or expired OTP session'
            }), 400
        
        stored_otp = otp_codes[session_id]
        
        # Check if OTP is expired (5 minutes)
        if time.time() - stored_otp['created_at'] > 300:
            del otp_codes[session_id]
            return jsonify({
                'success': False,
                'error': 'OTP code has expired'
            }), 400
        
        # Verify OTP code
        if stored_otp['code'] != otp_code:
            return jsonify({
                'success': False,
                'error': 'Invalid OTP code'
            }), 400
        
        # Clean up used OTP
        del otp_codes[session_id]
        
        return jsonify({
            'success': True,
            'verified': True,
            'session_id': session_id,
            'timestamp': int(time.time())
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'OTP verification failed: {str(e)}'
        }), 500

@app.route('/generate-otp', methods=['POST'])
def generate_otp():
    """
    Generate OTP code for fallback authentication
    
    Expected payload:
    {
        "user_id": "string",
        "session_id": "string"
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No JSON data provided'
            }), 400
        
        user_id = data.get('user_id')
        session_id = data.get('session_id')
        
        if not all([user_id, session_id]):
            return jsonify({
                'success': False,
                'error': 'Missing required fields: user_id, session_id'
            }), 400
        
        # Generate 6-digit OTP
        otp_code = str(random.randint(100000, 999999))
        
        # Store OTP with expiration
        otp_codes[session_id] = {
            'code': otp_code,
            'user_id': user_id,
            'created_at': time.time()
        }
        
        # In production, send OTP via SMS/email
        # For demo, return the OTP (remove in production)
        return jsonify({
            'success': True,
            'message': 'OTP generated successfully',
            'otp_code': otp_code,  # Remove this in production
            'session_id': session_id,
            'expires_in': 300,  # 5 minutes
            'timestamp': int(time.time())
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'OTP generation failed: {str(e)}'
        }), 500

def simulate_signature_similarity(image, stored_profile):
    """
    Simulate signature similarity calculation
    In production, this would use a trained ML model
    """
    # Basic image similarity simulation
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    
    # Calculate basic features
    edge_density = np.sum(edges > 0) / (edges.shape[0] * edges.shape[1])
    
    # Simulate similarity score (0.0 to 1.0)
    # In reality, this would compare against stored signature features
    base_score = 0.5 + (edge_density * 0.3)
    noise = random.uniform(-0.2, 0.2)
    
    return max(0.0, min(1.0, base_score + noise))

if __name__ == '__main__':
    print("🚀 Starting DigiSign Backend API...")
    print("📝 Available endpoints:")
    print("   GET  /health - Health check")
    print("   POST /verify-signature - Verify handwritten signature")
    print("   POST /enroll-signature - Enroll new signature profile")
    print("   POST /verify-otp - Verify OTP code")
    print("   POST /generate-otp - Generate OTP code")
    print("🌐 Server running on http://localhost:5001")
    
    app.run(debug=True, host='0.0.0.0', port=5001)
