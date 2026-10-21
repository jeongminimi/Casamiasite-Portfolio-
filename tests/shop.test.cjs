const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const source = fs.readFileSync(require.resolve("../js/shop.js"), "utf8");
const KEY = "casamia.shop.v1";

function setup(initial = null) {
  let saved = initial;
  let blocked = false;
  const listeners = {};
  const context = {
    document: {
      addEventListener(name, handler) { listeners[name] = handler; },
      querySelectorAll() { return []; },
      getElementById() { return null; }
    },
    localStorage: {
      getItem() { return saved; },
      setItem(key, value) { assert.equal(key, KEY); if (blocked) throw Error("quota"); saved = value; }
    },
    window: { addEventListener() {} },
    setTimeout, clearTimeout
  };
  vm.runInNewContext(source, context);
  return {
    shop: context.window.Shop,
    get state() { return JSON.parse(saved); },
    block() { blocked = true; },
    wish(id) { listeners.click({ target: { closest(selector) { return selector === "[data-wish-id]" ? { dataset: { wishId: id } } : null; } }, preventDefault() {}, stopPropagation() {} }); }
  };
}
const product = { id: "reno-3", name: "리노 3인소파", image: "img/sub/main1.avif", price: 1160000 };

const session = setup();
assert.equal(session.shop.addToCart(product, "ivory", 2), true);
assert.equal(session.shop.addToCart(product, "ivory", 3), true);
assert.equal(session.state.cart.length, 1);
assert.equal(session.state.cart[0].quantity, 5);
assert.equal(session.shop.addToCart(product, "gray", 1), true);
assert.equal(session.state.cart.length, 2);
assert.equal(session.state.cart.reduce((sum, row) => sum + row.price * row.quantity, 0), 6960000);
for (const value of [0, -1, 1.5, 100, NaN, Infinity]) {
  assert.equal(session.shop.addToCart(product, "ivory", value), false);
}
assert.equal(session.shop.addToCart(product, "ivory", 95), false);
assert.equal(session.state.cart[0].quantity, 5);
session.shop.register(product);
session.wish(product.id);
assert.equal(session.state.wishes.length, 1);
session.wish(product.id);
assert.equal(session.state.wishes.length, 0);

// A fresh page instance restores saved cart rows and merges the same option.
const restored = setup(JSON.stringify(session.state));
assert.equal(restored.shop.addToCart(product, "ivory", 1), true);
assert.equal(restored.state.cart[0].quantity, 6);
assert.equal(restored.state.cart.length, 2);

// Malformed browser storage must not crash or enter total calculations.
const corrupt = setup("{invalid json");
assert.equal(corrupt.shop.addToCart(product, "ivory", 1), true);
assert.equal(corrupt.state.cart.length, 1);
const invalidRows = setup(JSON.stringify({ wishes: [null], cart: [{ ...product, key: "bad", option: "gray", quantity: -1 }] }));
invalidRows.shop.addToCart(product, "ivory", 1);
assert.equal(invalidRows.state.cart.length, 1);
assert.equal(invalidRows.state.wishes.length, 0);

// A failed storage write returns failure and leaves persisted data untouched.
const denied = setup();
denied.block();
assert.equal(denied.shop.addToCart(product, "ivory", 1), false);
assert.equal(denied.state, null);
// Checkout must reject stale prices/quantities and keep the latest cart intact.
const checkout = setup();
checkout.shop.addToCart(product, "ivory", 1);
checkout.shop.register(product);
checkout.wish(product.id);
const stale = checkout.shop.getCart();
checkout.shop.addToCart(product, "gray", 1);
assert.equal(checkout.shop.completeDemoOrder(stale).reason, "cart_changed");
assert.equal(checkout.state.cart.length, 2);
const current = checkout.shop.getCart();
current[0].price = 1;
assert.equal(checkout.shop.completeDemoOrder(current).reason, "cart_changed");
assert.equal(checkout.state.cart[0].price, 1160000);
const receipt = checkout.shop.completeDemoOrder(checkout.shop.getCart(), "easy");
assert.equal(receipt.ok, true);
assert.equal(receipt.order.payment, "easy");
assert.equal(receipt.order.total, 2320000);
assert.equal(checkout.shop.getOrders().length, 1);
assert.equal(setup(JSON.stringify(checkout.state)).shop.getOrders()[0].id, receipt.order.id);
assert.equal(checkout.shop.getOrders()[0].items.length, 2);
assert.equal(JSON.stringify(checkout.state).includes("recipient"), false);
assert.equal(checkout.state.cart.length, 0);
assert.equal(checkout.state.wishes.length, 1);
assert.equal(checkout.shop.completeDemoOrder([]).reason, "empty_cart");

const checkoutDenied = setup();
checkoutDenied.shop.addToCart(product, "ivory", 2);
const before = checkoutDenied.shop.getCart();
checkoutDenied.block();
assert.equal(checkoutDenied.shop.completeDemoOrder(before).reason, "storage_failed");
assert.equal(checkoutDenied.state.cart[0].quantity, 2);
assert.equal(checkoutDenied.shop.getOrders().length, 0);
console.log("PASS: cart, wishes, persistence, validation, checkout snapshot, order history, completion and storage failure");
