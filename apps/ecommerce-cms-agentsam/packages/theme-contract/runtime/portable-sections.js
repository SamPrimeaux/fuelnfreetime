/**
 * Shared, real section implementations for merchant-selected visual presets.
 *
 * This is used by the CMS editor, the alternate-theme preview, AND the
 * published storefront. Preset identity lives on section.__editor.themePreset,
 * never in a parallel theme/page database. An advertised preset must have a
 * real renderer here; labels alone cannot register a section.
 *
 * Kept browser/Worker compatible: no DOM, secret, network, or build dependency.
 */
(function (scope) {
  const f = (key, label, type = "text") => ({ key, label, type });
  const heroFields = [
    f("eyebrow", "Eyebrow"), f("headline", "Headline"),
    f("subheadline", "Description", "textarea"),
    f("imageUrl", "Background / side image", "media"),
    f("ctaPrimary.label", "Button text"), f("ctaPrimary.href", "Button link", "link"),
  ];
  const cards = [
    f("title", "Heading"),
    f("text", "Description", "textarea"),
  ];
  const imageCard = {
    key: "collection-card", label: "Collection", repeatable: true, min: 0, max: 12,
    fields: [f("name", "Name"), f("imageUrl", "Image", "media"), f("href", "Link", "link")],
    defaultContent: { name: "New collection", imageUrl: "", href: "/shop" },
  };
  const detailCard = {
    key: "detail-card", label: "Item", repeatable: true, min: 0, max: 12,
    fields: [f("name", "Heading"), f("description", "Description", "textarea")],
    defaultContent: { name: "New item", description: "Edit this description." },
  };
  const fieldCard = {
    key: "field-note", label: "Field note", repeatable: true, min: 0, max: 6,
    fields: [
      f("name", "Title"), f("subtitle", "Category"),
      f("description", "Description", "textarea"),
      f("imageUrl", "Image", "media"), f("href", "Story link", "link"),
      f("linkLabel", "Link text"),
    ],
    defaultContent: { name: "New field note", subtitle: "", description: "", imageUrl: "", href: "", linkLabel: "Read the story" },
  };
  const faqCard = {
    key: "faq-item", label: "Question", repeatable: true, min: 0, max: 16,
    fields: [f("question", "Question"), f("answer", "Answer", "textarea")],
    defaultContent: { question: "Your question", answer: "Your answer." },
  };
  const spec = (id, label, family, fields, block = null) => Object.freeze({
    id, label, type: family, family, source: id.split("/")[0],
    templateKey: "portable", preset: id,
    fields, blocks: block ? [block] : [],
  });

  // ONLY register implementations with actual markup + scoped styles below.
  // Other donor concepts remain candidates and MUST NOT appear in Add Section.
  const definitions = Object.freeze([
    spec("revise/sticky-curtain", "Sticky curtain hero", "hero", heroFields),
    spec("revise/wardrobe-rail", "Wardrobe rail", "collections", [f("title", "Heading")], imageCard),
    spec("revise/editorial-statement", "Editorial statement", "story", [f("title", "Heading"), f("body", "Body", "textarea")]),
    spec("revise/faq", "FAQ accordion", "faq", [f("title", "Heading")], faqCard),
    spec("revise/testimonials", "Testimonial cards", "testimonials", [f("title", "Heading")], detailCard),
    spec("revise/trust-row", "Trust row", "trust", [f("title", "Heading")], detailCard),
    spec("revise/newsletter", "Newsletter", "newsletter", cards.concat(f("buttonLabel", "Button text"))),
    spec("fnf/scene-hero", "Image scene hero", "hero", heroFields),
    spec("fnf/collection-list", "Collection grid", "collections", [f("title", "Heading")], imageCard),
    spec("fnf/feature-card-grid", "Feature card grid", "features", [f("title", "Heading")], detailCard),
    spec("fnf/manifesto-split", "Manifesto split", "story", [
      f("title", "Heading"), f("body", "Body", "textarea"), f("imageUrl", "Image", "media"),
    ]),
    spec("fnf/newsletter", "Newsletter CTA", "newsletter", cards.concat(f("buttonLabel", "Button text"))),
    spec("fnf/field-notes-hero", "Field notes · Editorial hero", "fieldHero", [
      f("eyebrow", "Series label"), f("headline", "Headline"),
      f("subheadline", "Editorial subtitle"), f("body", "Description", "textarea"),
      f("imageUrl", "Feature image", "media"),
      f("ctaPrimary.label", "Button text"), f("ctaPrimary.href", "Button link", "link"),
    ]),
    spec("fnf/field-notes-grid", "Field notes · Story cards", "fieldGrid", [
      f("eyebrow", "Section label"), f("title", "Heading"), f("body", "Intro", "textarea"),
    ], fieldCard),
    spec("fnf/earned-hours-panel", "Earned hours · Split feature", "earnedFeature", [
      f("eyebrow", "Series label"), f("headline", "Headline"), f("body", "Description", "textarea"),
      f("imageUrl", "Feature image", "media"),
      f("ctaPrimary.label", "Button text"), f("ctaPrimary.href", "Button link", "link"),
    ]),
    spec("fnf/product-story-panel", "Product · Artwork story", "productStory", [
      f("eyebrow", "Series label"), f("headline", "Headline"), f("body", "Description", "textarea"),
      f("imageUrl", "Product image", "media"),
      f("ctaPrimary.label", "Button text"), f("ctaPrimary.href", "Button link", "link"),
    ]),
  ]);
  const byId = new Map(definitions.map((item) => [item.id, item]));
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const esc = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const isSafeUrl = (value, { allowEmpty = true } = {}) => {
    if (value == null || value === "") return allowEmpty;
    if (typeof value !== "string") return false;
    const v = value.trim();
    return v.length < 2048 && (v.startsWith("/") && !v.startsWith("//")
      || v.startsWith("#") || /^https:\/\//i.test(v) || /^http:\/\//i.test(v));
  };
  const href = (value, fallback = "#") => isSafeUrl(value) ? esc(value || fallback) : esc(fallback);
  const image = (value) => isSafeUrl(value) ? esc(value || "") : "";
  const metadata = (entry) => entry?.content?.__editor || {};
  const preset = (entry) => metadata(entry).themePreset || "";
  const title = (content) => content.title || content.headline || "";
  function sectionBlocks(entry) {
    const content = entry.content || {};
    const info = metadata(entry).blocks;
    if (Array.isArray(info)) return info.filter((block) => block.enabled !== false)
      .map((block) => ({ id: block.id, ...content[block.id] })).filter((item) => typeof item.id === "string");
    return Object.keys(content).filter((key) => /^card\d+$/.test(key) && content[key] && typeof content[key] === "object")
      .map((id) => ({ id, ...content[id] }));
  }
  function heading(content, tag = "h2") {
    return '<' + tag + ' data-cms="title">' + esc(title(content)) + '</' + tag + '>';
  }
  function renderHero(entry) {
    const content = entry.content || {};
    const cta = content.ctaPrimary || {};
    const photo = image(content.imageUrl);
    return '<div class="ps-hero-media">' + (photo ? '<img data-cms="imageUrl" src="' + photo + '" alt="" loading="lazy">' : "") + '</div>'
      + '<div class="ps-inner ps-hero-copy"><p class="ps-kicker" data-cms="eyebrow">' + esc(content.eyebrow || "") + '</p>'
      + '<h2 class="ps-display" data-cms="headline">' + esc(content.headline || "") + '</h2>'
      + '<p class="ps-description" data-cms="subheadline">' + esc(content.subheadline || "") + '</p>'
      + '<a class="ps-cta" data-cms="ctaPrimary.href" data-cms-attr="href" href="' + href(cta.href, "/shop")
      + '"><span data-cms="ctaPrimary.label">' + esc(cta.label || "Explore") + '</span><span aria-hidden="true">→</span></a></div>';
  }
  function renderCollections(entry) {
    const content = entry.content || {};
    return '<div class="ps-inner"><header class="ps-heading">' + heading(content) + '</header>'
      + '<div class="ps-cards">' + sectionBlocks(entry).map((item) =>
        '<a class="ps-card" data-cms-block="' + esc(item.id) + '" href="' + href(item.href, "/shop") + '">'
        + (image(item.imageUrl) ? '<img src="' + image(item.imageUrl) + '" loading="lazy" alt="">' : '<div class="ps-card-placeholder" aria-hidden="true"></div>')
        + '<strong data-cms="' + esc(item.id) + '.name">' + esc(item.name || "Collection") + '</strong></a>'
      ).join("") + '</div></div>';
  }
  function renderStory(entry) {
    const c = entry.content || {};
    const photo = image(c.imageUrl);
    return '<div class="ps-inner ps-story-layout"><div class="ps-story-copy">' + heading(c)
      + '<p data-cms="body">' + esc(c.body || "") + '</p></div>'
      + (photo ? '<img class="ps-story-image" data-cms="imageUrl" src="' + photo + '" loading="lazy" alt="">' : "") + '</div>';
  }
  function renderFaq(entry) {
    return '<div class="ps-inner">' + heading(entry.content || {})
      + '<div class="ps-questions">' + sectionBlocks(entry).map((item) =>
        '<details data-cms-block="' + esc(item.id) + '"><summary data-cms="' + esc(item.id) + '.question">'
        + esc(item.question || "Question") + '</summary><p data-cms="' + esc(item.id) + '.answer">'
        + esc(item.answer || "") + '</p></details>'
      ).join("") + '</div></div>';
  }
  function renderDetails(entry) {
    return '<div class="ps-inner">' + heading(entry.content || {}) + '<div class="ps-detail-grid">'
      + sectionBlocks(entry).map((item) => '<article data-cms-block="' + esc(item.id) + '">'
        + '<h3 data-cms="' + esc(item.id) + '.name">' + esc(item.name || "") + '</h3>'
        + '<p data-cms="' + esc(item.id) + '.description">' + esc(item.description || "") + '</p></article>').join("")
      + '</div></div>';
  }
  function renderNewsletter(entry) {
    const c = entry.content || {};
    const formId = "portable-email-" + String(entry.key).replace(/[^a-z0-9_-]/gi, "-");
    return '<div class="ps-inner ps-signup"><div>' + heading(c)
      + '<p data-cms="text">' + esc(c.text || "") + '</p></div>'
      + '<form method="post" action="/api/newsletter"><label for="' + esc(formId) + '">Email address</label>'
      + '<div class="ps-form-row"><input type="email" id="' + esc(formId)
      + '" name="email" autocomplete="email" required placeholder="Email address">'
      + '<button type="submit" data-cms="buttonLabel">' + esc(c.buttonLabel || "Join") + '</button></div></form></div>';
  }

  // These are real CMS sections, not screenshot placeholders. Every visible
  // copy slot and media/link has a matching inspector field.
  function editorialAction(content, fallback) {
    const cta = content.ctaPrimary || {};
    return cta.label && cta.href
      ? '<a class="ps-article-link" data-cms="ctaPrimary.href" data-cms-attr="href" href="' + href(cta.href, fallback)
        + '"><span data-cms="ctaPrimary.label">' + esc(cta.label) + '</span><span aria-hidden="true">→</span></a>'
      : "";
  }
  function editorialPicture(value, cssClass) {
    const src = image(value);
    return '<div class="' + cssClass + '">' + (src
      ? '<img data-cms="imageUrl" src="' + src + '" alt="" loading="lazy">'
      : '<div class="ps-image-empty" aria-hidden="true"></div>') + '</div>';
  }
  function renderFieldHero(entry) {
    const c = entry.content || {};
    return '<div class="ps-field-copy"><p class="ps-field-kicker" data-cms="eyebrow">' + esc(c.eyebrow || "") + '</p>'
      + '<h2 class="ps-field-display" data-cms="headline">' + esc(c.headline || "") + '</h2>'
      + '<p class="ps-field-subhead" data-cms="subheadline">' + esc(c.subheadline || "") + '</p>'
      + '<p class="ps-field-body" data-cms="body">' + esc(c.body || "") + '</p>'
      + editorialAction(c, "/stories") + '</div>'
      + editorialPicture(c.imageUrl, "ps-field-image");
  }
  function renderFieldGrid(entry) {
    const c = entry.content || {};
    const cards = sectionBlocks(entry);
    return '<div class="ps-field-grid-wrap"><header class="ps-field-grid-heading">'
      + '<p class="ps-field-kicker" data-cms="eyebrow">' + esc(c.eyebrow || "") + '</p>'
      + '<h2 class="ps-field-display" data-cms="title">' + esc(c.title || "") + '</h2>'
      + '<p class="ps-field-body" data-cms="body">' + esc(c.body || "") + '</p></header>'
      + '<div class="ps-field-grid">' + cards.map((card, index) => {
        const id = esc(card.id);
        const photo = image(card.imageUrl);
        const action = card.href && isSafeUrl(card.href, { allowEmpty: false });
        const inner = (photo ? '<img data-cms="' + id + '.imageUrl" src="' + photo + '" alt="" loading="lazy">' : '<span class="ps-image-empty" aria-hidden="true"></span>')
          + '<span class="ps-field-number">' + String(index + 1).padStart(2, "0") + ' /</span>'
          + '<h3 data-cms="' + id + '.name">' + esc(card.name || "") + '</h3>'
          + '<p class="ps-field-card-kicker" data-cms="' + id + '.subtitle">' + esc(card.subtitle || "") + '</p>'
          + '<p class="ps-field-card-summary" data-cms="' + id + '.description">' + esc(card.description || "") + '</p>'
          + (action ? '<span class="ps-article-link" data-cms="' + id + '.linkLabel">' + esc(card.linkLabel || "Read the story") + ' <span aria-hidden="true">→</span></span>' : "");
        return '<article class="ps-field-card" data-cms-block="' + id + '">'
          + (action ? '<a href="' + href(card.href) + '" data-cms="' + id + '.href" data-cms-attr="href">' + inner + '</a>' : '<div class="ps-field-card-content">' + inner + '</div>')
          + '</article>';
      }).join("") + '</div></div>';
  }
  function renderEditorialPanel(entry) {
    const c = entry.content || {};
    return '<div class="ps-editorial-panel-copy"><p class="ps-field-kicker" data-cms="eyebrow">' + esc(c.eyebrow || "") + '</p>'
      + '<h2 class="ps-field-display" data-cms="headline">' + esc(c.headline || "") + '</h2>'
      + '<p class="ps-field-body" data-cms="body">' + esc(c.body || "") + '</p>'
      + editorialAction(c, "/shop") + '</div>'
      + editorialPicture(c.imageUrl, "ps-editorial-panel-media");
  }
  const renders = {
    hero: renderHero, collections: renderCollections, story: renderStory,
    faq: renderFaq, testimonials: renderDetails, trust: renderDetails,
    features: renderDetails, newsletter: renderNewsletter,
    fieldHero: renderFieldHero, fieldGrid: renderFieldGrid,
    earnedFeature: renderEditorialPanel, productStory: renderEditorialPanel,
  };
  const genericDefaults = {
    hero: { eyebrow: "New collection", headline: "Your headline", subheadline: "Describe your story.", imageUrl: "", ctaPrimary: { label: "Explore", href: "/shop" } },
    collections: { title: "Shop collections", card1: { name: "Collection one", imageUrl: "", href: "/shop" }, card2: { name: "Collection two", imageUrl: "", href: "/shop" } },
    story: { title: "Tell your story", body: "Introduce your point of view.", imageUrl: "" },
    faq: { title: "Frequently asked questions", card1: { question: "Question one", answer: "Add your answer." } },
    testimonials: { title: "What people are saying", card1: { name: "Customer", description: "Add a real customer testimonial." } },
    trust: { title: "Why shop with us", card1: { name: "Your promise", description: "Explain a benefit." } },
    features: { title: "Designed for the details", card1: { name: "Feature one", description: "Explain a feature." } },
    newsletter: { title: "Stay in the loop", text: "Get updates on new releases.", buttonLabel: "Join" },
    fieldHero: { eyebrow: "FIELD NOTES / VOL. 01", headline: "MADE IN THE HOURS BETWEEN",
      subheadline: "Projects, people, and the work behind the work.",
      body: "Stories from the garage, the trail, and everywhere in between.",
      imageUrl: "", ctaPrimary: { label: "Explore field notes", href: "/stories" } },
    fieldGrid: { eyebrow: "THE FIELD NOTES", title: "PEOPLE. PLACES. PROJECTS.",
      body: "The people, places and projects that make the hours count.",
      card1: { name: "The Build", subtitle: "IDEAS INTO REALITY", description: "Inside the work, from first sketches to the final details.", imageUrl: "", href: "", linkLabel: "Read the story" },
      card2: { name: "The Route", subtitle: "PLACES THAT PULL US FORWARD", description: "Long roads, familiar spots and everything in between.", imageUrl: "", href: "", linkLabel: "Read the story" },
      card3: { name: "The Makers", subtitle: "PEOPLE BEHIND THE PRODUCTS", description: "The hands and ideas behind what we make.", imageUrl: "", href: "", linkLabel: "Read the story" } },
    earnedFeature: { eyebrow: "THE EARNED HOURS SERIES",
      headline: "ORIGINAL ARTWORK. MADE FOR THE HOURS THAT MATTER.",
      body: "For early starts, long builds and everything after the clock.",
      imageUrl: "", ctaPrimary: { label: "Explore the collection", href: "/shop" } },
    productStory: { eyebrow: "THE SIGNATURE SERIES",
      headline: "THE FRONT IS THE MARK. THE BACK TELLS THE STORY.",
      body: "A familiar badge on the front. A different story every time you turn around.",
      imageUrl: "", ctaPrimary: { label: "Shop the collection", href: "/shop" } },
  };
  function defaults(id) {
    if (!byId.has(id) && scope.ThemeReviseAtlas?.get(id)) return scope.ThemeReviseAtlas.defaults(id);
    const definition = byId.get(id);
    if (!definition) return null;
    const content = JSON.parse(JSON.stringify(genericDefaults[definition.family] || {}));
    // Defaults must obey the exact registered section schema, not a shared
    // family's superset (e.g. editorial statement has no side image control).
    const names = new Set(definition.fields.map((field) => field.key.split(".")[0]));
    for (const key of Object.keys(content)) {
      if (!names.has(key) && !(definition.blocks.length && /^card\d+$/.test(key))) {
        delete content[key];
      }
    }
    const defaultBlocks = [];
    for (const field of Object.keys(content)) if (/^card\d+$/.test(field)) {
      defaultBlocks.push({ id: field, templateKey: definition.blocks[0]?.key, enabled: true });
    }
    content.__editor = {
      templateKey: "portable",
      themePreset: id,
      visibility: { enabled: true },
      ...(defaultBlocks.length ? { blocks: defaultBlocks } : {}),
    };
    return content;
  }
  function render(entry) {
    const id = preset(entry);
    if (!byId.has(id) && scope.ThemeReviseAtlas?.get(id)) {
      if (entry.content?.__editor?.visibility?.enabled === false) return "";
      return scope.ThemeReviseAtlas.render(entry);
    }
    const definition = byId.get(id);
    if (!definition) return null;
    const content = entry.content || {};
    if (content.__editor?.visibility?.enabled === false) return "";
    const markup = renders[definition.family](entry);
    return '<section class="ps-section ps-' + esc(definition.family)
      + '" data-cms-section="' + esc(entry.key) + '" data-portable-preset="' + esc(id)
      + '" data-portable-family="' + esc(definition.family) + '">' + markup + '</section>';
  }
  function validate(id, content) {
    if (!byId.has(id) && scope.ThemeReviseAtlas?.get(id)) return scope.ThemeReviseAtlas.validate(id, content);
    const definition = byId.get(id);
    if (!definition) return { ok: false, error: "Unsupported section preset" };
    if (!content || Array.isArray(content) || typeof content !== "object")
      return { ok: false, error: "Section content must be an object" };
    const allowed = new Set(definition.fields.map((field) => field.key.split(".")[0]));
    allowed.add("__editor");
    const declaredBlocks = Array.isArray(content.__editor?.blocks) ? content.__editor.blocks : [];
    for (const block of declaredBlocks) {
      if (block && typeof block.id === "string") allowed.add(block.id);
    }
    for (const key of Object.keys(content)) {
      if (!allowed.has(key) || ["__proto__", "prototype", "constructor"].includes(key))
        return { ok: false, error: "Unsupported section field: " + key };
    }
    for (const field of definition.fields) {
      const parts = field.key.split(".");
      const value = parts.reduce((v, key) => v == null ? undefined : v[key], content);
      if (value == null || value === "") continue;
      if (typeof value !== "string" || value.length > 12000)
        return { ok: false, error: "Invalid " + field.key };
      if (["link", "media"].includes(field.type) && !isSafeUrl(value))
        return { ok: false, error: "Unsafe " + field.key };
    }
    const editor = content.__editor;
    if (!editor || editor.themePreset !== id || editor.templateKey !== "portable")
      return { ok: false, error: "Invalid portable section identity" };
    if (editor.blocks != null) {
      if (!definition.blocks.length || !Array.isArray(editor.blocks) || editor.blocks.length > 16)
        return { ok: false, error: "Invalid section blocks" };
      const seen = new Set();
      for (const block of editor.blocks) {
        if (!block || !/^[a-zA-Z0-9_-]{1,60}$/.test(block.id || "") ||
            seen.has(block.id) || block.templateKey !== definition.blocks[0].key)
          return { ok: false, error: "Invalid section block identity" };
        seen.add(block.id);
        const values = content[block.id];
        if (values != null && (typeof values !== "object" || Array.isArray(values)))
          return { ok: false, error: "Invalid block data" };
        if (values) for (const [key, value] of Object.entries(values)) {
          const fld = definition.blocks[0].fields.find((field) => field.key === key);
          if (!fld || typeof value !== "string" || value.length > 12000 ||
              (["link", "media"].includes(fld.type) && !isSafeUrl(value)))
            return { ok: false, error: "Invalid block field: " + key };
        }
      }
    }
    return { ok: true };
  }

  scope.ThemePortableSections = Object.freeze({
    definitions,
    get: (id) => byId.get(id) || scope.ThemeReviseAtlas?.get(id) || null,
    catalog: () => [
      ...definitions.map(({ id, label, family, source, templateKey, preset }) =>
        ({ id, label, type: family, source, templateKey, preset })),
      ...(scope.ThemeReviseAtlas?.catalog() || []),
    ],
    defaults, render, validate,
    schema(id) {
      if (!byId.has(id) && scope.ThemeReviseAtlas?.get(id)) return scope.ThemeReviseAtlas.schema(id);
      const definition = byId.get(id);
      if (!definition) return null;
      return {
        label: definition.label,
        fields: definition.fields,
        blocks: definition.blocks,
        settings: [],
        capabilities: { edit: true, reorder: true, duplicate: true, remove: true, blocks: !!definition.blocks.length },
        guardrails: { maxBlocks: definition.blocks[0]?.max || 0 },
      };
    },
  });
})(globalThis);
