document.addEventListener("DOMContentLoaded", async () => {
  const $ = id => document.getElementById(id);
  const input = $("catalogQuery"), resultCount = $("resultCount"), criteriaList = $("criteriaList");
  const notice = $("searchNotice"), answerPreview = $("answerPreviewText"), results = $("productResults"), empty = $("emptyResults");
  const categories = [
    { value: "소파", terms: ["소파", "쇼파"] }, { value: "식탁", terms: ["식탁", "다이닝", "테이블"] },
    { value: "침대", terms: ["침대"] }, { value: "쿠션", terms: ["쿠션"] }
  ];
  const colors = [{ value: "아이보리", terms: ["아이보리", "ivory"] }, { value: "브라운", terms: ["브라운", "brown"] }];
  const stopWords = new Set(["추천", "추천해", "추천해줘", "추천해주세요", "찾아줘", "찾아주세요", "보여줘", "보여주세요", "알려줘", "알려주세요", "상품", "제품", "가구", "원하는", "주세요", "거실", "거실에", "침실", "침실에", "주방", "주방에", "만원", "만", "원", "이하", "이내", "아래", "미만", "이상", "초과", "넘는"]);

  const adaptProduct = raw => ({
    id: raw.id, name: raw.name, brand: raw.brand, category: raw.category,
    priceKrw: raw.price_krw, image: raw.image,
    productUrl: `product.html?id=${encodeURIComponent(raw.id)}`,
    description: raw.description || "", ragEnabled: raw.rag_enabled,
    attributes: raw.attributes || {}, source: raw.source || {},
  });
  function parsePrice(query) {
    const match = query.match(/([\d,]+(?:\.\d+)?)\s*(만원|만\s*원|만|원)\s*(이하|이내|아래|미만|이상|초과|넘는)?/i);
    if (!match) return null;
    const value = Number(match[1].replace(/,/g, ""));
    const amount = Math.round(value * (/^만/.test(match[2].replace(/\s/g, "")) ? 10000 : 1));
    const direction = match[3] || "이하";
    return { amount, direction, isLower: ["이상", "초과", "넘는"].includes(direction) };
  }
  function parseQuery(query) {
    const normalized = query.toLowerCase();
    const category = categories.find(group => group.terms.some(term => normalized.includes(term)))?.value || null;
    const color = colors.find(group => group.terms.some(term => normalized.includes(term)))?.value || null;
    const seat = normalized.match(/([1-6])\s*인/), price = parsePrice(normalized);
    const room = /거실|리빙/.test(normalized) ? "거실" : /침실|안방/.test(normalized) ? "침실" : /주방|다이닝/.test(normalized) ? "다이닝" : null;
    let remainder = normalized.replace(/[\d,]+(?:\.\d+)?\s*(?:만원|만\s*원|만|원)\s*(?:이하|이내|아래|미만|이상|초과|넘는)?/gi, " ").replace(/[1-6]\s*인/g, " ");
    for (const group of categories) for (const term of group.terms) remainder = remainder.replaceAll(term, " ");
    for (const group of colors) for (const term of group.terms) remainder = remainder.replaceAll(term, " ");
    remainder = remainder.replace(/거실|리빙|침실|안방|주방|다이닝/g, " ");
    const keywords = remainder.split(/[^\p{L}\p{N}]+/u).filter(word => word.length > 1 && !stopWords.has(word));
    return { category, color, seatCount: seat ? Number(seat[1]) : null, room, price, keywords };
  }
  function labelForPrice(price) {
    const amount = price.amount >= 10000 && price.amount % 10000 === 0 ? `${price.amount / 10000}만원` : `${price.amount.toLocaleString("ko-KR")}원`;
    return `${amount} ${price.direction}`;
  }
  function renderCriteria(criteria, hasQuery) {
    criteriaList.replaceChildren();
    const labels = [];
    if (criteria.category) labels.push(`분류: ${criteria.category}`);
    if (criteria.seatCount) labels.push(`좌석: ${criteria.seatCount}인`);
    if (criteria.color) labels.push(`색상: ${criteria.color}`);
    if (criteria.room) labels.push(`공간: ${criteria.room}`);
    if (criteria.price) labels.push(`예산: ${labelForPrice(criteria.price)}`);
    criteria.keywords.forEach(word => labels.push(`검색어: ${word}`));
    if (!hasQuery) labels.push("등록 상품 전체");
    labels.forEach(label => { const chip = document.createElement("span"); chip.className = "criteria-chip"; chip.textContent = label; criteriaList.append(chip); });
    notice.hidden = true;
  }
  function matchesAttributes(product, criteria) {
    const attributes = product.attributes || {};
    if (criteria.color && attributes.color !== criteria.color) return false;
    if (criteria.seatCount && Number(attributes.seatCount) !== criteria.seatCount) return false;
    if (criteria.room) {
      const rooms = [attributes.room, attributes.recommendedRoom].flat().filter(Boolean).join(" ");
      if (!rooms.includes(criteria.room)) return false;
    }
    if (criteria.keywords.length) {
      const text = [product.name, product.brand, product.category, product.description, ...Object.values(attributes).flat()].filter(Boolean).join(" ").toLowerCase();
      if (!criteria.keywords.every(keyword => text.includes(keyword))) return false;
    }
    return true;
  }
  function createProductCard(product, criteria = null) {
    const link = document.createElement("a"); link.className = "search-product-card"; link.href = product.productUrl;
    const frame = document.createElement("div"); frame.className = "search-product-image";
    const image = document.createElement("img"); image.src = product.image; image.alt = product.name; image.loading = "lazy"; frame.append(image);
    const info = document.createElement("div"); info.className = "search-product-info";
    const brand = document.createElement("p"); brand.className = "search-product-brand"; brand.textContent = product.brand;
    const name = document.createElement("h3"); name.className = "search-product-name"; name.textContent = product.name;
    const category = document.createElement("p"); category.className = "search-product-category"; category.textContent = product.category;
    const price = document.createElement("p"); price.className = "search-product-price"; price.textContent = `${product.priceKrw.toLocaleString("ko-KR")}원`;
    const facts = document.createElement("div"); facts.className = "search-product-facts";
    [product.attributes.seatCount ? `${product.attributes.seatCount}인` : null, product.attributes.color, product.attributes.material].filter(Boolean).forEach(value => { const fact = document.createElement("span"); fact.textContent = value; facts.append(fact); });
    info.append(brand, name, category, price, facts);
    if (criteria) {
      const evidence = document.createElement("section"); evidence.className = "search-evidence";
      const heading = document.createElement("h4"); heading.textContent = "API 검색 조건";
      const list = document.createElement("ul");
      const rows = [criteria.category && `상품 분류: ${product.category}`, criteria.seatCount && `좌석 수: ${product.attributes.seatCount}인`, criteria.color && `등록 색상: ${product.attributes.color}`, criteria.price && `표시 가격: ${product.priceKrw.toLocaleString("ko-KR")}원`].filter(Boolean);
      if (!rows.length) rows.push("PostgreSQL 상품 API 조회 결과");
      rows.forEach(value => { const item = document.createElement("li"); item.textContent = value; list.append(item); });
      const source = document.createElement("p"); source.className = "search-source"; source.textContent = product.source.file ? `출처: ${product.source.file} ${product.source.pointer || ""}` : "출처: PostgreSQL products 테이블";
      evidence.append(heading, list, source); info.append(evidence);
    }
    link.append(frame, info); return link;
  }
  function renderProducts(products, criteria) {
    results.replaceChildren(...products.map(product => createProductCard(product, criteria)));
    empty.hidden = products.length > 0; resultCount.textContent = `${products.length}개 상품`;
  }
  async function search(query) {
    input.value = query;
    const criteria = parseQuery(query), hasQuery = Boolean(query);
    renderCriteria(criteria, hasQuery);
    const params = new URLSearchParams();
    if (criteria.category) params.set("category", criteria.category);
    if (criteria.price) {
      if (criteria.price.isLower) params.set("min_price", String(criteria.price.amount + (criteria.price.direction === "이상" ? 0 : 1)));
      else params.set("max_price", String(criteria.price.amount - (criteria.price.direction === "미만" ? 1 : 0)));
    }
    if (criteria.keywords.length) params.set("q", criteria.keywords[0]);
    try {
      const path = params.size ? `/products/search?${params}` : "/products";
      const products = (await CasamiaApi.get(path)).map(adaptProduct).filter(product => matchesAttributes(product, criteria));
      answerPreview.textContent = hasQuery ? `PostgreSQL 상품 API에서 입력 조건에 맞는 ${products.length}개 상품을 찾았습니다.` : `PostgreSQL 상품 API에 등록된 ${products.length}개 상품을 보여줍니다.`;
      renderProducts(products, criteria);
    } catch (error) {
      resultCount.textContent = ""; results.replaceChildren(); empty.hidden = false;
      answerPreview.textContent = error.message; empty.querySelector("h3").textContent = "상품 정보를 불러오지 못했습니다.";
    }
  }

  $("catalogSearchForm").addEventListener("submit", event => { event.preventDefault(); const query = input.value.trim(); history.replaceState(null, "", query ? `search.html?q=${encodeURIComponent(query)}` : "search.html"); search(query); });
  document.querySelectorAll("[data-query]").forEach(button => button.addEventListener("click", () => { const query = button.dataset.query; history.replaceState(null, "", `search.html?q=${encodeURIComponent(query)}`); search(query); }));

  $("aiQuestionForm").addEventListener("submit", async event => {
    event.preventDefault();
    const message = $("aiQuestion").value.trim(), button = $("aiAskButton"), status = $("aiStatus");
    if (!message) return;
    button.disabled = true; button.textContent = "답변 생성 중..."; status.hidden = false; status.textContent = "상품 DB와 벡터 검색 결과를 확인하고 있습니다.";
    $("aiAnswer").hidden = true; $("aiProducts").replaceChildren(); $("aiSources").hidden = true;
    try {
      const response = await CasamiaApi.post("/chat", { message });
      $("aiAnswer").textContent = response.answer; $("aiAnswer").hidden = false;
      const details = await Promise.all(response.products.map(async item => {
        try { return adaptProduct(await CasamiaApi.get(`/products/${encodeURIComponent(item.id)}`)); }
        catch { return { ...item, priceKrw: item.price_krw, brand: "까사미아", category: "추천 상품", image: "", productUrl: `product.html?id=${encodeURIComponent(item.id)}`, attributes: {} }; }
      }));
      $("aiProducts").replaceChildren(...details.map(product => createProductCard(product)));
      const list = $("aiSources").querySelector("ul"); list.replaceChildren(...response.sources.map(source => { const item = document.createElement("li"); item.textContent = `${source.product_id} · 유사도 ${source.similarity.toFixed(3)}`; return item; }));
      $("aiSources").hidden = !response.sources.length; status.hidden = true;
    } catch (error) {
      status.hidden = false; status.textContent = error.message;
    } finally { button.disabled = false; button.textContent = "AI에게 물어보기"; }
  });


  let visionPreviewUrl = "";
  $("visionImage").addEventListener("change", () => {
    const file = $("visionImage").files[0];
    if (visionPreviewUrl) URL.revokeObjectURL(visionPreviewUrl);
    visionPreviewUrl = "";
    $("visionPreview").hidden = true;
    if (!file) return;
    visionPreviewUrl = URL.createObjectURL(file);
    $("visionPreview").src = visionPreviewUrl;
    $("visionPreview").hidden = false;
  });

  $("visionForm").addEventListener("submit", async event => {
    event.preventDefault();
    const file = $("visionImage").files[0];
    const button = $("visionSubmitButton");
    const status = $("visionStatus");
    const detections = $("visionDetections");
    const products = $("visionProducts");
    detections.replaceChildren();
    products.replaceChildren();
    if (!file) return;

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type)) {
      status.hidden = false;
      status.textContent = "JPG, PNG, WEBP 이미지만 업로드할 수 있습니다.";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      status.hidden = false;
      status.textContent = "이미지 파일은 10MB 이하만 업로드할 수 있습니다.";
      return;
    }

    button.disabled = true;
    button.textContent = "분석 중...";
    status.hidden = false;
    status.textContent = "YOLO11이 이미지 속 가구를 확인하고 있습니다.";
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await CasamiaApi.post("/vision/detect", formData);
      if (!response.detections.length) {
        status.textContent = "지원되는 가구를 찾지 못했습니다. 소파, 의자, 식탁, 침대가 잘 보이는 사진을 사용해 주세요.";
        return;
      }

      const uniqueDetections = [];
      const seen = new Set();
      response.detections.forEach(item => {
        const key = item.label + ":" + item.category;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueDetections.push(item);
        }
      });
      detections.replaceChildren(...uniqueDetections.map(item => {
        const chip = document.createElement("span");
        chip.className = "vision-detection";
        chip.textContent = item.category + " · " + item.label + " · " + (item.confidence * 100).toFixed(1) + "%";
        return chip;
      }));

      const detectedCategories = [...new Set(uniqueDetections.map(item => item.category))];
      status.textContent = "사진에서 " + detectedCategories.join(", ") + " 카테고리를 발견했습니다.";
      const adapted = response.products.map(adaptProduct);
      products.replaceChildren(...adapted.map(product => createProductCard(product)));
      if (!adapted.length) status.textContent += " 현재 DB에는 연결할 상품이 없습니다.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
      button.textContent = "가구 분석하기";
    }
  });

  const initialQuery = new URLSearchParams(location.search).get("q")?.trim() || "";
  await search(initialQuery);
});
