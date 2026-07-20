# VChats Production Deployment & Infrastructure Guide

---

## Environment Variables Configuration

### Backend `.env`
```env
PORT=5050
NODE_ENV=production
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/vchats?retryWrites=true&w=majority
JWT_ACCESS_SECRET=your_super_secret_access_key_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_32_chars
FRONTEND_URL=https://vchats.vercel.app
CLOUDINARY_CLOUD_NAME=vchats_cloud
CLOUDINARY_API_KEY=123456789
CLOUDINARY_API_SECRET=your_cloudinary_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_email_app_password
```

### Frontend `.env`
```env
VITE_API_URL=https://vchats-backend.onrender.com/api/v1
VITE_SOCKET_URL=https://vchats-backend.onrender.com
```

---

## Deployment Platforms

### 1. Backend (Render / Railway / Docker Container)
- Runtime: Node 20 LTS
- Build Command: `cd backend && npm install && npm run build`
- Start Command: `cd backend && npm start`

### 2. Frontend (Vercel / Netlify)
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

### 3. Docker Compose Local & Production Deployment
```bash
docker-compose up --build -d
```
- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:5050`
