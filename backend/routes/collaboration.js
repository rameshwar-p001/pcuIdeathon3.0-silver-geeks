import express from 'express';
import { db } from '../config/firebaseAdmin.js';

const router = express.Router();

const COLLECTION_NAME = 'collaboration_posts';

function normalizeDoc(item) {
  if (!item) {
    return null;
  }

  if (typeof item.data === 'function') {
    return { id: item.id, ...item.data() };
  }

  return { id: item.id, ...item };
}

router.get('/posts', async (req, res) => {
  try {
    const snapshot = await db.collection(COLLECTION_NAME).get();
    const posts = [];

    if (snapshot?.forEach) {
      snapshot.forEach((docItem) => {
        posts.push(normalizeDoc(docItem));
      });
    } else if (Array.isArray(snapshot?.docs)) {
      snapshot.docs.forEach((docItem) => {
        posts.push(normalizeDoc(docItem));
      });
    }

    posts.sort((a, b) => {
      const aTime = Date.parse(a?.createdAt || '') || 0;
      const bTime = Date.parse(b?.createdAt || '') || 0;
      return bTime - aTime;
    });

    return res.status(200).json({
      success: true,
      data: posts,
      total: posts.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch collaboration posts',
      error: error.message,
    });
  }
});

router.post('/posts', async (req, res) => {
  try {
    const { title, type, description, studentName, studentUid } = req.body;

    if (!title || !type || !description || !studentName) {
      return res.status(400).json({
        success: false,
        message: 'title, type, description, and studentName are required',
      });
    }

    const postId = `post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = {
      title: String(title).trim(),
      type: String(type).trim(),
      description: String(description).trim(),
      studentName: String(studentName).trim(),
      studentUid: studentUid || '',
      createdAt: new Date().toISOString(),
      joinedBy: [],
      joinRequests: [],
    };

    await db.collection(COLLECTION_NAME).doc(postId).set(payload);

    return res.status(201).json({
      success: true,
      message: 'Collaboration post created successfully',
      data: { id: postId, ...payload },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to create collaboration post',
      error: error.message,
    });
  }
});

router.post('/posts/:postId/request', async (req, res) => {
  try {
    const { postId } = req.params;
    const { joinerUid, joinerName, joinerEmail = '', joinerMobile = '' } = req.body;

    if (!joinerUid || !joinerName) {
      return res.status(400).json({
        success: false,
        message: 'joinerUid and joinerName are required',
      });
    }

    const postRef = db.collection(COLLECTION_NAME).doc(postId);
    const postSnapshot = await postRef.get();

    const exists = typeof postSnapshot?.exists === 'function'
      ? postSnapshot.exists()
      : Boolean(postSnapshot?.exists);

    if (!exists) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    const postData = typeof postSnapshot.data === 'function' ? postSnapshot.data() : {};
    const joinedBy = Array.isArray(postData.joinedBy) ? postData.joinedBy : [];
    const joinRequests = Array.isArray(postData.joinRequests) ? postData.joinRequests : [];

    if (postData.studentUid && postData.studentUid === joinerUid) {
      return res.status(400).json({
        success: false,
        message: 'Post owner cannot request to join own post',
      });
    }

    const alreadyJoined = joinedBy.some((entry) => entry.joinerUid === joinerUid);
    if (alreadyJoined) {
      return res.status(200).json({
        success: true,
        message: 'Already a member of this post',
      });
    }

    const existingRequest = joinRequests.some((entry) => entry.joinerUid === joinerUid);
    if (existingRequest) {
      return res.status(200).json({
        success: true,
        message: 'Join request already sent',
      });
    }

    let resolvedEmail = String(joinerEmail || '').trim();
    let resolvedMobile = String(joinerMobile || '').trim();

    try {
      const requesterDoc = await db.collection('users').doc(joinerUid).get();
      const requesterProfile = typeof requesterDoc?.data === 'function' ? requesterDoc.data() : null;
      if (requesterProfile) {
        resolvedEmail = requesterProfile.email || resolvedEmail;
        resolvedMobile = requesterProfile.phone || requesterProfile.mobile || resolvedMobile;
      }
    } catch {
      // Continue with values from request body if profile lookup fails.
    }

    const updatedJoinRequests = [
      ...joinRequests,
      {
        joinerUid,
        joinerName,
        joinerEmail: resolvedEmail,
        joinerMobile: resolvedMobile,
        requestedAt: new Date().toISOString(),
      },
    ];

    await postRef.update({ joinRequests: updatedJoinRequests });

    return res.status(200).json({
      success: true,
      message: 'Join request sent successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to send join request',
      error: error.message,
    });
  }
});

router.post('/posts/:postId/request/cancel', async (req, res) => {
  try {
    const { postId } = req.params;
    const { joinerUid } = req.body;

    if (!joinerUid) {
      return res.status(400).json({
        success: false,
        message: 'joinerUid is required',
      });
    }

    const postRef = db.collection(COLLECTION_NAME).doc(postId);
    const postSnapshot = await postRef.get();

    const exists = typeof postSnapshot?.exists === 'function'
      ? postSnapshot.exists()
      : Boolean(postSnapshot?.exists);

    if (!exists) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    const postData = typeof postSnapshot.data === 'function' ? postSnapshot.data() : {};
    const joinRequests = Array.isArray(postData.joinRequests) ? postData.joinRequests : [];
    const updatedJoinRequests = joinRequests.filter((entry) => entry.joinerUid !== joinerUid);

    await postRef.update({ joinRequests: updatedJoinRequests });

    return res.status(200).json({
      success: true,
      message: 'Join request canceled',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel join request',
      error: error.message,
    });
  }
});

router.post('/posts/:postId/request/:joinerUid/decision', async (req, res) => {
  try {
    const { postId, joinerUid } = req.params;
    const { ownerUid, action } = req.body;

    if (!ownerUid || !action) {
      return res.status(400).json({
        success: false,
        message: 'ownerUid and action are required',
      });
    }

    const normalizedAction = String(action).toLowerCase();
    if (normalizedAction !== 'accept' && normalizedAction !== 'reject') {
      return res.status(400).json({
        success: false,
        message: 'action must be accept or reject',
      });
    }

    const postRef = db.collection(COLLECTION_NAME).doc(postId);
    const postSnapshot = await postRef.get();

    const exists = typeof postSnapshot?.exists === 'function'
      ? postSnapshot.exists()
      : Boolean(postSnapshot?.exists);

    if (!exists) {
      return res.status(404).json({
        success: false,
        message: 'Post not found',
      });
    }

    const postData = typeof postSnapshot.data === 'function' ? postSnapshot.data() : {};
    if (postData.studentUid && postData.studentUid !== ownerUid) {
      return res.status(403).json({
        success: false,
        message: 'Only post owner can take this action',
      });
    }

    const joinRequests = Array.isArray(postData.joinRequests) ? postData.joinRequests : [];
    const joinedBy = Array.isArray(postData.joinedBy) ? postData.joinedBy : [];
    const targetRequest = joinRequests.find((entry) => entry.joinerUid === joinerUid);

    if (!targetRequest) {
      return res.status(404).json({
        success: false,
        message: 'Join request not found',
      });
    }

    const updatedJoinRequests = joinRequests.filter((entry) => entry.joinerUid !== joinerUid);

    if (normalizedAction === 'reject') {
      await postRef.update({ joinRequests: updatedJoinRequests });

      return res.status(200).json({
        success: true,
        message: 'Join request rejected',
      });
    }

    const alreadyJoined = joinedBy.some((entry) => entry.joinerUid === joinerUid);
    const updatedJoinedBy = alreadyJoined
      ? joinedBy
      : [
          ...joinedBy,
          {
            joinerUid: targetRequest.joinerUid,
            joinerName: targetRequest.joinerName,
            joinerEmail: targetRequest.joinerEmail || '',
            joinerMobile: targetRequest.joinerMobile || '',
            joinedAt: new Date().toISOString(),
          },
        ];

    await postRef.update({
      joinRequests: updatedJoinRequests,
      joinedBy: updatedJoinedBy,
    });

    return res.status(200).json({
      success: true,
      message: 'Join request accepted',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to process join request decision',
      error: error.message,
    });
  }
});

export default router;
