import PushSubscription from '../models/PushSubscription.js';

/**
 * POST /api/push/subscribe
 * Save a new PushSubscription for the current user.
 */
export async function subscribe(req, res) {
  try {
    const { subscription } = req.body;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ status: 'error', message: 'Invalid subscription object' });
    }

    // Upsert the subscription (prevents exact duplicates)
    await PushSubscription.findOneAndUpdate(
      { userId: req.user._id, 'subscription.endpoint': subscription.endpoint },
      { userId: req.user._id, role: req.user.role, subscription },
      { upsert: true, new: true }
    );

    res.json({ status: 'ok', message: 'Subscribed to push notifications' });
  } catch (err) {
    console.error('Failed to subscribe to push:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
}

/**
 * DELETE /api/push/subscribe
 * Remove a PushSubscription for the current user.
 */
export async function unsubscribe(req, res) {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ status: 'error', message: 'Missing endpoint' });
    }

    await PushSubscription.deleteOne({ userId: req.user._id, 'subscription.endpoint': endpoint });
    res.json({ status: 'ok', message: 'Unsubscribed from push notifications' });
  } catch (err) {
    console.error('Failed to unsubscribe from push:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
}
