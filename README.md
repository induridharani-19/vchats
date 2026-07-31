# 💬 VChats – Real-Time AI Chat Application

VChats is a modern full-stack real-time chat application that enables users to communicate instantly through private and group conversations. Built with the MERN stack and Socket.IO, it provides secure authentication, live messaging, media sharing, and an intuitive user experience.

---

## 🚀 Features

### 🔐 Authentication

* User Registration & Login
* JWT Authentication
* Password Hashing (bcrypt)
* Secure Protected Routes
* User Profile Management

### 💬 Real-Time Messaging

* One-to-One Chat
* Group Chats
* Instant Message Delivery
* Typing Indicators
* Read Receipts
* Online/Offline Status

### 📁 Media Sharing

* Image Sharing
* Document Sharing
* File Upload Support
* Emoji Support

### 👥 Group Features

* Create Groups
* Add/Remove Members
* Group Admin Controls
* Group Information Management

### 🔔 Notifications

* Real-Time Notifications
* New Message Alerts
* Mention Notifications
* Unread Message Count

### ⚡ User Experience

* Responsive Design
* Dark/Light Theme Support
* Search Users
* Search Conversations
* Smooth Animations
* Mobile Friendly Interface

---

# 🛠 Tech Stack

## Frontend

* React.js
* TypeScript
* Vite
* Tailwind CSS
* React Router
* Axios
* Socket.IO Client

## Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* Socket.IO
* JWT
* bcrypt

## DevOps

* Docker
* Docker Compose
* Vercel
* Render
* Git & GitHub

---

# 📂 Project Structure

```text
VChats
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── socket/
│   └── server.js
│
├── docker-compose.yml
├── package.json
├── README.md
└── .gitignore
```

---

# ⚙️ Installation

## Clone the Repository

```bash
git clone https://github.com/induridharani-19/vchats.git
```

```bash
cd vchats
```

## Install Dependencies

### Root

```bash
npm install
```

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd ../frontend
npm install
```

---

# ▶️ Run the Project

### Start Backend

```bash
cd backend
npm run dev
```

### Start Frontend

```bash
cd frontend
npm run dev
```

Open your browser at:

```
http://localhost:5173
```

---

# 🐳 Docker

Run the application with Docker:

```bash
docker-compose up --build
```

---

# 🌐 Environment Variables

## Backend (.env)

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

CLIENT_URL=http://localhost:5173
```

---

# ✨ Core Modules

* Authentication
* User Profiles
* Private Chats
* Group Chats
* Real-Time Messaging
* Notifications
* Media Sharing
* Settings

---

# 🔒 Security

* JWT Authentication
* Password Hashing
* Protected API Routes
* Secure Environment Variables
* Input Validation
* CORS Protection

---

# 📸 Screenshots

Add screenshots of:

* Login Page
* Registration Page
* Chat Dashboard
* Private Chat
* Group Chat
* User Profile
* Mobile View

---

# 🚀 Deployment

### Frontend

* Vercel

### Backend

* Render

### Database

* MongoDB Atlas

---

# 🔮 Future Enhancements

* Voice Calling
* Video Calling
* Screen Sharing
* Message Reactions
* Message Editing
* Message Deletion
* End-to-End Encryption
* AI Chat Assistant
* Push Notifications
* Multi-language Support

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your branch
5. Open a Pull Request

---


# 📄 License

This project is licensed under the MIT License.

---

⭐ If you found this project useful, consider giving it a star on GitHub!
