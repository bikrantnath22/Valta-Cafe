// controllers/analytics.controller.js — dashboard overview metrics (staff only).
import Order from '../models/Order.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** A window facet: total orders placed, and revenue excluding cancelled orders. */
const windowFacet = (since) => [
  { $match: { createdAt: { $gte: since } } },
  {
    $group: {
      _id: null,
      orders: { $sum: 1 },
      revenue: {
        $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 0, '$totalAmount'] },
      },
    },
  },
];

/** Pull the single row out of a window facet (or zeros if the window is empty). */
function pickWindow(arr) {
  const row = Array.isArray(arr) && arr[0];
  return { orders: row?.orders || 0, revenue: row?.revenue || 0 };
}

/**
 * GET /api/analytics/overview (staff)
 * - orders + revenue for today / last 7 days / last 30 days
 * - top-selling items (last 30 days, by quantity)
 * - order status breakdown (last 30 days)
 * Revenue excludes cancelled orders.
 */
export async function getOverview(req, res, next) {
  try {
    const now = new Date();

    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const start7 = new Date(now.getTime() - 7 * DAY_MS);
    const start30 = new Date(now.getTime() - 30 * DAY_MS);

    const [result] = await Order.aggregate([
      {
        $facet: {
          today: windowFacet(startToday),
          week: windowFacet(start7),
          month: windowFacet(start30),
          statusBreakdown: [
            { $match: { createdAt: { $gte: start30 } } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ],
          topItems: [
            { $match: { createdAt: { $gte: start30 } } },
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.name',
                quantity: { $sum: '$items.quantity' },
                revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
              },
            },
            { $sort: { quantity: -1 } },
            { $limit: 5 },
          ],
        },
      },
    ]);

    const analytics = {
      today: pickWindow(result?.today),
      week: pickWindow(result?.week),
      month: pickWindow(result?.month),
      statusBreakdown: (result?.statusBreakdown || []).map((r) => ({
        status: r._id,
        count: r.count,
      })),
      topItems: (result?.topItems || []).map((r) => ({
        name: r._id,
        quantity: r.quantity,
        revenue: r.revenue,
      })),
      generatedAt: now.toISOString(),
    };

    res.json({ status: 'ok', analytics });
  } catch (err) {
    next(err);
  }
}
