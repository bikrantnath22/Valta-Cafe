// utils/audit.js — simple logger for sensitive admin actions
export function logAudit(req, action, details) {
  const actor = req.user ? `${req.user.name} (${req.user.email})` : 'System';
  const timestamp = new Date().toISOString();
  
  // In a real application, you might write this to a MongoDB AuditLog collection 
  // or use a structured logger like Winston.
  console.info(`[AUDIT] ${timestamp} | Actor: ${actor} | Action: ${action} | Details: ${JSON.stringify(details)}`);
}
