import { api, APIError } from "encore.dev/api";
import { musicDB } from "./db";
import { generatedTracks } from "./storage";
import log from "encore.dev/log";

export interface CreateCollaborationRequest {
  name: string;
  description?: string;
  projectType: 'track' | 'sample_pack' | 'remix_challenge';
  isPublic: boolean;
  maxCollaborators?: number;
  tags?: string[];
}

export interface CreateCollaborationResponse {
  id: number;
  name: string;
  inviteCode: string;
  createdAt: Date;
}

export interface JoinCollaborationRequest {
  inviteCode: string;
  userName: string;
}

export interface JoinCollaborationResponse {
  collaborationId: number;
  role: string;
  permissions: string[];
}

export interface ShareContentRequest {
  collaborationId: number;
  contentType: 'track' | 'sample' | 'pattern' | 'idea';
  contentId?: number;
  title: string;
  description?: string;
  audioUrl?: string;
  metadata?: any;
}

export interface ShareContentResponse {
  id: number;
  collaborationId: number;
  sharedAt: Date;
}

export interface GetCollaborationFeedRequest {
  collaborationId: number;
  limit?: number;
  offset?: number;
}

export interface GetCollaborationFeedResponse {
  items: CollaborationFeedItem[];
  totalCount: number;
  hasMore: boolean;
}

export interface CollaborationFeedItem {
  id: number;
  type: 'content_shared' | 'comment_added' | 'collaboration_joined' | 'remix_created';
  userName: string;
  title: string;
  description?: string;
  audioUrl?: string;
  metadata?: any;
  createdAt: Date;
  likes: number;
  comments: number;
  isLiked?: boolean;
}

export interface AddCommentRequest {
  feedItemId: number;
  comment: string;
  timestamp?: number; // For audio comments
}

export interface AddCommentResponse {
  id: number;
  comment: string;
  userName: string;
  createdAt: Date;
}

export interface CreateRemixChallengeRequest {
  name: string;
  description: string;
  sourceTrackId: number;
  duration: number; // in days
  prizes?: string[];
  rules?: string[];
}

export interface CreateRemixChallengeResponse {
  id: number;
  name: string;
  endDate: Date;
  participantCount: number;
}

export interface SubmitRemixRequest {
  challengeId: number;
  trackId: number;
  title: string;
  description?: string;
}

export interface SubmitRemixResponse {
  id: number;
  challengeId: number;
  submittedAt: Date;
  position: number;
}

// Creates a new collaboration space
export const createCollaboration = api<CreateCollaborationRequest, CreateCollaborationResponse>(
  { expose: true, method: "POST", path: "/collaboration" },
  async (req) => {
    if (!req.name || req.name.trim().length === 0) {
      throw APIError.invalidArgument("Collaboration name is required");
    }

    if (req.name.length > 100) {
      throw APIError.invalidArgument("Collaboration name must be less than 100 characters");
    }

    if (req.maxCollaborators && (req.maxCollaborators < 2 || req.maxCollaborators > 50)) {
      throw APIError.invalidArgument("Max collaborators must be between 2 and 50");
    }

    try {
      const inviteCode = generateInviteCode();
      
      const result = await musicDB.queryRow<{
        id: number;
        name: string;
        invite_code: string;
        created_at: Date;
      }>`
        INSERT INTO collaborations (
          name, 
          description, 
          project_type, 
          is_public, 
          max_collaborators, 
          invite_code,
          tags,
          created_at
        )
        VALUES (
          ${req.name}, 
          ${req.description || null}, 
          ${req.projectType}, 
          ${req.isPublic}, 
          ${req.maxCollaborators || 10}, 
          ${inviteCode},
          ${req.tags || []},
          NOW()
        )
        RETURNING id, name, invite_code, created_at
      `;

      if (!result) {
        throw APIError.internal("Failed to create collaboration");
      }

      log.info("Collaboration created", {
        id: result.id,
        name: result.name,
        projectType: req.projectType,
        isPublic: req.isPublic
      });

      return {
        id: result.id,
        name: result.name,
        inviteCode: result.invite_code,
        createdAt: result.created_at
      };

    } catch (error) {
      log.error("Failed to create collaboration", { error: error.message, request: req });
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to create collaboration");
    }
  }
);

// Joins an existing collaboration
export const joinCollaboration = api<JoinCollaborationRequest, JoinCollaborationResponse>(
  { expose: true, method: "POST", path: "/collaboration/join" },
  async (req) => {
    if (!req.inviteCode || req.inviteCode.trim().length === 0) {
      throw APIError.invalidArgument("Invite code is required");
    }

    if (!req.userName || req.userName.trim().length === 0) {
      throw APIError.invalidArgument("User name is required");
    }

    if (req.userName.length > 50) {
      throw APIError.invalidArgument("User name must be less than 50 characters");
    }

    try {
      // Check if collaboration exists and is active
      const collaboration = await musicDB.queryRow<{
        id: number;
        name: string;
        max_collaborators: number;
        is_active: boolean;
      }>`
        SELECT id, name, max_collaborators, is_active 
        FROM collaborations 
        WHERE invite_code = ${req.inviteCode}
      `;

      if (!collaboration) {
        throw APIError.notFound("Invalid invite code");
      }

      if (!collaboration.is_active) {
        throw APIError.failedPrecondition("This collaboration is no longer active");
      }

      // Check current collaborator count
      const currentCount = await musicDB.queryRow<{ count: number }>`
        SELECT COUNT(*) as count 
        FROM collaboration_members 
        WHERE collaboration_id = ${collaboration.id}
      `;

      if (currentCount && currentCount.count >= collaboration.max_collaborators) {
        throw APIError.resourceExhausted("This collaboration is full");
      }

      // Check if user already joined
      const existingMember = await musicDB.queryRow<{ id: number }>`
        SELECT id 
        FROM collaboration_members 
        WHERE collaboration_id = ${collaboration.id} AND user_name = ${req.userName}
      `;

      if (existingMember) {
        throw APIError.alreadyExists("You have already joined this collaboration");
      }

      // Add user to collaboration
      await musicDB.exec`
        INSERT INTO collaboration_members (
          collaboration_id, 
          user_name, 
          role, 
          permissions, 
          joined_at
        )
        VALUES (
          ${collaboration.id}, 
          ${req.userName}, 
          ${'contributor'}, 
          ${['view', 'comment', 'share_content']}, 
          NOW()
        )
      `;

      log.info("User joined collaboration", {
        collaborationId: collaboration.id,
        userName: req.userName,
        currentMembers: (currentCount?.count || 0) + 1
      });

      return {
        collaborationId: collaboration.id,
        role: 'contributor',
        permissions: ['view', 'comment', 'share_content']
      };

    } catch (error) {
      log.error("Failed to join collaboration", { error: error.message, request: req });
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to join collaboration");
    }
  }
);

// Shares content in a collaboration
export const shareContent = api<ShareContentRequest, ShareContentResponse>(
  { expose: true, method: "POST", path: "/collaboration/share" },
  async (req) => {
    if (!req.title || req.title.trim().length === 0) {
      throw APIError.invalidArgument("Content title is required");
    }

    if (req.title.length > 200) {
      throw APIError.invalidArgument("Content title must be less than 200 characters");
    }

    if (req.description && req.description.length > 1000) {
      throw APIError.invalidArgument("Content description must be less than 1000 characters");
    }

    try {
      // Verify collaboration exists
      const collaboration = await musicDB.queryRow<{ id: number; is_active: boolean }>`
        SELECT id, is_active 
        FROM collaborations 
        WHERE id = ${req.collaborationId}
      `;

      if (!collaboration) {
        throw APIError.notFound("Collaboration not found");
      }

      if (!collaboration.is_active) {
        throw APIError.failedPrecondition("This collaboration is no longer active");
      }

      // Create shared content entry
      const result = await musicDB.queryRow<{
        id: number;
        collaboration_id: number;
        shared_at: Date;
      }>`
        INSERT INTO collaboration_content (
          collaboration_id,
          content_type,
          content_id,
          title,
          description,
          audio_url,
          metadata,
          shared_at
        )
        VALUES (
          ${req.collaborationId},
          ${req.contentType},
          ${req.contentId || null},
          ${req.title},
          ${req.description || null},
          ${req.audioUrl || null},
          ${req.metadata ? JSON.stringify(req.metadata) : null},
          NOW()
        )
        RETURNING id, collaboration_id, shared_at
      `;

      if (!result) {
        throw APIError.internal("Failed to share content");
      }

      // Create feed item
      await musicDB.exec`
        INSERT INTO collaboration_feed (
          collaboration_id,
          feed_type,
          content_id,
          title,
          description,
          audio_url,
          metadata,
          created_at
        )
        VALUES (
          ${req.collaborationId},
          ${'content_shared'},
          ${result.id},
          ${req.title},
          ${req.description || null},
          ${req.audioUrl || null},
          ${req.metadata ? JSON.stringify(req.metadata) : null},
          NOW()
        )
      `;

      log.info("Content shared in collaboration", {
        collaborationId: req.collaborationId,
        contentType: req.contentType,
        contentId: result.id
      });

      return {
        id: result.id,
        collaborationId: result.collaboration_id,
        sharedAt: result.shared_at
      };

    } catch (error) {
      log.error("Failed to share content", { error: error.message, request: req });
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to share content");
    }
  }
);

// Gets collaboration feed
export const getCollaborationFeed = api<GetCollaborationFeedRequest, GetCollaborationFeedResponse>(
  { expose: true, method: "GET", path: "/collaboration/:collaborationId/feed" },
  async (req) => {
    const limit = Math.min(req.limit || 20, 100);
    const offset = req.offset || 0;

    try {
      // Verify collaboration exists
      const collaboration = await musicDB.queryRow<{ id: number }>`
        SELECT id FROM collaborations WHERE id = ${req.collaborationId}
      `;

      if (!collaboration) {
        throw APIError.notFound("Collaboration not found");
      }

      // Get feed items
      const items = await musicDB.queryAll<{
        id: number;
        feed_type: string;
        user_name: string;
        title: string;
        description: string;
        audio_url: string;
        metadata: any;
        created_at: Date;
        likes_count: number;
        comments_count: number;
      }>`
        SELECT 
          cf.id,
          cf.feed_type,
          cf.user_name,
          cf.title,
          cf.description,
          cf.audio_url,
          cf.metadata,
          cf.created_at,
          COALESCE(l.likes_count, 0) as likes_count,
          COALESCE(c.comments_count, 0) as comments_count
        FROM collaboration_feed cf
        LEFT JOIN (
          SELECT feed_item_id, COUNT(*) as likes_count 
          FROM collaboration_likes 
          GROUP BY feed_item_id
        ) l ON cf.id = l.feed_item_id
        LEFT JOIN (
          SELECT feed_item_id, COUNT(*) as comments_count 
          FROM collaboration_comments 
          GROUP BY feed_item_id
        ) c ON cf.id = c.feed_item_id
        WHERE cf.collaboration_id = ${req.collaborationId}
        ORDER BY cf.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      // Get total count
      const totalResult = await musicDB.queryRow<{ count: number }>`
        SELECT COUNT(*) as count 
        FROM collaboration_feed 
        WHERE collaboration_id = ${req.collaborationId}
      `;

      const totalCount = totalResult?.count || 0;
      const hasMore = offset + items.length < totalCount;

      const feedItems: CollaborationFeedItem[] = items.map(item => ({
        id: item.id,
        type: item.feed_type as any,
        userName: item.user_name || 'Anonymous',
        title: item.title,
        description: item.description,
        audioUrl: item.audio_url,
        metadata: item.metadata,
        createdAt: item.created_at,
        likes: item.likes_count,
        comments: item.comments_count,
        isLiked: false // TODO: Check if current user liked
      }));

      log.info("Retrieved collaboration feed", {
        collaborationId: req.collaborationId,
        itemsCount: items.length,
        totalCount,
        hasMore
      });

      return {
        items: feedItems,
        totalCount,
        hasMore
      };

    } catch (error) {
      log.error("Failed to get collaboration feed", { error: error.message, request: req });
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to get collaboration feed");
    }
  }
);

// Adds a comment to a feed item
export const addComment = api<AddCommentRequest, AddCommentResponse>(
  { expose: true, method: "POST", path: "/collaboration/comment" },
  async (req) => {
    if (!req.comment || req.comment.trim().length === 0) {
      throw APIError.invalidArgument("Comment is required");
    }

    if (req.comment.length > 500) {
      throw APIError.invalidArgument("Comment must be less than 500 characters");
    }

    try {
      // Verify feed item exists
      const feedItem = await musicDB.queryRow<{ id: number; collaboration_id: number }>`
        SELECT id, collaboration_id 
        FROM collaboration_feed 
        WHERE id = ${req.feedItemId}
      `;

      if (!feedItem) {
        throw APIError.notFound("Feed item not found");
      }

      // Add comment
      const result = await musicDB.queryRow<{
        id: number;
        comment: string;
        user_name: string;
        created_at: Date;
      }>`
        INSERT INTO collaboration_comments (
          feed_item_id,
          user_name,
          comment,
          timestamp,
          created_at
        )
        VALUES (
          ${req.feedItemId},
          ${'Anonymous'}, -- TODO: Get from auth
          ${req.comment},
          ${req.timestamp || null},
          NOW()
        )
        RETURNING id, comment, user_name, created_at
      `;

      if (!result) {
        throw APIError.internal("Failed to add comment");
      }

      log.info("Comment added", {
        feedItemId: req.feedItemId,
        commentId: result.id,
        hasTimestamp: !!req.timestamp
      });

      return {
        id: result.id,
        comment: result.comment,
        userName: result.user_name,
        createdAt: result.created_at
      };

    } catch (error) {
      log.error("Failed to add comment", { error: error.message, request: req });
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to add comment");
    }
  }
);

// Creates a remix challenge
export const createRemixChallenge = api<CreateRemixChallengeRequest, CreateRemixChallengeResponse>(
  { expose: true, method: "POST", path: "/collaboration/remix-challenge" },
  async (req) => {
    if (!req.name || req.name.trim().length === 0) {
      throw APIError.invalidArgument("Challenge name is required");
    }

    if (!req.description || req.description.trim().length === 0) {
      throw APIError.invalidArgument("Challenge description is required");
    }

    if (req.duration < 1 || req.duration > 30) {
      throw APIError.invalidArgument("Challenge duration must be between 1 and 30 days");
    }

    try {
      // Verify source track exists
      const sourceTrack = await musicDB.queryRow<{ id: number }>`
        SELECT id FROM generated_tracks WHERE id = ${req.sourceTrackId}
      `;

      if (!sourceTrack) {
        throw APIError.notFound("Source track not found");
      }

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + req.duration);

      const result = await musicDB.queryRow<{
        id: number;
        name: string;
        end_date: Date;
      }>`
        INSERT INTO remix_challenges (
          name,
          description,
          source_track_id,
          end_date,
          prizes,
          rules,
          created_at
        )
        VALUES (
          ${req.name},
          ${req.description},
          ${req.sourceTrackId},
          ${endDate},
          ${req.prizes || []},
          ${req.rules || []},
          NOW()
        )
        RETURNING id, name, end_date
      `;

      if (!result) {
        throw APIError.internal("Failed to create remix challenge");
      }

      log.info("Remix challenge created", {
        id: result.id,
        name: result.name,
        duration: req.duration,
        sourceTrackId: req.sourceTrackId
      });

      return {
        id: result.id,
        name: result.name,
        endDate: result.end_date,
        participantCount: 0
      };

    } catch (error) {
      log.error("Failed to create remix challenge", { error: error.message, request: req });
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to create remix challenge");
    }
  }
);

// Submits a remix to a challenge
export const submitRemix = api<SubmitRemixRequest, SubmitRemixResponse>(
  { expose: true, method: "POST", path: "/collaboration/remix-challenge/submit" },
  async (req) => {
    if (!req.title || req.title.trim().length === 0) {
      throw APIError.invalidArgument("Remix title is required");
    }

    if (req.title.length > 200) {
      throw APIError.invalidArgument("Remix title must be less than 200 characters");
    }

    try {
      // Verify challenge exists and is active
      const challenge = await musicDB.queryRow<{
        id: number;
        end_date: Date;
        is_active: boolean;
      }>`
        SELECT id, end_date, is_active 
        FROM remix_challenges 
        WHERE id = ${req.challengeId}
      `;

      if (!challenge) {
        throw APIError.notFound("Remix challenge not found");
      }

      if (!challenge.is_active) {
        throw APIError.failedPrecondition("This remix challenge is no longer active");
      }

      if (new Date() > challenge.end_date) {
        throw APIError.failedPrecondition("This remix challenge has ended");
      }

      // Verify track exists
      const track = await musicDB.queryRow<{ id: number }>`
        SELECT id FROM generated_tracks WHERE id = ${req.trackId}
      `;

      if (!track) {
        throw APIError.notFound("Track not found");
      }

      // Get current submission count for position
      const positionResult = await musicDB.queryRow<{ count: number }>`
        SELECT COUNT(*) as count 
        FROM remix_submissions 
        WHERE challenge_id = ${req.challengeId}
      `;

      const position = (positionResult?.count || 0) + 1;

      // Submit remix
      const result = await musicDB.queryRow<{
        id: number;
        challenge_id: number;
        submitted_at: Date;
      }>`
        INSERT INTO remix_submissions (
          challenge_id,
          track_id,
          title,
          description,
          user_name,
          position,
          submitted_at
        )
        VALUES (
          ${req.challengeId},
          ${req.trackId},
          ${req.title},
          ${req.description || null},
          ${'Anonymous'}, -- TODO: Get from auth
          ${position},
          NOW()
        )
        RETURNING id, challenge_id, submitted_at
      `;

      if (!result) {
        throw APIError.internal("Failed to submit remix");
      }

      log.info("Remix submitted", {
        challengeId: req.challengeId,
        submissionId: result.id,
        position,
        trackId: req.trackId
      });

      return {
        id: result.id,
        challengeId: result.challenge_id,
        submittedAt: result.submitted_at,
        position
      };

    } catch (error) {
      log.error("Failed to submit remix", { error: error.message, request: req });
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Failed to submit remix");
    }
  }
);

// Helper function to generate invite codes
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
