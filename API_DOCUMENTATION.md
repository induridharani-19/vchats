# VChats REST API Reference Guide

Base API Path: `/api/v1`

---

## Auth Endpoints (`/auth`)
- `POST /auth/register`: Initiate user registration (sends verification OTP).
- `POST /auth/verify-otp`: Verify OTP code for account activation or password reset.
- `POST /auth/login`: Authenticate credentials, record session, return Access JWT in HTTP-Only Cookie & JSON payload.
- `POST /auth/refresh-token`: Rotate refresh token and issue new access token.
- `POST /auth/logout`: Terminate active session and clear cookies.
- `POST /auth/logout-all`: Logout all active sessions for current user.
- `POST /auth/forgot-password`: Dispatch password reset OTP email.
- `POST /auth/reset-password`: Update account password using reset token.
- `POST /auth/passkey/login`: Authenticate via WebAuthn passkey assertion.

---

## User Profile & Contacts (`/users`)
- `GET /users/profile`: Fetch authenticated user profile details & settings.
- `PATCH /users/profile`: Update user bio, display name, about, birthday, theme preference.
- `POST /users/profile/photo`: Upload profile avatar image to Cloudinary.
- `GET /users/search?q=query`: Search registered users by handle, email, or display name.
- `POST /users/block`: Block specified user ID.
- `POST /users/unblock`: Unblock specified user ID.
- `POST /users/report`: Submit abuse or spam report against user.

---

## Chats & Messages (`/chats`, `/messages`)
- `GET /chats`: Retrieve user conversation history list with last message previews.
- `POST /chats/direct`: Create or retrieve a 1-to-1 conversation with a contact.
- `GET /chats/:conversationId/messages`: Paginated message history for a conversation.
- `POST /messages/send`: Send a text, file, voice note, location, contact, or poll message.
- `PATCH /messages/:id/edit`: Edit message text content.
- `DELETE /messages/:id/me`: Soft delete message for current user.
- `DELETE /messages/:id/everyone`: Delete message for all chat participants.
- `POST /messages/:id/react`: Toggle emoji reaction on message.
- `POST /messages/:id/star`: Toggle starred message status for current user.
- `POST /messages/poll/vote`: Cast vote on interactive poll options.
- `GET /messages/starred`: Fetch all bookmarked starred messages across chats.
- `GET /chats/:conversationId/export`: Export conversation logs as downloadable file.

---

## Groups & Communities (`/groups`, `/communities`)
- `POST /groups/create`: Create a new group chat with name, description, avatar.
- `POST /groups/:groupId/add`: Add participants to group.
- `DELETE /groups/:groupId/remove/:userId`: Remove participant from group.
- `POST /groups/:groupId/promote`: Grant admin role to group participant.
- `POST /groups/:groupId/demote`: Revoke admin role from group participant.
- `POST /groups/:groupId/leave`: Leave group chat.
- `GET /communities`: Fetch communities user belongs to.
- `POST /communities/create`: Create new community container for group chats.

---

## Status Stories (`/status`)
- `POST /status/create`: Upload image/video/text status slide.
- `GET /status/feed`: Fetch status story feed grouped by contact.
- `POST /status/:storyId/view`: Record view receipt on status slide.

---

## Calling Log (`/calls`)
- `GET /calls/history`: Fetch voice/video call history log.
- `POST /calls/log`: Record new call entry (caller, receiver, call type).
- `PATCH /calls/log/:id`: Update call record with duration and status (ended, missed, rejected).

---

## Business & Payments (`/business`, `/payments`)
- `GET /business/profile/:userId`: Fetch business hours, product catalog, quick replies.
- `PATCH /business/profile`: Update business profile details.
- `POST /payments/transfer`: Execute simulated P2P wallet money transfer.
- `GET /payments/history`: Retrieve V-Pay transaction history log.

---

## AI Services (`/ai`)
- `POST /ai/chat`: Query Meta AI assistant for responses.
- `POST /ai/translate`: Translate message text into target language.
- `POST /ai/summarize`: Generate concise summary of chat message thread.
- `POST /ai/generate-image`: Generate AI artwork or sticker from text prompt.

---

## Admin Endpoints (`/admin`)
- `GET /admin/stats`: Metrics dashboard (total users, messages, calls, storage usage).
- `GET /admin/users`: Paginated list of registered users.
- `POST /admin/users/block`: Toggle global user ban status.
- `DELETE /admin/users/:userId`: Permanently purge user account.
- `POST /admin/broadcast`: Dispatch system-wide alert notification.
