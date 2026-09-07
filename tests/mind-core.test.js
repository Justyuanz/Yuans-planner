const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../frontend/js/mind-core');
const journal = require('../frontend/js/journal-core');

test('sessions include standalone guitar and exclude task-linked time across date ranges', () => {
  const sessions = [
    { finishedAt: '2026-09-07T12:00:00Z', dateKey: '2026-09-07', durationHours: .5 },
    { finishedAt: '2026-09-07T12:00:00Z', dateKey: '2026-09-07', durationHours: 1, trackedInTask: true },
    { finishedAt: '2026-09-06T12:00:00Z', dateKey: '2026-09-06', durationHours: 2 },
    { finishedAt: '2026-09-07T12:00:00Z', durationHours: -1 }
  ];
  assert.equal(core.sessionHours(sessions, '2026-09-07', '2026-09-07'), .5);
  assert.equal(core.sessionHours(sessions), 2.5);
});

test('meditation completes once at its deadline, including after reload or suspension', () => {
  const state = { active: { id: 'a', dateKey: '2026-09-07', startedAt: 1000, endsAt: 601000, minutes: 10 }, sessions: [] };
  assert.equal(core.finishMeditation(state, 600999), state);
  const finished = core.finishMeditation(JSON.parse(JSON.stringify(state)), 90000000);
  assert.equal(finished.active, null);
  assert.equal(finished.sessions.length, 1);
  assert.equal(finished.sessions[0].durationHours, 1 / 6);
  assert.equal(finished.sessions[0].dateKey, '2026-09-07');
  assert.equal(core.finishMeditation(finished, 90000001), finished);
});

test('journal minutes survive normalization and edits; old entries do not invent time', () => {
  const entry = { date: '2026-09-07', content: '', durationMinutes: 15 };
  assert.equal(journal.normalizeEntries([entry])[0].durationMinutes, 15);
  assert.equal(journal.normalizeEntries([{ ...entry, title: 'Edited' }])[0].durationMinutes, 15);
  assert.equal(journal.normalizeEntries([{ date: entry.date, content: 'Old entry' }])[0].durationMinutes, 0);
  assert.equal(core.minutes(Infinity), 0);
  assert.equal(core.minutes(-1), 0);
});
