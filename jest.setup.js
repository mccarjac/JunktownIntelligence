// The suites in this repository are pure logic — the Afterworlds ruleset
// transform and the derived-stat parity numbers. They import the engine for
// its computation, not its screens, so none of the React Native module mocks
// the engine's own suite needs are required here.
//
// Silence the expected `__DEV__` warnings the engine emits when something
// runs before `configureLore` (these tests pass a ruleset explicitly).
global.__DEV__ = false;
