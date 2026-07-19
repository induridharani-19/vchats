import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';

// Mock responses for AI Assistant
const getAiResponse = (input: string): string => {
  const query = input.toLowerCase().trim();

  // Helper matching
  if (query.includes('hello') || query.includes('hi') || query.includes('hey')) {
    return `Hello! 👋 I am your **VChats AI Assistant**. How can I help you today?

You can ask me to:
* **Translate** a message (e.g., "Translate 'Hello' to Spanish")
* **Summarize** a conversation
* **Correct grammar** (e.g., "Check grammar of...")
* Answer questions or write code snippets!`;
  }

  if (query.includes('translate')) {
    const textToTranslate = input.replace(/translate/i, '').trim();
    return `### 🌐 AI Translation Tool
Here is the translation for: *"${textToTranslate}"*

* **Spanish**: Hola, ¿cómo estás?
* **French**: Bonjour, comment ça va?
* **German**: Hallo, wie geht es dir?
* **Telugu**: హలో, ఎలా ఉన్నారు?
* **Hindi**: नमस्ते, आप कैसे हैं?`;
  }

  if (query.includes('summarize') || query.includes('summary')) {
    return `### 📝 Conversation Summary
Based on the chat history, here is the automated AI summary:

> The users discussed updating their workspace configurations, successfully whitelisted database ports, and confirmed the live local server link. They plan to continue implementing the remaining advanced features (2FA, Friends list, and AI integration) next.`;
  }

  if (query.includes('grammar') || query.includes('correct')) {
    return `### ✍️ AI Grammar Correction
* **Original**: *"she dont go to school yesterday"*
* **Corrected**: *"She did not go to school yesterday."*
* **Explanation**: Subject-verb agreement correction (*don't* to *didn't* for past tense) and capitalized the starting letter.`;
  }

  if (query.includes('code') || query.includes('javascript') || query.includes('typescript') || query.includes('python')) {
    return `Here is a clean helper function in **TypeScript** to format message timestamps:

\`\`\`typescript
export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};
\`\`\`
Let me know if you need this written in Python or Rust instead!`;
  }

  if (query.includes('help') || query.includes('what can you do')) {
    return `### 🤖 VChats Assistant Capabilities
Here are the features you can trigger:
1. **Developer Utilities**: I can write, format, or refactor code in JavaScript, TypeScript, CSS, Python, etc.
2. **Text Processing**: I translate sentences, check syntax/grammar errors, and summarize long message threads.
3. **Sentiment Analysis**: Analyze tone of messages.
4. **General Q&A**: Ask me anything!`;
  }

  // Default response
  return `I received your message: *"${input}"*. 

As your **VChats AI Assistant**, I can help you translate languages, write code, correct grammar, and summarize chats. Feel free to try typing one of the triggers:
* *"Translate 'Welcome back!'"*
* *"Write a typescript function"*
* *"Summarize this thread"*
* *"Correct grammar of she don't know"*`;
};

// AI assistant chat
export const chatWithAssistant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { message } = req.body;
    if (!message) {
      return next(new AppError('Message is required.', 400));
    }

    // Simulate small latency (e.g. 500ms) for realistic AI response
    await new Promise((resolve) => setTimeout(resolve, 500));
    const reply = getAiResponse(message);

    res.status(200).json({
      status: 'success',
      reply,
    });
  } catch (error) {
    next(error);
  }
};

// AI text translation
export const translateText = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { text, targetLang } = req.body;
    if (!text) {
      return next(new AppError('Text is required.', 400));
    }

    const lang = targetLang || 'Spanish';
    // Simple mock translations
    let translation = `[Translated to ${lang}] ${text}`;
    if (text.toLowerCase() === 'hello') {
      if (lang.toLowerCase() === 'spanish') translation = 'Hola';
      else if (lang.toLowerCase() === 'french') translation = 'Bonjour';
      else if (lang.toLowerCase() === 'hindi') translation = 'नमस्ते';
    }

    res.status(200).json({
      status: 'success',
      translation,
    });
  } catch (error) {
    next(error);
  }
};

// AI chat summarization
export const summarizeChat = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { messages } = req.body; // Array of strings/messages
    if (!messages || !Array.isArray(messages)) {
      return next(new AppError('An array of messages is required.', 400));
    }

    res.status(200).json({
      status: 'success',
      summary: 'Users verified credentials, resolved routing conflicts, whitelisted firewall rules, and successfully booted dev servers.',
    });
  } catch (error) {
    next(error);
  }
};

// AI grammar check
export const correctGrammar = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { text } = req.body;
    if (!text) {
      return next(new AppError('Text is required.', 400));
    }

    res.status(200).json({
      status: 'success',
      original: text,
      corrected: text.charAt(0).toUpperCase() + text.slice(1) + '.',
      explanation: 'Capitalized start character and added trailing period.',
    });
  } catch (error) {
    next(error);
  }
};
