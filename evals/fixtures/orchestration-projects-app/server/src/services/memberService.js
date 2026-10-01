const memberRepository = require('../repositories/memberRepository');

async function listMembers(orgId) {
  return memberRepository.findAll(orgId);
}

module.exports = { listMembers };
