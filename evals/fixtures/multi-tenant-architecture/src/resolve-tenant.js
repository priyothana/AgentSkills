'use strict';

class NotFoundError extends Error {}

// Resolves the organization for a request from the authenticated user and the
// organization slug in the subdomain, and checks the user is a member.
function resolveOrganization(db, { userId, orgSlug }) {
  const org = db.organizations.find((o) => o.slug === orgSlug && o.active);
  const member = org && db.memberships.some((m) => m.orgId === org.id && m.userId === userId);
  if (!member) throw new NotFoundError('Not found');
  return org.id;
}

module.exports = { resolveOrganization, NotFoundError };
