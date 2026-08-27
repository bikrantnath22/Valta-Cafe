// src/components/customer/OrderStatusStepper.jsx — vertical progress tracker
// for an order's lifecycle (pending → … → delivered), with a distinct terminal
// state for cancelled orders. Timestamps come from the order's statusHistory.
import { STATUS_FLOW, STATUS_LABELS, STATUS_HINTS, statusLabel, statusHint } from '../../lib/orderStatus.js';

function fmtTime(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function OrderStatusStepper({ status, statusHistory = [], fulfillmentMethod = 'delivery' }) {
  // Latest timestamp seen for each status.
  const timeByStatus = {};
  for (const entry of statusHistory) {
    if (entry?.status) timeByStatus[entry.status] = entry.timestamp;
  }

  if (status === 'cancelled') {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
        <div className="flex items-center gap-2 text-rose-700">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-sm text-white">
            ✕
          </span>
          <span className="font-semibold">{statusLabel('cancelled', fulfillmentMethod)}</span>
        </div>
        <p className="mt-2 text-sm text-rose-600">{statusHint('cancelled', fulfillmentMethod)}</p>
        {timeByStatus.cancelled && (
          <p className="mt-1 text-xs text-rose-400">{fmtTime(timeByStatus.cancelled)}</p>
        )}
      </div>
    );
  }

  const currentIndex = STATUS_FLOW.indexOf(status);

  return (
    <ol className="relative">
      {STATUS_FLOW.map((step, idx) => {
        const done = idx < currentIndex;
        const current = idx === currentIndex;
        const upcoming = idx > currentIndex;
        const isLast = idx === STATUS_FLOW.length - 1;

        return (
          <li key={step} className="relative flex gap-3 pb-6 last:pb-0">
            {/* connector line */}
            {!isLast && (
              <span
                className={`absolute left-[13px] top-7 h-full w-0.5 ${
                  done ? 'bg-amber-500' : 'bg-stone-200'
                }`}
                aria-hidden="true"
              />
            )}

            {/* node */}
            <span
              className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                done
                  ? 'bg-amber-500 text-white'
                  : current
                    ? 'bg-amber-600 text-white ring-4 ring-amber-200'
                    : 'bg-stone-200 text-stone-400'
              }`}
            >
              {done ? '✓' : idx + 1}
            </span>

            <div className={`pt-0.5 ${upcoming ? 'opacity-50' : ''}`}>
              <p
                className={`text-sm font-semibold ${
                  current ? 'text-amber-700' : done ? 'text-stone-800' : 'text-stone-500'
                }`}
              >
                {statusLabel(step, fulfillmentMethod)}
              </p>
              {(done || current) && (
                <p className="mt-0.5 text-xs text-stone-500">{statusHint(step, fulfillmentMethod)}</p>
              )}
              {timeByStatus[step] && (
                <p className="mt-0.5 text-[11px] text-stone-400">{fmtTime(timeByStatus[step])}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
