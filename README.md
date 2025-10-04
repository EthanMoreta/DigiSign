# DigiSign

## DigiSign ✍️🔒

Reimagining digital trust with camera-based signature verification

DigiSign is a hackathon project built for HackHarvard 2025 that replaces traditional two-factor authentication (like SMS codes or OTPs) with a secure, familiar, and human-first alternative: your handwritten signature captured through your camera.

Instead of waiting for codes or relying on vulnerable verification methods, DigiSign allows users to confirm digital transactions by simply signing in real time. Using computer vision and machine learning, DigiSign compares a user’s live signature against their stored digital signature profile, ensuring security that’s:

Personal – your signature is unique to you, no extra devices needed.

Secure – harder to phish or steal than SMS codes or passwords.

Trusted – signatures have been a standard of legal and financial trust for centuries.

## 🔑 How It Works

User checks out on a demo site.

Instead of OTP, DigiSign prompts them to sign on camera.

Our backend processes the signature with OpenCV + a Siamese neural network for verification.

If the signature matches → transaction approved. Otherwise → rejected.

## 🛠️ Tech Stack

Frontend: React (checkout flow + webcam capture)

Backend: Flask / Node.js REST API

ML: OpenCV preprocessing + signature verification model (Siamese CNN)

Deployment: (optional) Cloudflare Workers or containerized app

## 🚀 Hackathon Scope

Build a polished demo checkout flow.

Capture and verify signatures in real time.

Showcase DigiSign as a modern replacement for 2FA to improve trust in digital transactions.

## 🌍 Vision

DigiSign is a first step toward a more trustworthy internet — one where authentication is intuitive, verifiable, and grounded in methods humans already trust.
