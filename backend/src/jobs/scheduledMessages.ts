import Message from '../models/Message';
import Conversation from '../models/Conversation';
import { Server } from 'socket.io';

export const startScheduledMessagesJob = (io: Server) => {
  // Check every 10 seconds for scheduled messages
  console.log('[Scheduled Messages Job] Initialized running every 10 seconds.');
  
  setInterval(async () => {
    try {
      const now = new Date();
      // Find messages whose scheduledFor date is in the past/present
      const messages = await Message.find({
        scheduledFor: { $lte: now },
      }).populate('senderId', 'username displayName profilePhoto');

      for (const msg of messages) {
        const conversationId = msg.conversationId;

        // Reset scheduledFor to undefined so it is not sent again
        msg.scheduledFor = undefined;
        await msg.save();

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) continue;

        // Update Conversation Last Message
        conversation.lastMessage = msg._id as any;

        // Update Unread Counts for other participants
        conversation.participants.forEach((participantId) => {
          const pStr = participantId.toString();
          if (pStr !== msg.senderId._id.toString()) {
            const count = conversation.unreadCounts.get(pStr) || 0;
            conversation.unreadCounts.set(pStr, count + 1);
          }
        });

        await conversation.save();

        // Emit via Socket.io
        io.to(conversationId.toString()).emit('message-receive', msg);
        
        // Broadcast conversation list updates to participants (fully populated)
        const populatedConversation = await Conversation.findById(conversation._id)
          .populate('participants', 'username displayName profilePhoto status lastSeen email bio about')
          .populate({
            path: 'lastMessage',
            populate: {
              path: 'senderId',
              select: 'username displayName',
            },
          })
          .populate('groupId');

        if (populatedConversation) {
          populatedConversation.participants.forEach((p: any) => {
            const pId = p._id || p;
            io.to(pId.toString()).emit('conversation-update', populatedConversation);
          });
        }

        console.log(`[Scheduled Messages Job] Dispatched message ${msg._id} scheduled for ${msg.createdAt}`);
      }
    } catch (err) {
      console.error('[Scheduled Messages Job] Error processing scheduled messages:', err);
    }
  }, 10000); // 10 seconds
};
