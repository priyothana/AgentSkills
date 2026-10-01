'use strict';

// Renders the members page controls for the signed-in user.
function memberControls(user) {
  const controls = ['list'];
  if (user.role === 'admin' || user.role === 'owner') controls.push('invite');
  return controls;
}

module.exports = { memberControls };
