const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync(require.resolve("../js/account.js"), "utf8");

function setup() {
  let token = "";
  let user = null;
  const calls = [];
  const api = {
    getToken: () => token,
    getCachedUser: () => user,
    updateCachedUser: value => { user = value; },
    setSession: (value, profile) => { token = value; user = profile; },
    clearSession: () => { token = ""; user = null; },
    async get(path) {
      calls.push(["GET", path]);
      if (path === "/users/me" && token === "valid-token") {
        return { id: 1, email: "user@example.com", name: "테스트 사용자", role: "USER", is_active: true };
      }
      throw { status: 401, message: "Unauthorized" };
    },
    async post(path, body) {
      calls.push(["POST", path, body]);
      if (path === "/auth/login") {
        if (body.email === "user@example.com" && body.password === "Password123!") {
          return { access_token: "valid-token", token_type: "bearer" };
        }
        throw { status: 401, message: "Unauthorized" };
      }
      if (path === "/auth/register") {
        if (body.email === "existing@example.com") throw { status: 409, message: "Conflict" };
        return { id: 1, email: body.email, name: body.name, role: "USER", is_active: true };
      }
      throw { status: 404, message: "Not found" };
    },
  };
  const context = {
    document: { addEventListener() {}, querySelectorAll() { return []; } },
    window: {
      CasamiaApi: api,
      addEventListener() {},
      dispatchEvent() {},
    },
  };
  vm.runInNewContext(source, context);
  return { account: context.window.Account, calls, state: () => ({ token, user }) };
}

(async () => {
  const session = setup();
  assert.equal(session.account.getUser(), null);

  const denied = await session.account.login("user@example.com", "wrong");
  assert.equal(denied.ok, false);
  assert.equal(denied.status, 401);
  assert.equal(session.state().token, "");

  const loggedIn = await session.account.login(" user@example.com ", "Password123!");
  assert.equal(loggedIn.ok, true);
  assert.equal(loggedIn.user.role, "USER");
  assert.equal(session.state().token, "valid-token");
  assert.equal(session.account.getUser().email, "user@example.com");

  assert.equal(session.account.logout().ok, true);
  assert.equal(session.account.getUser(), null);

  const registered = await session.account.register("user@example.com", "Password123!", " 테스트 사용자 ");
  assert.equal(registered.ok, true);
  assert.equal(session.account.getUser().name, "테스트 사용자");

  const conflict = await session.account.register("existing@example.com", "Password123!", "기존 사용자");
  assert.equal(conflict.ok, false);
  assert.equal(conflict.status, 409);
  assert.ok(session.calls.some(([method, path]) => method === "GET" && path === "/users/me"));
  assert.ok(session.calls.some(([method, path]) => method === "POST" && path === "/auth/register"));
  console.log("PASS: JWT login, current-user refresh, registration, conflict handling, and logout");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
