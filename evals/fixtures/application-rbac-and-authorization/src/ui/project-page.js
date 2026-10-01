'use strict';

// Renders the project page actions for the signed-in user.
function projectActions(user) {
  const actions = ['view'];
  if (user.role === 'editor' || user.role === 'admin' || user.role === 'owner') actions.push('rename');
  return actions;
}

module.exports = { projectActions };
