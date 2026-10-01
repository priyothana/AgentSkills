'use strict';

const { authorize } = require('./permissions');

function memberService(db) {
  return {
    list(actor) {
      authorize(actor, 'project:read');
      return db.members.map((m) => ({ ...m }));
    },
    invite(actor, userId) {
      authorize(actor, 'member:invite');
      const member = { userId, role: 'viewer' };
      db.members.push(member);
      return { ...member };
    },
  };
}

module.exports = { memberService };
