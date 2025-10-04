from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import mediapipe as mp
import numpy as np
import base64
import io
from PIL import Image

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Initialize MediaPipe
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7,
    max_num_hands=1
)

# Drawing state (stored server-side per session if needed)
# For stateless API, React will manage drawing state
colors = [
    {'name': 'blue', 'bgr': [255, 0, 0], 'hex': '#0000FF'},
    {'name': 'green', 'bgr': [0, 255, 0], 'hex': '#00FF00'},
    {'name': 'red', 'bgr': [0, 0, 255], 'hex': '#FF0000'},
    {'name': 'yellow', 'bgr': [0, 255, 255], 'hex': '#FFFF00'},
    {'name': 'purple', 'bgr': [255, 0, 255], 'hex': '#FF00FF'}
]

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'Hand tracking API is running'})

@app.route('/colors', methods=['GET'])
def get_colors():
    """Get available colors"""
    return jsonify({'colors': colors})

@app.route('/process-frame', methods=['POST'])
def process_frame():
    """
    Process a video frame and return hand landmarks with gesture detection
    Expects JSON: { 
        "frame": "base64_encoded_image",
        "confidence": 0.7 (optional)
    }
    Returns: {
        "success": true,
        "hand_detected": true/false,
        "landmarks": [{x, y, z}, ...],
        "index_finger_pos": {x, y},
        "drawing_active": true/false,
        "gesture": "color_change" | null,
        "finger_distance": number
    }
    """
    try:
        data = request.json
        
        # Get frame data
        frame_data = data.get('frame', '')
        if not frame_data:
            return jsonify({'error': 'No frame data provided'}), 400
        
        # Decode base64 image
        if ',' in frame_data:
            frame_data = frame_data.split(',')[1]
        
        img_bytes = base64.b64decode(frame_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({'error': 'Failed to decode image'}), 400
        
        # Convert BGR to RGB for MediaPipe
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process with MediaPipe
        results = hands.process(rgb_frame)
        
        # Prepare response
        response_data = {
            'success': True,
            'hand_detected': False,
            'landmarks': None,
            'index_finger_pos': None,
            'drawing_active': False,
            'gesture': None,
            'finger_distance': None
        }
        
        if results.multi_hand_landmarks:
            hand_landmarks = results.multi_hand_landmarks[0]
            h, w, _ = frame.shape
            
            # Convert landmarks to serializable format
            landmarks_list = []
            for landmark in hand_landmarks.landmark:
                landmarks_list.append({
                    'x': landmark.x,
                    'y': landmark.y,
                    'z': landmark.z
                })
            
            response_data['hand_detected'] = True
            response_data['landmarks'] = landmarks_list
            
            # Get key finger positions
            index_tip = hand_landmarks.landmark[8]  # index finger tip
            index_knuckle = hand_landmarks.landmark[6]  # index finger knuckle
            middle_tip = hand_landmarks.landmark[12]  # middle finger tip
            
            # Index finger position (for drawing)
            index_x = int(index_tip.x * w)
            index_y = int(index_tip.y * h)
            response_data['index_finger_pos'] = {'x': index_x, 'y': index_y}
            
            # Check if index finger is up (drawing condition)
            # Index tip should be above knuckle
            response_data['drawing_active'] = index_tip.y < index_knuckle.y
            
            # Check for color change gesture (index and middle finger close together)
            middle_x = int(middle_tip.x * w)
            middle_y = int(middle_tip.y * h)
            
            distance = np.sqrt((index_x - middle_x)**2 + (index_y - middle_y)**2)
            response_data['finger_distance'] = float(distance)
            
            # Gesture detected when fingers are close (within 40 pixels)
            if distance < 40:
                response_data['gesture'] = 'color_change'
                response_data['drawing_active'] = False  # Don't draw during gesture
        
        return jsonify(response_data)
    
    except Exception as e:
        print(f"Error processing frame: {str(e)}")
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/update-settings', methods=['POST'])
def update_settings():
    """
    Update hand tracking settings
    Expects JSON: { 
        "min_detection_confidence": 0.7, 
        "min_tracking_confidence": 0.7 
    }
    """
    try:
        data = request.json
        min_detection = data.get('min_detection_confidence', 0.7)
        min_tracking = data.get('min_tracking_confidence', 0.7)
        
        # Validate inputs
        min_detection = max(0.0, min(1.0, float(min_detection)))
        min_tracking = max(0.0, min(1.0, float(min_tracking)))
        
        global hands
        hands.close()
        hands = mp_hands.Hands(
            min_detection_confidence=min_detection,
            min_tracking_confidence=min_tracking,
            max_num_hands=1
        )
        
        return jsonify({
            'success': True,
            'message': 'Settings updated',
            'settings': {
                'min_detection_confidence': min_detection,
                'min_tracking_confidence': min_tracking
            }
        })
    
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

if __name__ == '__main__':
    print("=" * 50)
    print("Starting Hand Tracking API Server")
    print("=" * 50)
    print("Server running on http://localhost:5000")
    print("\nEndpoints:")
    print("  GET  /health          - Health check")
    print("  GET  /colors          - Get available colors")
    print("  POST /process-frame   - Process video frame")
    print("  POST /update-settings - Update detection settings")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True)