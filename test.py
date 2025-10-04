import cv2
import mediapipe as mp
import numpy as np

# Mediapipe setup
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

# Canvas for painting
canvas = np.ones((480, 640, 3), dtype=np.uint8) * 255

# Colors and brush settings
colors = [(255, 0, 0), (0, 255, 0), (0, 0, 255)]  # BGR: Blue, Green, Red
color_index = 0
brush_thickness = 5
drawing = False  # whether currently drawing
prev_x, prev_y = None, None

cap = cv2.VideoCapture(0)

with mp_hands.Hands(min_detection_confidence=0.7,
                    min_tracking_confidence=0.7,
                    max_num_hands=1) as hands:
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame = cv2.flip(frame, 1)  # mirror image
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = hands.process(rgb)

        if result.multi_hand_landmarks:
            for hand_landmarks in result.multi_hand_landmarks:
                # Extract coordinates of index finger tip & middle finger tip
                h, w, _ = frame.shape
                index_finger = hand_landmarks.landmark[8]  # index tip
                middle_finger = hand_landmarks.landmark[12]  # middle tip

                x, y = int(index_finger.x * w), int(index_finger.y * h)
                x2, y2 = int(middle_finger.x * w), int(middle_finger.y * h)

                # Check if fingers are close (gesture to switch color)
                if abs(x - x2) < 40 and abs(y - y2) < 40:
                    color_index = (color_index + 1) % len(colors)
                    drawing = False
                    prev_x, prev_y = None, None
                else:
                    # Draw when index finger is up
                    if index_finger.y < hand_landmarks.landmark[6].y:  # index above knuckle
                        drawing = True
                    else:
                        drawing = False
                        prev_x, prev_y = None, None

                if drawing:
                    if prev_x is not None:
                        cv2.line(canvas, (prev_x, prev_y), (x, y),
                                 colors[color_index], brush_thickness)
                    prev_x, prev_y = x, y

                # Draw landmarks (for debugging)
                mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

        # Merge frame & canvas side by side
        combined = np.hstack((frame, canvas))
        cv2.putText(combined, f"Color: {colors[color_index]}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, colors[color_index], 2)

        cv2.imshow("Gesture Painting (Left: Camera | Right: Canvas)", combined)

        if cv2.waitKey(1) & 0xFF == 27:  # ESC to quit
            break

cap.release()
cv2.destroyAllWindows()
