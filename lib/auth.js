const { readJSON } = require('./store');

// Demo-only auth: plain-text password match against officers.json, no
// hashing, no sessions/JWT. Fine for a local prototype demo — swap for
// bcrypt + JWT/sessions before this ever touches real data.
function login(id, password) {
  const officers = readJSON('officers.json');
  const officer = officers.find(o => o.id === id && o.password === password);
  if (!officer) return null;
  const { password: _pw, ...safe } = officer;
  return safe;
}

module.exports = { login };
