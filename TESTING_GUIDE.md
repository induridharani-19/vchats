# VChats Testing & Quality Assurance Guide

---

## 1. Backend Build & Compilation Verification
To verify TypeScript compilation for the Express backend server:
```bash
cd backend
npm run build
```

---

## 2. Frontend Build Verification
To verify Vite bundling and production compilation for the React frontend client:
```bash
cd frontend
npm run build
```

---

## 3. End-to-End Functional Test Checklist
- **Authentication**: Register new user -> OTP code verification -> Passkey/Biometric login -> Session token cookie validation.
- **Messaging**: Send text -> Send image -> Record voice note -> Create poll -> Cast vote -> Verify live Socket.io updates across two browser windows.
- **View Once Media**: Send media with View Once flag active -> Click to view -> Verify image self-destructs and cannot be opened again.
- **Starred Messages**: Hover over message -> Click Star -> Open Starred Messages drawer -> Verify message is bookmarked.
- **WebRTC Calls**: Initiate call -> Accept -> Verify video stream -> Toggle Screen Sharing -> Trigger floating emoji reaction (`❤️`).
- **Payments (V-Pay)**: Open V-Pay Wallet modal -> Enter recipient handle & amount -> Click Transfer -> Verify balance updates and receipt message appears in chat.
- **Meta AI Assistant**: Click Meta AI chat -> Type query -> Verify AI response is streamed back in chat feed.
