'use strict';

function createDb() {
  return {
    projects: [],
    members: [], // { userId, role }
  };
}

module.exports = { createDb };
