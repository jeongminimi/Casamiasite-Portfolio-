const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require.resolve("../js/account.js"), "utf8");
function setup(initial = null) {
  let saved = initial, blocked = false;
  const context = {
    document: { addEventListener() {}, querySelectorAll() { return []; } },
    window: { addEventListener() {} },
    localStorage: {
      getItem() { return saved; },
      setItem(key, value) { assert.equal(key, "casamia.demo.profile.v1"); if (blocked) throw Error("quota"); saved = value; }
    }
  };
  vm.runInNewContext(source, context);
  return { account: context.window.Account, get saved() { return saved; }, block() { blocked = true; } };
}
const session = setup();
assert.equal(session.account.getUser(), null);
assert.equal(session.account.login("wrong@example.com", "Demo1234!").ok, false);
assert.equal(session.account.login("demo@casamia.example", "wrong").ok, false);
assert.equal(session.saved, null);
assert.equal(session.account.createProfile(" ").ok, false);
assert.equal(session.account.createProfile("a".repeat(21)).ok, false);
assert.equal(session.account.createProfile("  나의공간  ").ok, true);
assert.equal(session.account.getUser().name, "나의공간");
assert.equal(session.account.updateName("새로운공간").ok, true);
assert.equal(setup(session.saved).account.getUser().name, "새로운공간");
assert.equal(session.account.logout().ok, true);
assert.equal(session.account.getUser(), null);
assert.equal(session.account.updateName("로그아웃상태").ok, false);
assert.equal(session.account.login(" DEMO@CASAMIA.EXAMPLE ", "Demo1234!").ok, true);
assert.equal(session.account.getUser().name, "새로운공간");
assert.equal(session.saved.includes("Demo1234!"), false);
assert.deepEqual(Object.keys(JSON.parse(session.saved)).sort(), ["name", "signedIn"]);
const denied = setup(session.saved);
denied.block();
assert.equal(denied.account.logout().ok, false);
assert.equal(denied.account.getUser().name, "새로운공간");
assert.equal(setup("{bad json").account.getUser(), null);
assert.equal(setup(JSON.stringify({ name: "a", signedIn: true })).account.getUser(), null);
console.log("PASS: demo login, invalid credentials, profile validation, persistence, logout, password omission, storage failure");
