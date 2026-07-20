# VChats Enterprise Security & Compliance Guide

---

## 1. Authentication & Token Management
- **JWT Access Tokens**: Short-lived (15 mins) access tokens signed with HMAC-SHA256.
- **Refresh Token Rotation**: Stored in HTTP-Only, SameSite cookies to protect against XSS and CSRF attacks.
- **Bcrypt Password Hashing**: Passwords salted with 10 rounds of Bcrypt.
- **WebAuthn Passkey Support**: Biometric / Hardware key authentication support.

## 2. Real-Time & WebRTC Security
- **WebSockets Authentication**: Socket connection handshake verifies JWT before allowing room subscriptions.
- **WebRTC P2P Stream Protection**: WebRTC media channels encrypted via DTLS-SRTP.
- **Hide IP Setting**: Option to relay WebRTC ICE candidates through TURN/STUN proxy servers to mask client IP addresses.

## 3. Data Protection & Chat Privacy
- **Chat Lock & Biometrics**: Private chat folders locked behind a 4-digit PIN or Secret Code.
- **View Once Media**: Self-destructing media binary links that expire upon viewing.
- **Disappearing Messages**: Background TTL index cleans up expired conversation messages.
- **Sanitized Uploads**: Multer middleware checks file MIME types before Cloudinary upload.

## 4. Rate Limiting & API Defense
- **Express Rate Limit**: API endpoints guarded against brute-force attacks (`express-rate-limit`).
- **CORS Protection**: Access control headers strictly restrict origins to configured frontend URLs.
