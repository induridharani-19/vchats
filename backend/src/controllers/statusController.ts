import { Response, NextFunction } from 'express';
import Story from '../models/Story';
import User from '../models/User';
import { AppError } from '../utils/appError';
import { AuthenticatedRequest } from '../middlewares/auth';
import { uploadToCloudinary } from '../middlewares/upload';
import { Server } from 'socket.io';

// Post a new Story
export const postStory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { mediaType, textContent, background, caption, songTitle, songArtist, songAlbumArt, songPreviewUrl, duration } = req.body;
    const userId = req.user?._id;

    if (!mediaType || !['text', 'image', 'video', 'audio'].includes(mediaType)) {
      return next(new AppError('Valid mediaType (text, image, video, audio) is required.', 400));
    }

    let mediaUrl = undefined;

    if (mediaType === 'text') {
      if (!textContent) {
        return next(new AppError('textContent is required for text story.', 400));
      }
    } else {
      if (!req.file) {
        return next(new AppError('File upload is required for image/video status.', 400));
      }
      const result = await uploadToCloudinary(req.file.path, 'stories', mediaType);
      mediaUrl = result.url;
    }

    const story = await Story.create({
      userId,
      mediaType,
      mediaUrl,
      textContent,
      background: background || '#00B69B',
      caption: caption || '',
      songTitle,
      songArtist,
      songAlbumArt,
      songPreviewUrl,
      duration: duration ? parseInt(duration as string, 10) : undefined,
    });

    const populatedStory = await story.populate('userId', 'username displayName profilePhoto');

    // Notify contacts via socket
    const io: Server = req.app.get('io');
    if (io) {
      io.emit('story-new', populatedStory); // Real-time global update (or scoping to contacts is possible)
    }

    res.status(201).json({
      status: 'success',
      story: populatedStory,
    });
  } catch (error) {
    next(error);
  }
};

// Get Status/Stories Feed (active last 24h)
export const getStatusFeed = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?._id;

    // Fetch active stories (under 24h, automatic delete index works but query filters to be double sure)
    const activeStories = await Story.find({
      expiresAt: { $gt: new Date() },
      // Exclude stories of users who blocked current user
      userId: { $nin: req.user?.blockedUsers || [] },
    })
      .populate('userId', 'username displayName profilePhoto status lastSeen')
      .sort({ createdAt: -1 });

    // Group stories by User for WhatsApp Web style grouping
    const feedMap: { [key: string]: any } = {};

    activeStories.forEach((story) => {
      if (!story.userId) return;
      const uStr = (story.userId as any)._id?.toString() || (story.userId as any).toString();
      if (!feedMap[uStr]) {
        feedMap[uStr] = {
          user: story.userId,
          stories: [],
        };
      }
      feedMap[uStr].stories.push(story);
    });

    const feed = Object.values(feedMap);

    res.status(200).json({
      status: 'success',
      feed,
    });
  } catch (error) {
    next(error);
  }
};

// View a story
export const viewStory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { storyId } = req.params;
    const userId = req.user?._id;

    const story = await Story.findById(storyId);
    if (!story) {
      return next(new AppError('Story not found or expired.', 404));
    }

    if (story.userId.toString() === userId.toString()) {
      res.status(200).json({ status: 'success', message: 'Own story.' });
      return;
    }

    // Check if user already viewed
    const viewed = story.viewers.some((v) => v.userId.toString() === userId.toString());
    if (!viewed) {
      story.viewers.push({ userId, viewedAt: new Date() });
      await story.save();

      // Emit viewer notification to creator
      const io: Server = req.app.get('io');
      if (io) {
        io.to(story.userId.toString()).emit('story-viewed', {
          storyId,
          userId,
          viewedAt: new Date(),
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Story marked as viewed.',
    });
  } catch (error) {
    next(error);
  }
};

// Get Story viewers (Owner only)
export const getStoryViews = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { storyId } = req.params;
    const userId = req.user?._id;

    const story = await Story.findById(storyId).populate('viewers.userId', 'username displayName profilePhoto');
    if (!story) {
      return next(new AppError('Story not found.', 404));
    }

    if (story.userId.toString() !== userId.toString()) {
      return next(new AppError('Only the story owner can view this list.', 403));
    }

    res.status(200).json({
      status: 'success',
      viewers: story.viewers,
    });
  } catch (error) {
    next(error);
  }
};

// Search for songs (Spotify-style, powered by iTunes Search API)
export const searchSongs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { query } = req.query;
    if (!query) {
      res.status(200).json({ status: 'success', songs: [] });
      return;
    }

    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query as string)}&media=music&limit=15`
    );

    if (!response.ok) {
      throw new AppError('Music API search failed.', 500);
    }

    const data: any = await response.json();
    const songs = (data.results || []).map((track: any) => ({
      title: track.trackName,
      artist: track.artistName,
      albumArt: track.artworkUrl100, // 100x100 resolution artwork
      previewUrl: track.previewUrl,  // 30s audio preview URL
    }));

    res.status(200).json({
      status: 'success',
      songs,
    });
  } catch (error) {
    next(error);
  }
};
