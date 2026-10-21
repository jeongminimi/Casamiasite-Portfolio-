document.addEventListener("DOMContentLoaded", async () => {
  const input = document.getElementById("catalogQuery");
  const resultCount = document.getElementById("resultCount");
  const criteriaList = document.getElementById("criteriaList");
  const notice = document.getElementById("searchNotice");
  const answerPreview = document.getElementById("answerPreviewText");
  const results = document.getElementById("productResults");
  const empty = document.getElementById("emptyResults");
  const categories = [
    { value: "소파", terms: ["소파", "쇼파"] },
    { value: "식탁", terms: ["식탁", "다이닝", "테이블"] },
    { value: "침대", terms: ["침대"] },
    { value: "쿠션", terms: ["쿠션"] }
  ];
  const colors = [
    { value: "아이보리", terms: ["아이보리", "ivory"] },
    { value: "브라운", terms: ["브라운", "brown"] }
  ];
  const stopWords = new Set(["추천", "추천해", "추천해줘", "추천해주세요", "찾아줘", "찾아주세요", "보여줘", "보여주세요", "알려줘", "알려주세요", "있나요", "있을까", "해줘", "주세요", "상품", "제품", "가구", "원하는", "싶어요", "살만한", "부탁해", "부탁합니다", "거실", "거실에", "침실", "침실에", "주방", "주방에", "작은", "좁은", "협소한", "공간", "공간에", "집에", "밝은", "밝은색", "어두운", "어두운색", "심플한", "모던한", "내추럴한", "스타일", "느낌", "만원", "만", "원", "이하", "이내", "아래", "미만", "이상", "초과", "넘는", "정도", "정도인", "사이", "이상으로"]);

  function parsePrice(query) {
    const match = query.match(/([\d,]+(?:\.\d+)?)\s*(만원|만\s*원|만|원)\s*(이하|이내|아래|미만|이상|초과|넘는)?/i);
    if (!match) return null;
    const value = Number(match[1].replace(/,/g, ""));
    const amount = Math.round(value * (/^만/.test(match[2].replace(/\s/g, "")) ? 10000 : 1));
    const direction = match[3] || "이하";
    const isLower = ["이상", "초과", "넘는"].includes(direction);
    return { amount, direction, isLower };
  }

  function parseQuery(query) {
    const normalized = query.toLowerCase();
    const category = categories.find(group => group.terms.some(term => normalized.includes(term)))?.value || null;
    const color = colors.find(group => group.terms.some(term => normalized.includes(term)))?.value || null;
    const seat = normalized.match(/([1-6])\s*인/);
    const price = parsePrice(normalized);
    const room = /거실|리빙/.test(normalized) ? "거실" : /침실|안방/.test(normalized) ? "침실" : /주방|다이닝/.test(normalized) ? "다이닝" : null;
    const unsupported = [];
    if (/작은|좁은|협소/.test(normalized)) unsupported.push("상품별 세부 치수가 없어 작은 공간 적합성은 판별할 수 없습니다.");
    if (/밝은색|어두운색|파스텔|웜톤|쿨톤/.test(normalized)) unsupported.push("색감 표현은 등록된 색상값으로 확인되지 않아 정확한 색상 필터에 반영하지 않았습니다.");
    if (/배송|배송일|재고|품절/.test(normalized)) unsupported.push("재고와 배송 정보는 카탈로그에 없어 검색에 반영하지 않았습니다.");

    let remainder = normalized
      .replace(/[\d,]+(?:\.\d+)?\s*(?:만원|만\s*원|만|원)\s*(?:이하|이내|아래|미만|이상|초과|넘는)?/gi, " ")
      .replace(/[1-6]\s*인/g, " ");
    for (const group of categories) for (const term of group.terms) remainder = remainder.replaceAll(term, " ");
    for (const group of colors) for (const term of group.terms) remainder = remainder.replaceAll(term, " ");
    remainder = remainder.replace(/거실|리빙|침실|안방|주방|다이닝/g, " ");
    const keywords = remainder.split(/[^\p{L}\p{N}]+/u).filter(word => word.length > 1 && !stopWords.has(word));

    return { category, color, seatCount: seat ? Number(seat[1]) : null, room, price, keywords, unsupported };
  }

  function matches(product, criteria) {
    if (!product.ragEnabled) return false;
    if (criteria.category && product.category !== criteria.category) return false;
    if (criteria.color && product.attributes.color !== criteria.color) return false;
    if (criteria.seatCount && product.attributes.seatCount !== criteria.seatCount) return false;
    if (criteria.room && !product.attributes.room.includes(criteria.room)) return false;
    if (criteria.price) {
      if (criteria.price.isLower) {
        const passes = criteria.price.direction === "이상" ? product.priceKrw >= criteria.price.amount : product.priceKrw > criteria.price.amount;
        if (!passes) return false;
      } else {
        const passes = criteria.price.direction === "미만" ? product.priceKrw < criteria.price.amount : product.priceKrw <= criteria.price.amount;
        if (!passes) return false;
      }
    }
    if (criteria.keywords.length) {
      const text = [product.name, product.brand, product.category, product.description || "", ...Object.values(product.attributes).flatMap(value => Array.isArray(value) ? value : [value])]
        .filter(Boolean).join(" ").toLowerCase();
      if (!criteria.keywords.every(keyword => text.includes(keyword))) return false;
    }
    return true;
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
    if (!hasQuery) labels.push("추천 가능 상품 전체");
    labels.forEach(label => {
      const chip = document.createElement("span");
      chip.className = "criteria-chip";
      chip.textContent = label;
      criteriaList.append(chip);
    });
    notice.hidden = !criteria.unsupported.length;
    notice.textContent = criteria.unsupported.join(" ");
  }

  function describeCriteria(criteria) {
    const labels = [];
    if (criteria.category) labels.push(`${criteria.category} 분류`);
    if (criteria.seatCount) labels.push(`${criteria.seatCount}인`);
    if (criteria.color) labels.push(`${criteria.color} 색상`);
    if (criteria.room) labels.push(`${criteria.room} 공간`);
    if (criteria.price) labels.push(`${labelForPrice(criteria.price)} 가격`);
    criteria.keywords.forEach(word => labels.push(`상품 자료의 “${word}” 일치`));
    return labels;
  }

  function renderAnswer(products, criteria, hasQuery) {
    if (!hasQuery) {
      answerPreview.textContent = `현재 카탈로그에서 검색 가능한 ${products.length}개 상품을 보여줍니다.`;
      return;
    }
    if (!products.length) {
      answerPreview.textContent = "현재 상품 자료에서 입력한 조건을 모두 충족하는 항목을 찾지 못했습니다. 예산이나 상품 분류를 바꾸면 다시 확인할 수 있습니다.";
      return;
    }
    const conditions = describeCriteria(criteria);
    const first = products[0];
    const matching = conditions.length ? `${conditions.join(", ")} 조건에 맞는 상품` : "검색어와 상품 자료가 일치하는 상품";
    answerPreview.textContent = `${matching} ${products.length}개를 찾았습니다. 예를 들어 ${first.name}은 ${first.priceKrw.toLocaleString("ko-KR")}원으로 등록되어 있습니다. 각 카드에서 적용된 조건과 원본 자료 위치를 확인할 수 있습니다.`;
  }

  function renderProducts(products, criteria) {
    results.replaceChildren();
    empty.hidden = products.length > 0;
    resultCount.textContent = `${products.length}개 상품`;
    for (const product of products) {
      const link = document.createElement("a");
      link.className = "search-product-card";
      link.href = product.productUrl || "#";
      const imageFrame = document.createElement("div");
      imageFrame.className = "search-product-image";
      const image = document.createElement("img");
      image.src = product.image;
      image.alt = product.name;
      image.loading = "lazy";
      imageFrame.append(image);
      const info = document.createElement("div");
      info.className = "search-product-info";
      const brand = document.createElement("p");
      brand.className = "search-product-brand";
      brand.textContent = product.brand;
      const name = document.createElement("h3");
      name.className = "search-product-name";
      name.textContent = product.name;
      const category = document.createElement("p");
      category.className = "search-product-category";
      category.textContent = product.category;
      const price = document.createElement("p");
      price.className = "search-product-price";
      price.textContent = `${product.priceKrw.toLocaleString("ko-KR")}원`;
      const facts = document.createElement("div");
      facts.className = "search-product-facts";
      const factValues = [product.attributes.seatCount ? `${product.attributes.seatCount}인` : null, product.attributes.bedSize?.length ? `사이즈 ${product.attributes.bedSize.join("+ ")}` : null, product.attributes.color, product.attributes.material].filter(Boolean);
      factValues.forEach(value => {
        const fact = document.createElement("span");
        fact.textContent = value;
        facts.append(fact);
      });
      const evidence = document.createElement("section");
      evidence.className = "search-evidence";
      const evidenceHeading = document.createElement("h4");
      evidenceHeading.textContent = "선정 근거";
      const evidenceList = document.createElement("ul");
      const evidenceFacts = [];
      if (criteria.category) evidenceFacts.push(`상품 분류: ${product.category}`);
      if (criteria.seatCount) evidenceFacts.push(`좌석 수: ${product.attributes.seatCount}인`);
      if (criteria.color) evidenceFacts.push(`등록 색상: ${product.attributes.color}`);
      if (criteria.room) evidenceFacts.push(`등록 공간: ${criteria.room}`);
      if (criteria.price) evidenceFacts.push(`표시 가격: ${product.priceKrw.toLocaleString("ko-KR")}원 (${labelForPrice(criteria.price)} 조건 충족)`);
      criteria.keywords.forEach(keyword => evidenceFacts.push(`상품 정보에 “${keyword}” 포함`));
      if (!evidenceFacts.length) evidenceFacts.push("카탈로그에 등록된 상품 정보");
      evidenceFacts.forEach(value => {
        const item = document.createElement("li");
        item.textContent = value;
        evidenceList.append(item);
      });
      const source = document.createElement("p");
      source.className = "search-source";
      source.textContent = `출처: ${product.source.file} ${product.source.pointer}`;
      evidence.append(evidenceHeading, evidenceList, source);
      info.append(brand, name, category, price, facts, evidence);
      link.append(imageFrame, info);
      results.append(link);
    }
  }

  async function search(query) {
    input.value = query;
    const criteria = parseQuery(query);
    renderCriteria(criteria, Boolean(query));
    try {
      const response = await fetch("json/rag_products.json");
      if (!response.ok) throw new Error("상품 자료를 불러오지 못했습니다.");
      const catalog = await response.json();
      const products = catalog.products.filter(product => matches(product, criteria));
      renderAnswer(products, criteria, Boolean(query));
      renderProducts(products, criteria);
    } catch (error) {
      resultCount.textContent = "";
      results.replaceChildren();
      answerPreview.textContent = "상품 자료를 불러오지 못해 추천 근거를 만들 수 없습니다.";
      empty.hidden = false;
      empty.querySelector("h3").textContent = "상품 정보를 불러오지 못했습니다.";
      empty.querySelector("p").textContent = "잠시 후 다시 시도해 주세요.";
      console.error(error);
    }
  }

  document.querySelectorAll("[data-query]").forEach(button => button.addEventListener("click", () => {
    const query = button.dataset.query;
    history.replaceState(null, "", `search.html?q=${encodeURIComponent(query)}`);
    search(query);
  }));

  const initialQuery = new URLSearchParams(window.location.search).get("q")?.trim() || "";
  await search(initialQuery);
});
