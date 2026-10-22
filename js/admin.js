document.addEventListener("DOMContentLoaded", async () => {
  const $ = id => document.getElementById(id);
  let products = [], selectedId = null;

  function deny(message) {
    $("adminState").hidden = true;
    $("adminDashboard").hidden = true;
    $("adminDenied").hidden = false;
    $("adminDeniedMessage").textContent = message;
  }
  function renderList(query = "") {
    const normalized = query.trim().toLowerCase();
    const filtered = products.filter(product => !normalized || `${product.name} ${product.id}`.toLowerCase().includes(normalized));
    $("adminProductList").replaceChildren(...filtered.map(product => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "admin-product-item"; button.setAttribute("role", "option");
      button.classList.toggle("active", product.id === selectedId); button.setAttribute("aria-selected", String(product.id === selectedId));
      const name = document.createElement("strong"); name.textContent = product.name;
      const meta = document.createElement("span"); meta.textContent = `${product.category} · ${product.price_krw.toLocaleString("ko-KR")}원 · ${product.id}`;
      button.append(name, meta); button.addEventListener("click", () => selectProduct(product.id)); return button;
    }));
  }
  function selectProduct(id) {
    const product = products.find(item => item.id === id); if (!product) return;
    selectedId = id; $("editorTitle").textContent = product.name; $("adminProductForm").hidden = false;
    $("adminProductId").value = product.id; $("adminName").value = product.name; $("adminBrand").value = product.brand;
    $("adminCategory").value = product.category; $("adminPrice").value = product.price_krw; $("adminDescription").value = product.description || "";
    $("adminAttributes").value = JSON.stringify(product.attributes || {}, null, 2); $("adminRagEnabled").checked = product.rag_enabled;
    $("adminProductLink").href = `product.html?id=${encodeURIComponent(product.id)}`; $("adminFormStatus").textContent = "";
    renderList($("adminProductSearch").value);
  }
  async function loadProducts(preferredId = null) {
    products = await CasamiaApi.get("/products");
    renderList($("adminProductSearch").value);
    if (preferredId && products.some(product => product.id === preferredId)) selectProduct(preferredId);
  }

  try {
    if (!CasamiaApi.getToken()) { deny("ADMIN 계정으로 로그인해 주세요."); return; }
    const user = await CasamiaApi.get("/users/me");
    if (user.role !== "ADMIN") { deny("현재 계정은 USER 권한입니다. 관리자 기능을 사용할 수 없습니다."); return; }
    await CasamiaApi.get("/admin/check");
    $("adminIdentity").textContent = `${user.name} · ${user.email} · ${user.role}`;
    await loadProducts();
    $("adminState").hidden = true; $("adminDashboard").hidden = false;
  } catch (error) {
    deny(error.status === 401 ? "로그인이 만료되었습니다. 다시 로그인해 주세요." : error.message);
    return;
  }

  $("adminProductSearch").addEventListener("input", event => renderList(event.target.value));
  $("adminProductForm").addEventListener("submit", async event => {
    event.preventDefault();
    const submit = event.submitter, status = $("adminFormStatus");
    let attributes;
    try { attributes = JSON.parse($("adminAttributes").value || "{}"); }
    catch { status.className = "error"; status.textContent = "Attributes는 올바른 JSON 형식이어야 합니다."; return; }
    if (!attributes || Array.isArray(attributes) || typeof attributes !== "object") { status.className = "error"; status.textContent = "Attributes에는 JSON 객체를 입력해 주세요."; return; }
    submit.disabled = true; submit.textContent = "저장 중..."; status.className = ""; status.textContent = "상품과 RAG embedding을 갱신하고 있습니다.";
    try {
      const updated = await CasamiaApi.patch(`/admin/products/${encodeURIComponent(selectedId)}`, {
        name: $("adminName").value.trim(), brand: $("adminBrand").value.trim(), category: $("adminCategory").value.trim(),
        price_krw: Number($("adminPrice").value), description: $("adminDescription").value.trim() || null,
        attributes, rag_enabled: $("adminRagEnabled").checked,
      });
      status.textContent = "저장했습니다. 변경된 상품 정보와 RAG embedding이 반영되었습니다.";
      await loadProducts(updated.id);
    } catch (error) {
      status.className = "error"; status.textContent = error.message;
    } finally { submit.disabled = false; submit.textContent = "변경사항 저장"; }
  });
});
