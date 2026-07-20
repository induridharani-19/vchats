# VChats Socket.io Event Protocol Specification

---

## Client -> Server Events

| Event Name | Payload Format | Description |
|---|---|---|
| `join-room` | `{ conversationId: string }` | Client joins conversation room channel. |
| `leave-room` | `{ conversationId: string }` | Client leaves conversation room channel. |
| `typing` | `{ conversationId: string, username: string }` | Signals user is currently typing a message. |
| `stop-typing` | `{ conversationId: string }` | Signals user stopped typing. |
| `message-send` | `MessageObject` | Emits a new text/media message to the room. |
| `message-edit` | `{ messageId: string, content: string }` | Emits edited text update to room. |
| `message-delete` | `{ messageId: string, everyone: boolean }` | Notifies room of deleted message. |
| `reaction-add` | `{ messageId: string, emoji: string }` | Adds emoji reaction to a message. |
| `reaction-remove` | `{ messageId: string, emoji: string }` | Removes emoji reaction from a message. |
| `poll-vote` | `{ messageId: string, optionId: string }` | Casts vote on an interactive poll. |
| `webrtc-offer` | `{ to: string, offer: RTCSessionDescription }` | Dispatches SDP offer packet for WebRTC call. |
| `webrtc-answer` | `{ to: string, answer: RTCSessionDescription }` | Dispatches SDP answer packet for WebRTC call. |
| `webrtc-ice-candidate` | `{ to: string, candidate: RTCIceCandidate }` | Forwards ICE candidate network routing packet. |
| `call-reaction` | `{ to: string, emoji: string }` | Emits floating in-call emoji reaction. |

---

## Server -> Client Events

| Event Name | Payload Format | Description |
|---|---|---|
| `user-online` | `{ userId: string }` | Broadcasts user online status. |
| `user-offline` | `{ userId: string }` | Broadcasts user offline status & `lastSeen`. |
| `message-receive` | `MessageObject` | Delivers new incoming message to recipients. |
| `message-updated` | `MessageObject` | Updates edited or reacted message state. |
| `message-deleted` | `{ messageId: string, everyone: boolean }` | Instructs clients to remove message from DOM. |
| `typing` | `{ username: string }` | Triggers typing indicator UI in recipient view. |
| `stop-typing` | `{ userId: string }` | Clears typing indicator UI. |
| `poll-updated` | `MessageObject` | Delivers live vote percentages to poll component. |
| `call-incoming` | `{ from: string, callType: 'audio' \| 'video' }` | Triggers incoming call banner/ringtone. |
| `call-accepted` | `{ from: string }` | Notifies caller that WebRTC stream is accepted. |
| `call-rejected` | `{ from: string }` | Notifies caller that recipient declined. |
| `call-ended` | `{ from: string }` | Terminates active WebRTC call interface. |
