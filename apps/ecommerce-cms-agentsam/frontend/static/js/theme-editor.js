(() => {
  const params = new URLSearchParams(location.search);
  let slug = params.get('slug') || 'shop';
  let pageData = null;
  let siteData = null;
  let pages = [];
  let activeSectionKey = null;
  let activeSectionOwner = slug;
  let selectedTheme = localStorage.getItem('theme-studio:selected-theme') || 'heuristic';
  let previewBlobUrl = null;
  let siteDraftTouched = false;
  let liveUnimported = false;
  let liveSourceCaptured = false;
  let liveExistingDraft = false;
  let activeBlockId = null;
  let activeFieldKey = null;
  let activeTab = 'content';
  let patchTimer = null;
  let refreshTimer = null;
  let mediaLibrary = [];
  let mediaTarget = null;
  const resourceCache = Object.create(null);
  let dirty = false;
  const dirtySections = new Set();
  let device = localStorage.getItem('fnf-theme-editor-device') || 'desktop';
  let showOutlines = localStorage.getItem('fnf-theme-editor-outlines') !== '0';
  let autoPreview = localStorage.getItem('fnf-theme-editor-auto-preview') !== '0';

  const fallbackPages = [
    { slug: 'home', title: 'Home page', route: '/' },
    { slug: 'shop', title: 'Shop', route: '/shop' },
    { slug: 'about', title: 'About', route: '/about' },
    { slug: 'community', title: 'Community', route: '/community' },
    { slug: 'collaborate', title: 'Collaborate', route: '/collaborate' },
    { slug: 'policies', title: 'Policies', route: '/policies' },
    { slug: 'terms', title: 'Terms', route: '/terms' }
  ];

  const icon = {
    page: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 3h9l3 3v15H6z" stroke="currentColor" stroke-width="1.7"/><path d="M15 3v4h4" stroke="currentColor" stroke-width="1.7"/></svg>',
    section: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    desktop: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="13" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 21h8M12 17v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    tablet: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="5" y="2.5" width="14" height="19" rx="2.5" stroke="currentColor" stroke-width="1.7"/></svg>',
    mobile: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="7" y="2.5" width="10" height="19" rx="2.5" stroke="currentColor" stroke-width="1.7"/></svg>',
    refresh: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6v5h-5M4 18v-5h5" stroke="currentColor" stroke-width="1.7"/><path d="M6 9a7 7 0 0 1 12-2l2 2M4 15l2 2a7 7 0 0 0 12-2" stroke="currentColor" stroke-width="1.7"/></svg>',
    external: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M14 5h5v5M19 5l-8 8" stroke="currentColor" stroke-width="1.7"/><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" stroke="currentColor" stroke-width="1.7"/></svg>'
  };

  function shellMarkup() {
    return [
      '<div class="theme-studio">',
        '<header class="theme-studio-toolbar">',
          '<div class="theme-studio-toolbar__left">',
            '<span class="te-editor-label">Theme editor</span>',
            '<div class="te-page-menu">',
              '<button type="button" class="te-page-trigger" id="te-page-trigger" aria-expanded="false"><span style="display:flex;align-items:center;gap:8px;min-width:0">', icon.page, '<strong id="te-page-title">Loading…</strong></span><span>⌄</span></button>',
              '<div class="te-page-popover" id="te-page-popover" hidden><input class="te-page-search" id="te-page-search" placeholder="Search online store" autocomplete="off"><div class="te-page-options" id="te-page-options"></div></div>',
            '</div>',
            '<span class="te-save-state" id="te-save-state">Loading</span>',
          '</div>',
          '<div class="theme-studio-toolbar__center">',
            '<div class="te-theme-switch" id="te-theme-switch" aria-label="Visual theme">' +
              ((window.ThemeStudioPreview && window.ThemeStudioPreview.themes) || []).map(function(theme) {
                return '<button type="button" class="te-theme-btn" data-theme-preview="' + cmsEscapeAttr(theme.id) + '" title="' + cmsEscapeAttr(theme.description || theme.name) + '">' + cmsEscapeHtml(theme.name) + '</button>';
              }).join('') +
            '</div>',
            '<div class="te-device-switch" aria-label="Preview device">',
              '<button type="button" class="te-device-btn" data-device="desktop" title="Desktop">', icon.desktop, '</button>',
              '<button type="button" class="te-device-btn" data-device="tablet" title="Tablet">', icon.tablet, '</button>',
              '<button type="button" class="te-device-btn" data-device="mobile" title="Mobile">', icon.mobile, '</button>',
            '</div>',
          '</div>',
          '<div class="theme-studio-toolbar__right"><a class="te-toolbar-btn" id="te-page-settings" href="#">Page settings</a><button type="button" class="te-toolbar-btn is-primary" id="te-publish">Publish</button></div>',
        '</header>',
        '<div class="theme-studio-workspace">',
          '<aside class="theme-studio-tree"><div class="te-panel-title"><span class="te-panel-kicker">Page structure</span><h2 id="te-tree-title">Page</h2><p id="te-tree-path">/</p></div><div id="te-tree"></div><div class="te-tree-footer"><a id="te-manage-page" href="#">Page content &amp; settings →</a></div></aside>',
          '<main class="theme-studio-canvas">',
            '<div class="te-preview-bar"><span id="te-preview-label">Storefront preview</span><div class="te-preview-bar__actions"><button class="te-import-live" type="button" id="te-import-live" hidden>Import live page</button><button class="te-icon-btn" type="button" id="te-refresh" title="Refresh preview">', icon.refresh, '</button><a class="te-icon-btn" id="te-open-tab" href="#" target="_blank" rel="noopener" title="Open in new tab">', icon.external, '</a></div></div>',
            '<div class="te-preview-stage"><div class="te-preview-device" id="te-preview-device" data-device="desktop"><iframe id="theme-preview" title="Storefront preview" class="theme-editor-preview"></iframe></div></div>',
            '<div class="te-preview-status"><span class="te-preview-mode">Local draft preview</span><span class="te-selected-path" id="te-selected-path">Select a section in the preview or tree</span></div>',
          '</main>',
          '<aside class="theme-editor-panel">',
            '<div class="te-inspector-head"><div class="te-inspector-title"><strong id="te-inspector-title">Section</strong><span id="te-inspector-subtitle">Choose a section</span></div><span class="te-badge" id="te-section-status">draft</span></div>',
            '<div class="te-tabs" id="te-tabs"><button type="button" class="te-tab is-active" data-tab="content">Content</button><button type="button" class="te-tab" data-tab="media">Media</button><button type="button" class="te-tab" data-tab="links">Links</button><button type="button" class="te-tab" data-tab="settings">Layout</button></div>',
            '<div class="te-inspector-body" id="te-inspector-body"></div>',
            '<div class="te-inspector-save"><button type="button" class="te-toolbar-btn is-primary" id="te-save">Save draft</button><p class="te-note" id="te-note"></p></div>',
          '</aside>',
        '</div>',
      '</div>',
      '<div class="te-media-modal" id="te-media-modal" hidden><div class="te-media-dialog" role="dialog" aria-modal="true" aria-labelledby="te-media-title">',
        '<div class="te-media-dialog__head"><strong id="te-media-title">Choose media</strong><button type="button" class="te-icon-btn" id="te-media-close" aria-label="Close">×</button></div>',
        '<div class="te-media-dialog__tools"><input id="te-media-search" placeholder="Search media"><label class="te-upload-target">Upload<input id="te-media-upload" type="file" accept="image/*,video/*,.glb,.gltf,.usdz" multiple></label></div>',
        '<div class="te-media-grid" id="te-media-grid"></div>',
      '</div></div>'
    ].join('');
  }

  renderShell('/admin/theme-editor', shellMarkup(), { fullBleed: true });

  const byId = function(id) { return document.getElementById(id); };

  function humanize(value) {
    return String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, function(m) { return m.toUpperCase(); });
  }

  function pageRoute(pageSlug) {
    if (window.PAGE_ROUTES && window.PAGE_ROUTES[pageSlug]) return window.PAGE_ROUTES[pageSlug];
    const found = fallbackPages.find(function(page) { return page.slug === pageSlug; });
    return found ? found.route : '/';
  }


  function ownerSections(ownerSlug) {
    const doc = ownerSlug === 'site' ? siteData : pageData;
    return (doc && doc.sections) || [];
  }

  function findSection(sectionKey, ownerSlug) {
    if (!sectionKey) return null;
    const requestedOwner = ownerSlug || activeSectionOwner || slug;
    const direct = ownerSections(requestedOwner).find(function(section) { return section.key === sectionKey; });
    if (direct) return direct;
    const site = ownerSections('site').find(function(section) { return section.key === sectionKey; });
    if (site) return site;
    return ownerSections(slug).find(function(section) { return section.key === sectionKey; }) || null;
  }

  function sectionOwner(section) {
    return section && section.__ownerSlug || slug;
  }

  function dirtyRef(section) {
    return sectionOwner(section) + ':' + section.key;
  }

  function parseDirtyRef(ref) {
    const idx = String(ref).indexOf(':');
    return idx < 0 ? { owner: slug, key: String(ref) } : { owner: ref.slice(0, idx), key: ref.slice(idx + 1) };
  }

  function themeCatalog() {
    // Section ownership is independent of the theme preview selector.
    // Every supported implementation is reusable on every CMS page.
    const portable = window.ThemePortableSections?.catalog() || [];
    const registry = window.SECTION_SCHEMAS?.[slug] || {};
    const native = Object.entries(registry)
      .filter(function([key]) {
        // Do not offer native sections unless the storefront actually has
        // an insertable renderer/template for this page. Cross-theme portable
        // sections below remain available on every merchant-editable page.
        const supported = {
          home: ['hero', 'manifesto', 'collections', 'values', 'community', 'newsletter'],
          shop: ['hero', 'collections', 'stories'],
        };
        return (supported[slug] || []).includes(key);
      })
      .map(function([key, definition]) {
        return { id: 'heuristic/' + key, label: definition.label || humanize(key),
          type: key, templateKey: key, source: 'heuristic', preset: 'heuristic/' + key };
      });
    return [...native, ...portable];
  }

  function setTheme(nextTheme) {
    if (!nextTheme || nextTheme === selectedTheme) return;
    selectedTheme = nextTheme;
    localStorage.setItem('theme-studio:selected-theme', selectedTheme);
    document.querySelectorAll('[data-theme-preview]').forEach(function(button) {
      button.classList.toggle('is-active', button.dataset.themePreview === selectedTheme);
    });
    syncPublishCapability();
    renderTree();
    refreshPreview();
  }

  function syncPublishCapability() {
    const button = byId('te-publish');
    if (!button) return;
    const previewOnly = selectedTheme !== 'heuristic';
    button.disabled = previewOnly || liveUnimported;
    button.title = previewOnly
      ? 'Preview only: this visual theme has not passed the publish/rollback gate.'
      : liveUnimported ? 'Import the live storefront before publishing.' : 'Publish the current CMS page and changed global sections';
  }

  function currentSection() {
    return findSection(activeSectionKey, activeSectionOwner);
  }

  function schemaForSection(section) {
    if (!section) return null;
    if (section.content?.__editor?.templateKey === 'portable') {
      return window.ThemePortableSections?.schema(section.content.__editor.themePreset) || null;
    }
    const owner = section.__ownerSlug || slug;
    const schemas = window.SECTION_SCHEMAS && window.SECTION_SCHEMAS[owner];
    if (!schemas) return null;
    if (schemas[section.key]) return schemas[section.key];
    const templateKey = section.content && section.content.__editor && section.content.__editor.templateKey;
    return templateKey && schemas[templateKey] ? schemas[templateKey] : null;
  }

  function currentSectionSchema() {
    return schemaForSection(currentSection());
  }

  function currentBlockMeta() {
    const section = currentSection();
    const blocks = section && section.content && section.content.__editor && section.content.__editor.blocks;
    if (!activeBlockId || !Array.isArray(blocks)) return null;
    return blocks.find(function(block) { return block.id === activeBlockId; }) || null;
  }

  function currentBlockSchema() {
    const sectionSchema = currentSectionSchema();
    const meta = currentBlockMeta();
    if (!sectionSchema || !meta || !Array.isArray(sectionSchema.blocks)) return null;
    return sectionSchema.blocks.find(function(block) { return block.key === meta.templateKey; }) || null;
  }

  function currentSchema() {
    const block = currentBlockSchema();
    if (block) {
      return (block.fields || []).map(function(field) {
        return { ...field, key: activeBlockId + '.' + field.key, blockRelativeKey: field.key };
      });
    }
    const schema = currentSectionSchema();
    return (schema && schema.fields) || (window.SECTION_FIELDS && window.SECTION_FIELDS[slug] && window.SECTION_FIELDS[slug][activeSectionKey]) || [];
  }

  function currentSettings() {
    const block = currentBlockSchema();
    if (activeBlockId) {
      if (!block || !Array.isArray(block.settings)) return [];
      return block.settings.map(function(field) {
        return { ...field, key: activeBlockId + '.__settings.' + field.key, blockRelativeKey: field.key };
      });
    }
    const schema = currentSectionSchema();
    return (schema && schema.settings) || [];
  }

  function allEditableFields() {
    return currentSchema().concat(currentSettings());
  }

  function fieldKind(field) {
    if (field.type === 'media' || field.type === 'video' || field.media) return 'media';
    if (field.type === 'link' || field.type === 'product' || field.type === 'collection' || field.type === 'variant') return 'links';
    return 'content';
  }

  function fieldByKey(key) {
    return allEditableFields().find(function(field) { return field.key === key; }) || null;
  }

  function valueForField(section, field) {
    const value = cmsGetPath(section.content, field.key);
    if (value !== undefined && value !== null && value !== '') return value;
    return field.default !== undefined ? field.default : '';
  }

  function setFieldValue(field, value) {
    const section = currentSection();
    if (!section) return;
    let next = value;
    if (field.type === 'number' || field.type === 'range') {
      const parsed = Number(value);
      next = Number.isFinite(parsed) ? parsed : (field.default ?? 0);
    } else if (field.type === 'boolean') {
      next = Boolean(value);
    }
    cmsSetPath(section.content, field.key, next);
    dirtySections.add(dirtyRef(section));
    if (sectionOwner(section) === 'site') siteDraftTouched = true;
    setDirty(true);
    scheduleLocalPreview();
    byId('te-selected-path').textContent = (sectionOwner(section) === 'site' ? 'Global' : slug) + ' / ' + section.key + ' / ' + field.key;
  }

  function setNote(message, kind) {
    const el = byId('te-note');
    el.textContent = message || '';
    el.className = 'te-note' + (kind ? ' is-' + kind : '');
  }

  function setSaveState(label, state) {
    const el = byId('te-save-state');
    el.textContent = label;
    el.className = 'te-save-state' + (state ? ' is-' + state : '');
  }

  function setDirty(value) {
    dirty = Boolean(value);
    if (dirty) setSaveState('Unpublished changes', 'dirty');
    else setSaveState(pageData && pageData.status === 'published' ? 'Published' : 'Draft saved', 'saved');
  }

  function renderPageOptions(query) {
    const needle = String(query || '').trim().toLowerCase();
    const source = pages.length ? pages : fallbackPages;
    const filtered = source.filter(function(page) {
      const title = page.title || humanize(page.slug);
      return !needle || title.toLowerCase().includes(needle) || page.slug.toLowerCase().includes(needle);
    });

    byId('te-page-options').innerHTML = filtered.length ? filtered.map(function(page) {
      return '<button type="button" class="te-page-option' + (page.slug === slug ? ' is-active' : '') + '" data-page-slug="' + cmsEscapeAttr(page.slug) + '">' +
        icon.page + '<span><strong style="font-size:12px">' + cmsEscapeHtml(page.title || humanize(page.slug)) + '</strong><span style="display:block;font-size:10px;color:#858580;margin-top:2px">' +
        cmsEscapeHtml(pageRoute(page.slug)) + '</span></span></button>';
    }).join('') : '<div class="te-empty">No pages match that search.</div>';

    byId('te-page-options').querySelectorAll('[data-page-slug]').forEach(function(button) {
      button.addEventListener('click', function() { switchPage(button.dataset.pageSlug); });
    });
  }

  function blockSchemaFor(section, meta) {
    const schema = schemaForSection(section);
    if (!schema || !meta || !Array.isArray(schema.blocks)) return null;
    return schema.blocks.find(function(block) { return block.key === meta.templateKey; }) || null;
  }

  function renderTree() {
    const pageSections = ownerSections(slug);
    const siteSections = ownerSections('site');
    const header = siteSections.find(function(section) { return section.key === 'header'; });
    const footer = siteSections.find(function(section) { return section.key === 'footer'; });
    const registrySections = (window.SECTION_SCHEMAS && window.SECTION_SCHEMAS[slug]) || {};

    byId('te-tree-title').textContent = (pageData && pageData.title) || humanize(slug);
    byId('te-tree-path').textContent = pageRoute(slug);

    function sectionNode(section, index, group) {
      if (!section) return '';
      const owner = sectionOwner(section);
      const schema = schemaForSection(section) || {};
      const fields = schema.fields || [];
      const editor = section.content && section.content.__editor || {};
      const visible = !editor.visibility || editor.visibility.enabled !== false;
      const capabilities = schema.capabilities || {};
      const isGlobal = owner === 'site';
      const label = schema.label || (section.key === 'header' ? 'Header' : section.key === 'footer' ? 'Footer' : humanize(editor.templateKey || section.key));
      const sectionSelected = section.key === activeSectionKey && owner === activeSectionOwner;
      const blockMeta = Array.isArray(editor.blocks) ? editor.blocks : [];

      const blockRows = blockMeta.map(function(meta, blockIndex) {
        const blockSchema = blockSchemaFor(section, meta) || {};
        const blockLabel = blockSchema.label || humanize(meta.templateKey || meta.id);
        return '<div class="te-block-row' + (sectionSelected && meta.id === activeBlockId ? ' is-active' : '') + '" data-block-id="' + cmsEscapeAttr(meta.id) + '" data-block-index="' + blockIndex + '" data-block-section="' + cmsEscapeAttr(section.key) + '" data-block-owner="' + cmsEscapeAttr(owner) + '" draggable="true">' +
          '<button type="button" class="te-block-row__main" data-select-block="' + cmsEscapeAttr(meta.id) + '" data-block-section="' + cmsEscapeAttr(section.key) + '" data-block-owner="' + cmsEscapeAttr(owner) + '">' +
            '<span class="te-block-row__rail"></span><span class="te-block-row__copy"><strong>' + cmsEscapeHtml(blockLabel) + '</strong><small>' + cmsEscapeHtml(meta.id) + '</small></span>' +
          '</button>' +
          '<span class="te-tree-row__actions">' +
            '<button type="button" class="te-tree-mini" data-duplicate-block="' + cmsEscapeAttr(meta.id) + '" data-block-section="' + cmsEscapeAttr(section.key) + '" data-block-owner="' + cmsEscapeAttr(owner) + '" title="Duplicate block">⧉</button>' +
            '<button type="button" class="te-tree-mini" data-remove-block="' + cmsEscapeAttr(meta.id) + '" data-block-section="' + cmsEscapeAttr(section.key) + '" data-block-owner="' + cmsEscapeAttr(owner) + '" title="Remove block">×</button>' +
          '</span></div>';
      }).join('');

      const blockTemplates = Array.isArray(schema.blocks) ? schema.blocks : [];
      const addBlock = blockTemplates.length
        ? '<button type="button" class="te-add-block" data-add-block-section="' + cmsEscapeAttr(section.key) + '" data-block-owner="' + cmsEscapeAttr(owner) + '">+ Add block</button>' +
          '<div class="te-block-menu" data-block-menu="' + cmsEscapeAttr(owner + ':' + section.key) + '" hidden><select data-block-template="' + cmsEscapeAttr(owner + ':' + section.key) + '">' +
            blockTemplates.map(function(block) { return '<option value="' + cmsEscapeAttr(block.key) + '">' + cmsEscapeHtml(block.label || humanize(block.key)) + '</option>'; }).join('') +
          '</select><button type="button" class="te-media-button" data-insert-block="' + cmsEscapeAttr(section.key) + '" data-block-owner="' + cmsEscapeAttr(owner) + '">Add</button></div>'
        : '';

      const canReorder = !isGlobal && capabilities.reorder !== false;
      const metaText = (isGlobal ? 'global' : (visible ? section.status || 'draft' : 'hidden')) + ' · ' + fields.length + ' fields' + (blockMeta.length ? ' · ' + blockMeta.length + ' blocks' : '');

      return '<div class="te-tree-section" data-tree-section="' + cmsEscapeAttr(owner + ':' + section.key) + '" data-group="' + cmsEscapeAttr(group) + '">' +
        '<div class="te-tree-row' + (sectionSelected && !activeBlockId ? ' is-active' : '') + '" data-section-key="' + cmsEscapeAttr(section.key) + '" data-section-owner="' + cmsEscapeAttr(owner) + '" draggable="' + canReorder + '" data-index="' + index + '">' +
          '<button type="button" class="te-tree-row__main" data-select-section="' + cmsEscapeAttr(section.key) + '" data-section-owner="' + cmsEscapeAttr(owner) + '">' +
            '<span class="te-tree-row__icon">' + icon.section + '</span><span class="te-tree-row__copy"><span class="te-tree-row__name">' + cmsEscapeHtml(label) +
            '</span><span class="te-tree-row__meta">' + cmsEscapeHtml(metaText) + '</span></span>' +
          '</button>' +
          '<span class="te-tree-row__actions">' +
            (!isGlobal ? '<button type="button" class="te-tree-mini" data-toggle-section="' + cmsEscapeAttr(section.key) + '" data-section-owner="' + cmsEscapeAttr(owner) + '" title="' + (visible ? 'Hide section' : 'Show section') + '">' + (visible ? '◉' : '○') + '</button>' : '') +
            (!isGlobal && capabilities.duplicate !== false ? '<button type="button" class="te-tree-mini" data-duplicate-section="' + cmsEscapeAttr(section.key) + '" title="Duplicate section">⧉</button>' : '') +
            (!isGlobal && capabilities.remove !== false ? '<button type="button" class="te-tree-mini" data-remove-section="' + cmsEscapeAttr(section.key) + '" title="Remove section">×</button>' : '') +
          '</span></div>' +
          '<div class="te-block-list">' + blockRows + addBlock + '</div>' +
        '</div>';
    }

    const pageRows = pageSections.map(function(section, index) { return sectionNode(section, index, 'template'); }).join('');
    const headerRow = sectionNode(header, -1, 'header');
    const footerRow = sectionNode(footer, -1, 'footer');

    byId('te-tree').innerHTML =
      '<div class="te-tree-group te-tree-group--global"><div class="te-tree-group__label">Header</div>' + headerRow + '</div>' +
      '<div class="te-tree-group"><div class="te-tree-group__label">Template</div>' + pageRows + '</div>' +
      '<button type="button" class="te-add-section" id="te-add-section">+ Add section</button>' +
      '<div class="te-section-menu" id="te-section-menu" hidden>' +
        '<div class="te-section-menu__head"><strong>Add section · Shared library</strong><button type="button" class="te-tree-mini" id="te-section-cancel" aria-label="Close">×</button></div>' +
        '<input class="te-section-search" id="te-section-search" placeholder="Search sections" autocomplete="off">' +
        '<div class="te-section-catalog" id="te-section-catalog"></div>' +
      '</div>' +
      '<div class="te-tree-group te-tree-group--global"><div class="te-tree-group__label">Footer</div>' + footerRow + '</div>';

    function renderCatalog(query) {
      const needle = String(query || '').trim().toLowerCase();
      let entries = themeCatalog();
      if (!entries.length) {
        entries = Object.entries(registrySections).map(function(pair) {
          return { id: selectedTheme + '/' + pair[0], label: pair[1].label || humanize(pair[0]), type: pair[0], templateKey: pair[0], preset: selectedTheme + '/' + pair[0] };
        });
      }
      const filtered = entries.filter(function(entry) {
        return !needle || (entry.label + ' ' + entry.type + ' ' + entry.id).toLowerCase().includes(needle);
      });
      byId('te-section-catalog').innerHTML = filtered.length ? filtered.map(function(entry) {
        return '<button type="button" class="te-section-catalog-item" data-catalog-template="' + cmsEscapeAttr(entry.templateKey) + '" data-catalog-preset="' + cmsEscapeAttr(entry.preset || entry.id) + '">' +
          '<span class="te-section-catalog-item__icon">' + icon.section + '</span><span><strong>' + cmsEscapeHtml(entry.label) + '</strong><small>' + cmsEscapeHtml(humanize(entry.source || 'heuristic')) + ' · ' + cmsEscapeHtml(entry.type || entry.templateKey) + '</small></span>' +
        '</button>';
      }).join('') : '<div class="te-empty">No sections match that search.</div>';

      byId('te-section-catalog').querySelectorAll('[data-catalog-template]').forEach(function(button) {
        button.addEventListener('click', function() {
          insertSection(button.dataset.catalogTemplate, button.dataset.catalogPreset);
        });
      });
    }

    byId('te-tree').querySelectorAll('[data-select-section]').forEach(function(button) {
      button.addEventListener('click', function() {
        selectSection(button.dataset.selectSection, null, true, button.dataset.sectionOwner);
      });
    });
    byId('te-tree').querySelectorAll('[data-select-block]').forEach(function(button) {
      button.addEventListener('click', function() {
        selectBlock(button.dataset.blockSection, button.dataset.selectBlock, null, true, button.dataset.blockOwner);
      });
    });
    byId('te-tree').querySelectorAll('[data-toggle-section]').forEach(function(button) {
      button.addEventListener('click', function(event) {
        event.stopPropagation();
        const owner = button.dataset.sectionOwner || slug;
        const target = findSection(button.dataset.toggleSection, owner);
        const currentVisible = !target?.content?.__editor?.visibility || target.content.__editor.visibility.enabled !== false;
        setSectionVisibility(button.dataset.toggleSection, !currentVisible, owner);
      });
    });
    byId('te-tree').querySelectorAll('[data-duplicate-section]').forEach(function(button) {
      button.addEventListener('click', function(event) { event.stopPropagation(); duplicateSection(button.dataset.duplicateSection); });
    });
    byId('te-tree').querySelectorAll('[data-remove-section]').forEach(function(button) {
      button.addEventListener('click', function(event) { event.stopPropagation(); removeSection(button.dataset.removeSection); });
    });

    byId('te-tree').querySelectorAll('[data-add-block-section]').forEach(function(button) {
      button.addEventListener('click', function() {
        const ref = (button.dataset.blockOwner || slug) + ':' + button.dataset.addBlockSection;
        const menu = byId('te-tree').querySelector('[data-block-menu="' + CSS.escape(ref) + '"]');
        if (menu) menu.hidden = !menu.hidden;
      });
    });
    byId('te-tree').querySelectorAll('[data-insert-block]').forEach(function(button) {
      button.addEventListener('click', function() {
        const owner = button.dataset.blockOwner || slug;
        const ref = owner + ':' + button.dataset.insertBlock;
        const select = byId('te-tree').querySelector('[data-block-template="' + CSS.escape(ref) + '"]');
        if (select && select.value) insertBlock(button.dataset.insertBlock, select.value, owner);
      });
    });
    byId('te-tree').querySelectorAll('[data-duplicate-block]').forEach(function(button) {
      button.addEventListener('click', function(event) {
        event.stopPropagation();
        duplicateBlock(button.dataset.blockSection, button.dataset.duplicateBlock, button.dataset.blockOwner || slug);
      });
    });
    byId('te-tree').querySelectorAll('[data-remove-block]').forEach(function(button) {
      button.addEventListener('click', function(event) {
        event.stopPropagation();
        removeBlock(button.dataset.blockSection, button.dataset.removeBlock, button.dataset.blockOwner || slug);
      });
    });

    const add = byId('te-add-section');
    const menu = byId('te-section-menu');
    add?.addEventListener('click', function() {
      menu.hidden = false;
      add.hidden = true;
      renderCatalog('');
      requestAnimationFrame(function() { byId('te-section-search')?.focus(); });
    });
    byId('te-section-cancel')?.addEventListener('click', function() { menu.hidden = true; add.hidden = false; });
    byId('te-section-search')?.addEventListener('input', function(event) { renderCatalog(event.target.value); });

    let draggedKey = null;
    byId('te-tree').querySelectorAll('.te-tree-row[draggable="true"]').forEach(function(row) {
      row.addEventListener('dragstart', function() { draggedKey = row.dataset.sectionKey; row.classList.add('is-dragging'); });
      row.addEventListener('dragend', function() {
        draggedKey = null;
        row.classList.remove('is-dragging');
        byId('te-tree').querySelectorAll('.is-drop-target').forEach(function(node) { node.classList.remove('is-drop-target'); });
      });
      row.addEventListener('dragover', function(event) {
        if (!draggedKey || draggedKey === row.dataset.sectionKey) return;
        event.preventDefault();
        row.classList.add('is-drop-target');
      });
      row.addEventListener('dragleave', function() { row.classList.remove('is-drop-target'); });
      row.addEventListener('drop', function(event) {
        event.preventDefault();
        row.classList.remove('is-drop-target');
        if (!draggedKey || draggedKey === row.dataset.sectionKey) return;
        moveSection(draggedKey, Number(row.dataset.index));
      });
    });

    let draggedBlock = null;
    byId('te-tree').querySelectorAll('.te-block-row[draggable="true"]').forEach(function(row) {
      row.addEventListener('dragstart', function(event) {
        event.stopPropagation();
        draggedBlock = { id: row.dataset.blockId, section: row.dataset.blockSection, owner: row.dataset.blockOwner || slug };
        row.classList.add('is-dragging');
      });
      row.addEventListener('dragend', function(event) {
        event.stopPropagation();
        draggedBlock = null;
        row.classList.remove('is-dragging');
        byId('te-tree').querySelectorAll('.te-block-row.is-drop-target').forEach(function(node) { node.classList.remove('is-drop-target'); });
      });
      row.addEventListener('dragover', function(event) {
        if (!draggedBlock || draggedBlock.owner !== (row.dataset.blockOwner || slug) || draggedBlock.section !== row.dataset.blockSection || draggedBlock.id === row.dataset.blockId) return;
        event.preventDefault();
        event.stopPropagation();
        row.classList.add('is-drop-target');
      });
      row.addEventListener('dragleave', function() { row.classList.remove('is-drop-target'); });
      row.addEventListener('drop', function(event) {
        if (!draggedBlock || draggedBlock.owner !== (row.dataset.blockOwner || slug) || draggedBlock.section !== row.dataset.blockSection || draggedBlock.id === row.dataset.blockId) return;
        event.preventDefault();
        event.stopPropagation();
        row.classList.remove('is-drop-target');
        moveBlock(draggedBlock.section, draggedBlock.id, Number(row.dataset.blockIndex), draggedBlock.owner);
      });
    });
  }

  function renderField(section, field) {
    const value = valueForField(section, field);
    const safeValue = cmsEscapeAttr(String(value));
    const id = 'te-field-' + section.key + '-' + field.key.replace(/[^a-zA-Z0-9_-]/g, '-');
    const help = field.help ? '<div class="te-field-help">' + cmsEscapeHtml(field.help) + '</div>' : '';

    if (field.type === 'media' || field.type === 'video' || field.media) {
      const isImage = field.type !== 'video' && /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(String(value));
      const isVideo = field.type === 'video' || /\.(mp4|mov|webm)(\?|$)/i.test(String(value));
      let preview = '<div class="te-media-empty">' + (value ? cmsEscapeHtml(String(value).split('/').pop()) : 'Drop media here or choose from library') + '</div>';
      if (value && isImage) preview = '<img src="' + safeValue + '" alt="">';
      if (value && isVideo) preview = '<video src="' + safeValue + '" muted playsinline></video>';
      return '<div class="te-field" data-field-key="' + cmsEscapeAttr(field.key) + '"><label>' + cmsEscapeHtml(field.label) + '<span>' + (field.type === 'video' ? 'Video' : 'Media') + '</span></label>' +
        '<div class="te-media-drop" data-media-drop="' + cmsEscapeAttr(field.key) + '"><div class="te-media-preview">' + preview +
        '</div><div class="te-media-actions"><button type="button" class="te-media-button" data-pick-media="' + cmsEscapeAttr(field.key) + '">Choose</button>' +
        '<label class="te-media-button" style="display:inline-flex;align-items:center">Upload<input type="file" hidden data-upload-media="' + cmsEscapeAttr(field.key) + '" accept="' + (field.type === 'video' ? 'video/*' : 'image/*,video/*,.glb,.gltf,.usdz') + '"></label></div></div>' +
        '<input class="te-media-url" id="' + id + '" data-field-input="' + cmsEscapeAttr(field.key) + '" value="' + safeValue + '" placeholder="' + cmsEscapeAttr(field.placeholder || 'Media URL or path') + '">' + help + '</div>';
    }

    if (field.type === 'boolean') {
      return '<div class="te-setting-row te-field" data-field-key="' + cmsEscapeAttr(field.key) + '"><div><strong>' + cmsEscapeHtml(field.label) + '</strong>' +
        (field.help ? '<span>' + cmsEscapeHtml(field.help) + '</span>' : '') +
        '</div><button type="button" class="te-switch" role="switch" data-boolean-field="' + cmsEscapeAttr(field.key) + '" aria-checked="' + (Boolean(value) ? 'true' : 'false') + '"></button></div>';
    }

    if (field.type === 'select') {
      const options = Array.isArray(field.options) ? field.options : [];
      return '<div class="te-field" data-field-key="' + cmsEscapeAttr(field.key) + '"><label for="' + id + '">' + cmsEscapeHtml(field.label) + '<span>' + cmsEscapeHtml(field.group || 'Select') + '</span></label>' +
        '<select id="' + id + '" data-field-input="' + cmsEscapeAttr(field.key) + '">' +
        options.map(function(option) {
          return '<option value="' + cmsEscapeAttr(option.value) + '"' + (String(option.value) === String(value) ? ' selected' : '') + '>' + cmsEscapeHtml(option.label) + '</option>';
        }).join('') + '</select>' + help + '</div>';
    }

    if (field.type === 'range') {
      const min = field.min ?? 0;
      const max = field.max ?? 100;
      const step = field.step ?? 1;
      return '<div class="te-field" data-field-key="' + cmsEscapeAttr(field.key) + '"><label for="' + id + '">' + cmsEscapeHtml(field.label) + '<span>' + cmsEscapeHtml(field.unit || '') + '</span></label>' +
        '<div class="te-range-control"><input id="' + id + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + safeValue + '" data-range-field="' + cmsEscapeAttr(field.key) + '">' +
        '<input type="number" min="' + min + '" max="' + max + '" step="' + step + '" value="' + safeValue + '" data-number-pair="' + cmsEscapeAttr(field.key) + '"><span>' + cmsEscapeHtml(field.unit || '') + '</span></div>' + help + '</div>';
    }

    if (field.type === 'color') {
      const colorValue = /^#[0-9a-f]{6}$/i.test(String(value)) ? String(value) : '#ffffff';
      return '<div class="te-field" data-field-key="' + cmsEscapeAttr(field.key) + '"><label for="' + id + '">' + cmsEscapeHtml(field.label) + '<span>Color</span></label>' +
        '<div class="te-color-control"><input id="' + id + '" type="color" value="' + cmsEscapeAttr(colorValue) + '" data-color-field="' + cmsEscapeAttr(field.key) + '"><input type="text" value="' + safeValue + '" data-color-text="' + cmsEscapeAttr(field.key) + '"></div>' + help + '</div>';
    }

    if (field.type === 'rich_text') {
      return '<div class="te-field" data-field-key="' + cmsEscapeAttr(field.key) + '"><label>' + cmsEscapeHtml(field.label) + '<span>Rich text</span></label>' +
        '<div class="te-rich-toolbar" data-rich-toolbar="' + cmsEscapeAttr(field.key) + '">' +
          '<button type="button" data-rich-command="bold"><strong>B</strong></button>' +
          '<button type="button" data-rich-command="italic"><em>I</em></button>' +
          '<button type="button" data-rich-command="createLink">Link</button>' +
          '<button type="button" data-rich-command="insertUnorderedList">• List</button>' +
          '<button type="button" data-rich-command="insertOrderedList">1. List</button>' +
        '</div><div class="te-rich-input" contenteditable="true" data-rich-field="' + cmsEscapeAttr(field.key) + '">' + String(value || '') + '</div>' + help + '</div>';
    }

    if (field.type === 'product' || field.type === 'collection' || field.type === 'variant') {
      return '<div class="te-field" data-field-key="' + cmsEscapeAttr(field.key) + '"><label for="' + id + '">' + cmsEscapeHtml(field.label) + '<span>' + cmsEscapeHtml(humanize(field.type)) + '</span></label>' +
        '<select id="' + id + '" data-resource-field="' + cmsEscapeAttr(field.key) + '" data-resource-type="' + cmsEscapeAttr(field.type) + '"><option value="' + safeValue + '">' + cmsEscapeHtml(value ? String(value) : 'Loading…') + '</option></select>' + help + '</div>';
    }

    const inputType = field.type === 'number' ? 'number' : (field.type === 'link' || field.type === 'url' ? 'url' : 'text');
    const input = field.type === 'textarea'
      ? '<textarea id="' + id + '" rows="4" data-field-input="' + cmsEscapeAttr(field.key) + '" placeholder="' + cmsEscapeAttr(field.placeholder || '') + '">' + cmsEscapeHtml(String(value)) + '</textarea>'
      : '<input id="' + id + '" type="' + inputType + '" data-field-input="' + cmsEscapeAttr(field.key) + '" value="' + safeValue + '" placeholder="' + cmsEscapeAttr(field.placeholder || '') + '"' +
        (field.min !== undefined ? ' min="' + field.min + '"' : '') + (field.max !== undefined ? ' max="' + field.max + '"' : '') + (field.step !== undefined ? ' step="' + field.step + '"' : '') + '>';

    return '<div class="te-field" data-field-key="' + cmsEscapeAttr(field.key) + '"><label for="' + id + '">' + cmsEscapeHtml(field.label) + '<span>' + cmsEscapeHtml(field.type || field.key) + '</span></label>' + input + help + '</div>';
  }

  function renderSettings() {
    const section = currentSection();
    const settings = currentSettings();
    const grouped = {};
    settings.forEach(function(field) {
      const group = field.group || 'settings';
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(field);
    });

    let html = Object.keys(grouped).map(function(group) {
      return '<div class="te-setting-group"><div class="te-setting-group__title">' + cmsEscapeHtml(humanize(group)) + '</div>' +
        grouped[group].map(function(field) { return renderField(section, field); }).join('') + '</div>';
    }).join('');

    html += '<div class="te-setting-group"><div class="te-setting-group__title">Editor view</div><div class="te-setting-card">' +
      '<div class="te-setting-row"><div><strong>Editable outlines</strong><span>Show CMS boundaries in the live preview.</span></div><button type="button" class="te-switch" id="te-outline-switch" role="switch" aria-checked="' + showOutlines + '"></button></div>' +
      '<div class="te-setting-row"><div><strong>Auto-refresh preview</strong><span>Refresh after live draft updates.</span></div><button type="button" class="te-switch" id="te-auto-switch" role="switch" aria-checked="' + autoPreview + '"></button></div>' +
      '</div></div>';

    byId('te-inspector-body').innerHTML = html || '<div class="te-empty">No section settings registered.</div>';
    wireFields();

    const outlineSwitch = byId('te-outline-switch');
    if (outlineSwitch) outlineSwitch.addEventListener('click', function(event) {
      showOutlines = event.currentTarget.getAttribute('aria-checked') !== 'true';
      localStorage.setItem('fnf-theme-editor-outlines', showOutlines ? '1' : '0');
      event.currentTarget.setAttribute('aria-checked', String(showOutlines));
      bindPreviewSelection();
    });

    const autoSwitch = byId('te-auto-switch');
    if (autoSwitch) autoSwitch.addEventListener('click', function(event) {
      autoPreview = event.currentTarget.getAttribute('aria-checked') !== 'true';
      localStorage.setItem('fnf-theme-editor-auto-preview', autoPreview ? '1' : '0');
      event.currentTarget.setAttribute('aria-checked', String(autoPreview));
    });
  }

  function renderInspector() {
    const section = currentSection();
    if (!section) {
      byId('te-inspector-body').innerHTML = '<div class="te-empty">Choose a section to edit it.</div>';
      return;
    }

    const sectionSchema = currentSectionSchema();
    const blockMeta = currentBlockMeta();
    const blockSchema = currentBlockSchema();
    const sectionLabel = (sectionSchema && sectionSchema.label) || humanize(section.key);
    byId('te-inspector-title').textContent = blockMeta
      ? ((blockSchema && blockSchema.label) || humanize(blockMeta.templateKey || blockMeta.id))
      : sectionLabel;
    byId('te-inspector-subtitle').textContent = blockMeta
      ? sectionLabel + ' · ' + blockMeta.id
      : ((pageData && pageData.title) || humanize(slug)) + ' · ' + section.key;
    byId('te-section-status').textContent = section.status || 'draft';
    byId('te-section-status').className = 'te-badge' + (section.status === 'published' ? ' is-published' : '');

    byId('te-tabs').querySelectorAll('[data-tab]').forEach(function(tab) {
      tab.classList.toggle('is-active', tab.dataset.tab === activeTab);
    });

    if (activeTab === 'settings') {
      renderSettings();
      return;
    }

    const fields = currentSchema().filter(function(field) { return fieldKind(field) === activeTab; });
    if (!fields.length) {
      byId('te-inspector-body').innerHTML = '<div class="te-empty">No ' + cmsEscapeHtml(activeTab) + ' controls are registered for this section.</div>';
      return;
    }

    byId('te-inspector-body').innerHTML = fields.map(function(field) { return renderField(section, field); }).join('');
    wireFields();

    if (activeFieldKey) {
      requestAnimationFrame(function() {
        const node = document.querySelector('[data-field-key="' + CSS.escape(activeFieldKey) + '"]');
        if (node) {
          node.classList.add('is-selected');
          node.scrollIntoView({ block: 'nearest' });
        }
      });
    }
  }

  function wireFields() {
    document.querySelectorAll('[data-field-input]').forEach(function(input) {
      input.addEventListener('focus', function() {
        activeFieldKey = input.dataset.fieldInput;
        highlightPreviewSelection();
      });
      input.addEventListener('input', function() {
        const field = fieldByKey(input.dataset.fieldInput);
        if (!field) return;
        activeFieldKey = field.key;
        setFieldValue(field, input.value);
        syncMediaPreview(field.key, input.value);
      });
      input.addEventListener('change', function() {
        const field = fieldByKey(input.dataset.fieldInput);
        if (!field) return;
        activeFieldKey = field.key;
        setFieldValue(field, input.value);
      });
    });

    document.querySelectorAll('[data-boolean-field]').forEach(function(button) {
      button.addEventListener('click', function() {
        const field = fieldByKey(button.dataset.booleanField);
        if (!field) return;
        const next = button.getAttribute('aria-checked') !== 'true';
        button.setAttribute('aria-checked', String(next));
        activeFieldKey = field.key;
        setFieldValue(field, next);
      });
    });

    document.querySelectorAll('[data-range-field]').forEach(function(range) {
      const key = range.dataset.rangeField;
      const number = document.querySelector('[data-number-pair="' + CSS.escape(key) + '"]');
      function apply(value) {
        const field = fieldByKey(key);
        if (!field) return;
        range.value = value;
        if (number) number.value = value;
        activeFieldKey = key;
        setFieldValue(field, value);
      }
      range.addEventListener('input', function() { apply(range.value); });
      if (number) number.addEventListener('input', function() { apply(number.value); });
    });

    document.querySelectorAll('[data-color-field]').forEach(function(picker) {
      const key = picker.dataset.colorField;
      const text = document.querySelector('[data-color-text="' + CSS.escape(key) + '"]');
      function apply(value) {
        const field = fieldByKey(key);
        if (!field) return;
        if (/^#[0-9a-f]{6}$/i.test(value)) picker.value = value;
        if (text && text.value !== value) text.value = value;
        activeFieldKey = key;
        setFieldValue(field, value);
      }
      picker.addEventListener('input', function() { apply(picker.value); });
      if (text) text.addEventListener('change', function() { apply(text.value.trim()); });
    });

    document.querySelectorAll('[data-rich-field]').forEach(function(editor) {
      editor.addEventListener('input', function() {
        const field = fieldByKey(editor.dataset.richField);
        if (!field) return;
        activeFieldKey = field.key;
        setFieldValue(field, editor.innerHTML);
      });
    });

    document.querySelectorAll('[data-rich-toolbar]').forEach(function(toolbar) {
      toolbar.querySelectorAll('[data-rich-command]').forEach(function(button) {
        button.addEventListener('click', function() {
          const command = button.dataset.richCommand;
          const editor = toolbar.nextElementSibling;
          if (!editor) return;
          editor.focus();
          let value = null;
          if (command === 'createLink') value = prompt('Link URL') || null;
          if (command !== 'createLink' || value) document.execCommand(command, false, value);
          editor.dispatchEvent(new Event('input', { bubbles: true }));
        });
      });
    });

    document.querySelectorAll('[data-resource-field]').forEach(function(select) {
      hydrateResourceSelect(select);
      select.addEventListener('change', function() {
        const field = fieldByKey(select.dataset.resourceField);
        if (!field) return;
        activeFieldKey = field.key;
        setFieldValue(field, select.value);
      });
    });

    document.querySelectorAll('[data-pick-media]').forEach(function(button) {
      button.addEventListener('click', function() { openMediaPicker(button.dataset.pickMedia); });
    });

    document.querySelectorAll('[data-upload-media]').forEach(function(input) {
      input.addEventListener('change', async function() {
        if (!input.files || !input.files.length) return;
        try {
          const assets = await uploadFiles(Array.from(input.files));
          if (assets[0]) setMediaValue(input.dataset.uploadMedia, assets[0].url);
        } catch (error) {
          setNote(error.message || String(error), 'error');
        }
        input.value = '';
      });
    });

    document.querySelectorAll('[data-media-drop]').forEach(function(zone) {
      const fieldKey = zone.dataset.mediaDrop;
      ['dragenter', 'dragover'].forEach(function(type) {
        zone.addEventListener(type, function(event) {
          event.preventDefault();
          zone.classList.add('is-over');
        });
      });
      ['dragleave', 'drop'].forEach(function(type) {
        zone.addEventListener(type, function(event) {
          event.preventDefault();
          zone.classList.remove('is-over');
        });
      });
      zone.addEventListener('drop', async function(event) {
        const files = Array.from((event.dataTransfer && event.dataTransfer.files) || []);
        if (!files.length) return;
        try {
          const assets = await uploadFiles(files.slice(0, 1));
          if (assets[0]) setMediaValue(fieldKey, assets[0].url);
        } catch (error) {
          setNote(error.message || String(error), 'error');
        }
      });
    });
  }

  async function hydrateResourceSelect(select) {
    const type = select.dataset.resourceType;
    const field = fieldByKey(select.dataset.resourceField);
    const section = currentSection();
    const current = field && section ? valueForField(section, field) : '';

    try {
      let options = [];
      if (type === 'product') {
        if (!resourceCache.products) {
          const data = await adminFetch('/api/admin/products');
          resourceCache.products = (data.products || []).map(function(product) {
            return { value: product.slug || String(product.id), label: product.title || product.slug };
          });
        }
        options = resourceCache.products;
      } else if (type === 'collection') {
        if (!resourceCache.collections) {
          const data = await adminFetch('/api/store/collections');
          resourceCache.collections = (data.collections || []).map(function(collection) {
            return { value: collection.slug || String(collection.id), label: collection.title || collection.slug };
          });
        }
        options = resourceCache.collections;
      } else if (type === 'variant' && field && field.productKey) {
        const productSlug = cmsGetPath(section.content, field.productKey);
        if (productSlug) {
          const cacheKey = 'variants:' + productSlug;
          if (!resourceCache[cacheKey]) {
            const data = await adminFetch('/api/store/products/' + encodeURIComponent(productSlug));
            resourceCache[cacheKey] = (data.variants || []).map(function(variant) {
              const label = [variant.title, variant.size, variant.color, variant.sku].filter(Boolean).join(' · ');
              return { value: variant.sku || String(variant.id), label: label || String(variant.id) };
            });
          }
          options = resourceCache[cacheKey];
        }
      }

      const emptyLabel = type === 'variant' && field && !field.productKey ? 'Enter variant in schema' : 'None';
      select.innerHTML = '<option value="">' + emptyLabel + '</option>' + options.map(function(option) {
        return '<option value="' + cmsEscapeAttr(option.value) + '"' + (String(option.value) === String(current) ? ' selected' : '') + '>' + cmsEscapeHtml(option.label) + '</option>';
      }).join('');
    } catch (error) {
      select.innerHTML = '<option value="' + cmsEscapeAttr(String(current || '')) + '">' + cmsEscapeHtml(current ? String(current) : 'Unable to load options') + '</option>';
    }
  }

  function syncMediaPreview(fieldKey, value) {
    const zone = document.querySelector('[data-media-drop="' + CSS.escape(fieldKey) + '"]');
    if (!zone) return;
    const preview = zone.querySelector('.te-media-preview');
    const field = fieldByKey(fieldKey);
    const isVideo = field && field.type === 'video' || /\.(mp4|mov|webm)(\?|$)/i.test(String(value));
    const isImage = !isVideo && /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(String(value));
    if (value && isVideo) preview.innerHTML = '<video src="' + cmsEscapeAttr(value) + '" muted playsinline></video>';
    else if (value && isImage) preview.innerHTML = '<img src="' + cmsEscapeAttr(value) + '" alt="">';
    else preview.innerHTML = '<div class="te-media-empty">' + (value ? cmsEscapeHtml(String(value).split('/').pop()) : 'Drop media here or choose from library') + '</div>';
  }

  function setMediaValue(fieldKey, url) {
    const section = currentSection();
    if (!section) return;
    cmsSetPath(section.content, fieldKey, url);
    activeFieldKey = fieldKey;
    setDirty(true);
    dirtySections.add(dirtyRef(section));
    if (sectionOwner(section) === 'site') siteDraftTouched = true;
    renderInspector();
    scheduleLocalPreview();
    closeMediaPicker();
  }

  // The live HTML is the source of truth for a route not yet imported into CMS.
  // Never replace it with registry fixtures before extracting real fields.
  function captureLiveSource() {
    if (!liveUnimported || !pageData) return false;
    let doc;
    try { doc = byId('theme-preview').contentDocument; } catch { return false; }
    if (!doc || doc.documentElement?.getAttribute('data-cms-page') !== slug) {
      setNote('The live preview identity does not match this page; import cancelled.', 'error');
      return false;
    }
    const sections = [];
    let count = 0;
    for (const section of pageData.sections || []) {
      const region = Array.from(doc.querySelectorAll('[data-cms-section]')).find(function(node) {
        return node.dataset.cmsSection === section.key && !node.closest('[data-cms-scope="site"]');
      });
      const schema = window.SECTION_SCHEMAS?.[slug]?.[section.key];
      if (!region || !schema) continue;
      const controls = Array.from(region.querySelectorAll('[data-cms]'));
      const content = structuredClone(section.content || {});
      let matched = 0;
      for (const field of schema.fields || []) {
        let el = controls.find(function(node) { return node.dataset.cms === field.key; });
        if (!el && field.key.endsWith('.href')) {
          const alias = field.key.slice(0, -5) + '.label';
          el = controls.find(function(node) { return node.dataset.cms === alias; });
        }
        if (!el) continue;
        let value = '';
        if (field.key.endsWith('.href') || field.type === 'link') {
          value = el.getAttribute('href') || el.closest('a')?.getAttribute('href') || '';
        } else if (field.type === 'media' || field.type === 'video' || field.media) {
          value = el.getAttribute('src') || el.querySelector('img,video,source')?.getAttribute('src') || '';
        } else {
          const clone = el.cloneNode(true);
          clone.querySelectorAll('[aria-hidden="true"],svg').forEach(function(node) { node.remove(); });
          clone.querySelectorAll('br').forEach(function(node) { node.replaceWith('\n'); });
          value = String(clone.textContent || '').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
        }
        if (!value) continue;
        cmsSetPath(content, field.key, value);
        matched += 1;
      }
      if (matched) {
        content.__editor = { ...(content.__editor || {}), source: 'live-storefront' };
        sections.push({ ...section, content, status: 'draft', __ownerSlug: slug });
        count += matched;
      }
    }
    if (!sections.length) {
      setNote('This live route has no CMS-marked editable sections; nothing was imported.', 'error');
      return false;
    }
    pageData.sections = sections; // no synthetic newsletter or other missing regions
    if (!sections.some(function(section) { return section.key === activeSectionKey; })) {
      activeSectionKey = sections[0].key;
      activeSectionOwner = slug;
    }
    liveSourceCaptured = true;
    byId('te-import-live').hidden = false;
    byId('te-import-live').textContent = liveExistingDraft ? 'Use live layout (' + sections.length + ' sections)' : 'Import ' + sections.length + ' sections';
    byId('te-save').textContent = liveExistingDraft ? 'Reconcile & save draft' : 'Import & save draft';
    byId('te-preview-label').textContent = 'Live storefront — ' + sections.length + ' editable regions';
    setNote(count + ' real fields found. Import saves a private CMS draft; the storefront remains unchanged.', 'success');
    renderTree();
    renderInspector();
    return true;
  }

  async function importLiveSource() {
    if (!liveUnimported || !liveSourceCaptured) {
      setNote('Wait for the real storefront preview before importing.', 'error');
      return false;
    }
    if (liveExistingDraft && !window.confirm('Replace this page’s existing CMS draft with the actual live layout? The previous sections will be archived in R2. Your public storefront will not change until you explicitly publish.')) return false;
    const button = byId('te-import-live');
    button.disabled = true;
    setSaveState('Importing');
    try {
      await adminFetch('/api/admin/cms/pages/' + encodeURIComponent(slug) + '/import-live', {
        method: 'POST',
        body: JSON.stringify({ sections: pageData.sections.map(function(section) {
          return { key: section.key, content: section.content };
        }) })
      });
      liveUnimported = false;
      liveSourceCaptured = false;
      dirtySections.clear();
      setDirty(false);
      await loadPage();
      setNote('Existing storefront content imported into an unpublished CMS draft.', 'success');
      return true;
    } catch (error) {
      setNote(error.message || String(error), 'error');
      setSaveState('Import failed', 'error');
      return false;
    } finally {
      button.disabled = false;
    }
  }

  function pushLocalPreview() {
    const iframe = byId('theme-preview');
    if (!iframe?.contentWindow || !pageData) return;

    if (selectedTheme !== 'heuristic') {
      const runtime = window.ThemeStudioPreview;
      if (!runtime || !runtime.render) return;
      let html;
      try {
        html = runtime.render(selectedTheme, pageData, siteData);
        if (!html || !html.includes('<main>')) throw new Error('Theme renderer returned no page');
      } catch (error) {
        setNote('This theme preview could not render: ' + (error.message || String(error)), 'error');
        iframe.srcdoc = '<!doctype html><html><body style="font:16px system-ui;padding:40px;color:#333"><h2>Preview unavailable</h2><p>The selected theme did not provide a valid page renderer.</p></body></html>';
        return;
      }
      iframe.srcdoc = html;
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
      previewBlobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      byId('te-open-tab').href = previewBlobUrl;
      byId('te-preview-label').textContent = humanize(selectedTheme) + ' preview — ' + ((pageData && pageData.title) || humanize(slug));
      return;
    }

    iframe.contentWindow.postMessage({
      type: 'fnf-cms-preview',
      slug: slug,
      sections: (pageData.sections || []).map(function(section) {
        return { key: section.key, sort_order: section.sort_order, status: section.status, content: section.content || {} };
      }),
      siteSections: (siteData?.sections || []).map(function(section) {
        return { key: section.key, sort_order: section.sort_order, status: section.status, content: section.content || {} };
      })
    }, location.origin);
  }

  function scheduleLocalPreview() {
    clearTimeout(patchTimer);
    patchTimer = setTimeout(pushLocalPreview, 80);
  }

  function selectSection(sectionKey, fieldKey, scrollPreview, ownerSlug) {
    const section = findSection(sectionKey, ownerSlug);
    if (!section) return;
    activeSectionKey = sectionKey;
    activeSectionOwner = sectionOwner(section);
    activeBlockId = null;
    activeFieldKey = fieldKey || null;

    if (fieldKey) {
      const field = currentSchema().find(function(item) { return item.key === fieldKey; });
      activeTab = field ? fieldKind(field) : 'content';
    }

    renderTree();
    renderInspector();
    const prefix = activeSectionOwner === 'site' ? 'Global' : slug;
    byId('te-selected-path').textContent = fieldKey ? prefix + ' / ' + sectionKey + ' / ' + fieldKey : prefix + ' / ' + sectionKey;

    if (scrollPreview) {
      try {
        const doc = byId('theme-preview').contentDocument;
        const target = doc && doc.querySelector('[data-cms-section="' + CSS.escape(sectionKey) + '"], [data-section-id="' + CSS.escape(sectionKey) + '"]');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {}
    }
    highlightPreviewSelection();
  }

  function selectBlock(sectionKey, blockId, fieldKey, scrollPreview, ownerSlug) {
    const section = findSection(sectionKey, ownerSlug);
    const blockMeta = section && section.content && section.content.__editor && section.content.__editor.blocks;
    const block = Array.isArray(blockMeta) ? blockMeta.find(function(item) { return item.id === blockId; }) : null;
    if (!section || !block) return;

    activeSectionKey = sectionKey;
    activeSectionOwner = sectionOwner(section);
    activeBlockId = blockId;
    activeFieldKey = fieldKey || null;

    if (activeFieldKey && activeFieldKey.indexOf(blockId + '.') !== 0) activeFieldKey = blockId + '.' + activeFieldKey;

    if (activeFieldKey) {
      const field = currentSchema().find(function(item) { return item.key === activeFieldKey; });
      activeTab = field ? fieldKind(field) : 'content';
    } else if (!currentSchema().some(function(field) { return fieldKind(field) === activeTab; }) && activeTab !== 'settings') {
      activeTab = 'content';
    }

    renderTree();
    renderInspector();
    const prefix = activeSectionOwner === 'site' ? 'Global' : slug;
    byId('te-selected-path').textContent = activeFieldKey
      ? prefix + ' / ' + sectionKey + ' / ' + blockId + ' / ' + activeFieldKey.replace(blockId + '.', '')
      : prefix + ' / ' + sectionKey + ' / ' + blockId;

    if (scrollPreview) {
      try {
        const doc = byId('theme-preview').contentDocument;
        const sectionNode = doc && doc.querySelector('[data-cms-section="' + CSS.escape(sectionKey) + '"], [data-section-id="' + CSS.escape(sectionKey) + '"]');
        const target = sectionNode && sectionNode.querySelector('[data-cms-block="' + CSS.escape(blockId) + '"]');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {}
    }
    highlightPreviewSelection();
  }

  function bindPreviewSelection() {
    const frame = byId('theme-preview');
    let doc;
    try { doc = frame.contentDocument; } catch { return; }
    if (!doc || !doc.documentElement) return;

    let style = doc.getElementById('fnf-theme-editor-preview-style');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'fnf-theme-editor-preview-style';
      style.textContent =
        'html.fnf-theme-editor-outlines [data-cms-section]{outline:1px dashed rgba(95,67,213,.24);outline-offset:-1px}' +
        'html.fnf-theme-editor-outlines [data-cms]{cursor:pointer!important}' +
        'html.fnf-theme-editor-outlines [data-cms]:hover{outline:2px solid rgba(95,67,213,.52);outline-offset:2px}' +
        '[data-theme-editor-selected="true"]{outline:2px solid #7656ee!important;outline-offset:2px!important;box-shadow:0 0 0 3px rgba(118,86,238,.12)!important}';
      if (doc.head) doc.head.appendChild(style);
    }
    doc.documentElement.classList.toggle('fnf-theme-editor-outlines', showOutlines);

    if (doc.documentElement.dataset.fnfThemeEditorBound !== '1') {
      doc.documentElement.dataset.fnfThemeEditorBound = '1';
      doc.addEventListener('click', function(event) {
        const target = event.target && event.target.closest && event.target.closest('[data-cms], [data-cms-block], [data-cms-section], [data-section-id]');
        if (!target) return;

        const cmsNode = target.closest('[data-cms]');
        const blockNode = target.closest('[data-cms-block]');
        const sectionNode = target.closest('[data-cms-section], [data-section-id]');
        let sectionKey = sectionNode ? (sectionNode.getAttribute('data-cms-section') || sectionNode.getAttribute('data-section-id') || '') : '';
        const blockId = blockNode ? (blockNode.getAttribute('data-cms-block') || '') : '';
        let fieldKey = cmsNode ? (cmsNode.getAttribute('data-cms') || '') : '';

        if (!sectionKey && fieldKey.indexOf('.') > 0) {
          const first = fieldKey.split('.')[0];
          if (findSection(first, slug) || findSection(first, 'site')) sectionKey = first;
        }

        if (sectionKey && fieldKey.indexOf(sectionKey + '.') === 0) fieldKey = fieldKey.slice(sectionKey.length + 1);
        const owner = (sectionKey === 'header' || sectionKey === 'footer' || sectionKey === 'brand') ? 'site' : slug;
        if (!sectionKey || !findSection(sectionKey, owner)) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        if (blockId) selectBlock(sectionKey, blockId, fieldKey || null, false, owner);
        else selectSection(sectionKey, fieldKey || null, false, owner);
      }, true);
    }

    highlightPreviewSelection();
  }

  function highlightPreviewSelection() {
    let doc;
    try { doc = byId('theme-preview').contentDocument; } catch { return; }
    if (!doc) return;

    doc.querySelectorAll('[data-theme-editor-selected="true"]').forEach(function(node) {
      node.removeAttribute('data-theme-editor-selected');
    });

    let selected = null;
    if (activeFieldKey) {
      const section = doc.querySelector('[data-cms-section="' + CSS.escape(activeSectionKey || '') + '"], [data-section-id="' + CSS.escape(activeSectionKey || '') + '"]');
      const candidates = [activeFieldKey, activeSectionKey ? activeSectionKey + '.' + activeFieldKey : activeFieldKey];
      for (const key of candidates) {
        selected = (section && section.querySelector('[data-cms="' + CSS.escape(key) + '"]')) || doc.querySelector('[data-cms="' + CSS.escape(key) + '"]');
        if (selected) break;
      }
    }
    if (!selected && activeBlockId && activeSectionKey) {
      const section = doc.querySelector('[data-cms-section="' + CSS.escape(activeSectionKey) + '"], [data-section-id="' + CSS.escape(activeSectionKey) + '"]');
      selected = section && section.querySelector('[data-cms-block="' + CSS.escape(activeBlockId) + '"]');
    }
    if (!selected && activeSectionKey) {
      selected = doc.querySelector('[data-cms-section="' + CSS.escape(activeSectionKey) + '"], [data-section-id="' + CSS.escape(activeSectionKey) + '"]');
    }
    if (selected) selected.setAttribute('data-theme-editor-selected', 'true');
  }

  function setDevice(next) {
    device = next;
    localStorage.setItem('fnf-theme-editor-device', device);
    byId('te-preview-device').dataset.device = device;
    document.querySelectorAll('.te-device-btn').forEach(function(button) {
      button.classList.toggle('is-active', button.dataset.device === device);
    });
  }

  function refreshPreview() {
    if (selectedTheme !== 'heuristic') {
      pushLocalPreview();
      return;
    }
    if (previewBlobUrl) {
      URL.revokeObjectURL(previewBlobUrl);
      previewBlobUrl = null;
    }
    const route = pageRoute(slug);
    const separator = route.indexOf('?') >= 0 ? '&' : '?';
    byId('theme-preview').removeAttribute('srcdoc');
    byId('theme-preview').src = route + separator + (liveUnimported ? '_=' : 'preview=1&_=' ) + Date.now();
    byId('te-open-tab').href = liveUnimported ? route : route + separator + 'preview=1';
    byId('te-preview-label').textContent = liveUnimported ? 'Live storefront — source inspection' : 'Heuristic draft preview — ' + ((pageData && pageData.title) || humanize(slug));
  }

  function schedulePreview() {
    if (!autoPreview) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshPreview, 220);
  }

  async function loadPage() {
    setNote('');
    setSaveState('Loading');
    try {
      await loadCmsRegistry();
      const results = await Promise.all([
        adminFetch('/api/admin/cms/pages/' + encodeURIComponent(slug)),
        adminFetch('/api/admin/cms/pages').catch(function() { return { pages: [] }; }),
        adminFetch('/api/admin/cms/pages/site')
      ]);
      pageData = results[0].page;
      liveUnimported = !results[0].seeded && pageData.content_authority === 'storefront-html';
      liveSourceCaptured = false;
      if (liveUnimported) selectedTheme = 'heuristic';
      byId('te-import-live').hidden = true;
      byId('te-save').textContent = liveUnimported ? 'Import & save draft' : 'Save draft';
      siteData = results[2].page;
      pages = (results[1].pages || []).filter(function(page) { return page.slug !== 'site'; });

      (pageData.sections || []).forEach(function(section) { section.__ownerSlug = slug; });
      (siteData.sections || []).forEach(function(section) { section.__ownerSlug = 'site'; });

      if (!pages.some(function(page) { return page.slug === slug; })) pages.unshift({ slug: slug, title: pageData.title || humanize(slug) });

      const selectedStillExists = activeSectionKey && findSection(activeSectionKey, activeSectionOwner);
      if (!selectedStillExists) {
        activeSectionOwner = slug;
        activeSectionKey = pageData.sections && pageData.sections[0] ? pageData.sections[0].key : (siteData.sections?.find(function(section) { return section.key === 'header'; })?.key || null);
        activeBlockId = null;
        activeFieldKey = null;
      }

      if (activeBlockId) {
        const selectedSection = currentSection();
        const selectedBlocks = selectedSection?.content?.__editor?.blocks;
        if (!Array.isArray(selectedBlocks) || !selectedBlocks.some(function(block) { return block.id === activeBlockId; })) {
          activeBlockId = null;
          activeFieldKey = null;
        }
      }

      byId('te-page-title').textContent = pageData.title || humanize(slug);
      byId('te-page-settings').href = '/admin/page-edit?slug=' + encodeURIComponent(slug);
      byId('te-manage-page').href = '/admin/page-edit?slug=' + encodeURIComponent(slug);
      document.querySelectorAll('[data-theme-preview]').forEach(function(button) {
        button.classList.toggle('is-active', button.dataset.themePreview === selectedTheme);
      });
      syncPublishCapability();
      renderPageOptions('');
      renderTree();
      renderInspector();
      dirtySections.clear();
      setDirty(false);
      refreshPreview();
    } catch (error) {
      setNote(error.message || String(error), 'error');
      setSaveState('Load failed', 'error');
      byId('te-tree').innerHTML = '<div class="te-empty">' + cmsEscapeHtml(error.message || String(error)) + '</div>';
    }
  }

  async function saveDraft() {
    if (liveUnimported) return importLiveSource();
    const refs = dirtySections.size ? Array.from(dirtySections) : (activeSectionKey ? [activeSectionOwner + ':' + activeSectionKey] : []);
    if (!refs.length) return true;
    const button = byId('te-save');
    button.disabled = true;
    setNote('Saving…');
    try {
      for (const ref of refs) {
        const parsed = parseDirtyRef(ref);
        const section = findSection(parsed.key, parsed.owner);
        if (!section) continue;
        const result = await adminFetch('/api/admin/cms/pages/' + encodeURIComponent(parsed.owner) + '/sections/' + encodeURIComponent(section.key), {
          method: 'PUT',
          body: JSON.stringify({
            content: section.content,
            expected_version: Number(section.version || 0)
          })
        });
        section.status = 'draft';
        section.version = result.version ?? section.version;
        section.updated_at = result.updated_at || section.updated_at;
        if (parsed.owner === 'site') siteData.status = 'draft';
        else pageData.status = 'draft';
      }
      dirtySections.clear();
      setDirty(false);
      setNote(refs.length > 1 ? refs.length + ' section drafts saved.' : 'Draft saved.', 'success');
      renderTree();
      renderInspector();
      schedulePreview();
      return true;
    } catch (error) {
      const conflict = error?.status === 409;
      setNote(conflict ? 'This content changed in another tab. Reload before saving.' : (error.message || String(error)), 'error');
      setSaveState(conflict ? 'Reload required' : 'Save failed', 'error');
      return false;
    } finally {
      button.disabled = false;
    }
  }

  async function publishPage() {
    if (liveUnimported) {
      setNote('Import the existing live page before publishing any CMS draft.', 'error');
      return;
    }
    if (selectedTheme !== 'heuristic') {
      setNote('This theme is visual-preview only. Publication is disabled until its renderer and rollback pass acceptance.', 'error');
      return;
    }
    const button = byId('te-publish');
    button.disabled = true;
    button.textContent = 'Publishing…';
    try {
      if (dirty && !(await saveDraft())) throw new Error('Could not save draft before publishing');
      let siteResult = null;
      if (siteDraftTouched) {
        siteResult = await adminFetch('/api/admin/cms/pages/site/publish', { method: 'POST' });
        siteData.status = 'published';
        (siteData.sections || []).forEach(function(section) { section.status = 'published'; });
        siteDraftTouched = false;
      }
      const result = await adminFetch('/api/admin/cms/pages/' + encodeURIComponent(slug) + '/publish', { method: 'POST' });
      pageData.status = 'published';
      (pageData.sections || []).forEach(function(section) { section.status = 'published'; });
      setDirty(false);
      const publishedAt = result.published_at || siteResult?.published_at;
      setNote(publishedAt ? 'Published ' + fmtPageDate(publishedAt) + '.' : 'Published to live site.', 'success');
      renderTree();
      renderInspector();
      refreshPreview();
    } catch (error) {
      setNote(error.message || String(error), 'error');
      setSaveState('Publish failed', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Publish';
    }
  }

  async function insertSection(templateKey, themePreset) {
    setNote('Adding section…');
    try {
      const result = await adminFetch('/api/admin/cms/pages/' + encodeURIComponent(slug) + '/sections', {
        method: 'POST',
        body: JSON.stringify({
          templateKey: templateKey,
          themePreset: themePreset || '',
          toIndex: (pageData?.sections || []).length
        })
      });
      activeSectionOwner = slug;
      activeSectionKey = result.section_key;
      activeBlockId = null;
      activeFieldKey = null;
      setNote('Section added from ' + humanize(selectedTheme) + '.', 'success');
      await loadPage();
      selectSection(result.section_key, null, true, slug);
    } catch (error) {
      setNote(error.message || String(error), 'error');
    }
  }

  async function duplicateSection(sectionKey) {
    setNote('Duplicating section…');
    try {
      const result = await adminFetch('/api/admin/cms/pages/' + encodeURIComponent(slug) + '/sections/' + encodeURIComponent(sectionKey) + '/duplicate', {
        method: 'POST',
        body: JSON.stringify({})
      });
      activeSectionOwner = slug;
      activeSectionKey = result.section_key;
      activeBlockId = null;
      activeFieldKey = null;
      setNote('Section duplicated.', 'success');
      await loadPage();
      selectSection(result.section_key, null, true);
    } catch (error) {
      setNote(error.message || String(error), 'error');
    }
  }

  async function moveSection(sectionKey, toIndex) {
    try {
      await adminFetch('/api/admin/cms/pages/' + encodeURIComponent(slug) + '/sections/' + encodeURIComponent(sectionKey) + '/move', {
        method: 'POST',
        body: JSON.stringify({ toIndex: toIndex })
      });
      setNote('Section moved.', 'success');
      activeSectionOwner = slug;
      await loadPage();
      selectSection(sectionKey, null, true, slug);
    } catch (error) {
      setNote(error.message || String(error), 'error');
    }
  }

  async function setSectionVisibility(sectionKey, enabled, ownerSlug) {
    const owner = ownerSlug || slug;
    try {
      await adminFetch('/api/admin/cms/pages/' + encodeURIComponent(owner) + '/sections/' + encodeURIComponent(sectionKey) + '/visibility', {
        method: 'PUT',
        body: JSON.stringify({ enabled: enabled })
      });
      if (owner === 'site') siteDraftTouched = true;
      setNote(enabled ? 'Section shown.' : 'Section hidden.', 'success');
      await loadPage();
      if (findSection(sectionKey, owner)) selectSection(sectionKey, null, false, owner);
    } catch (error) {
      setNote(error.message || String(error), 'error');
    }
  }

  async function removeSection(sectionKey) {
    const section = (pageData?.sections || []).find(function(item) { return item.key === sectionKey; });
    if (!section) return;
    const label = (schemaForSection(section)?.label || humanize(sectionKey));
    if (!confirm('Remove "' + label + '" from this page? You can add it again later.')) return;

    try {
      await adminFetch('/api/admin/cms/pages/' + encodeURIComponent(slug) + '/sections/' + encodeURIComponent(sectionKey), {
        method: 'DELETE'
      });
      setNote('Section removed.', 'success');
      activeSectionKey = null;
      activeBlockId = null;
      activeFieldKey = null;
      await loadPage();
    } catch (error) {
      setNote(error.message || String(error), 'error');
    }
  }

  async function insertBlock(sectionKey, templateKey, ownerSlug) {
    const owner = ownerSlug || slug;
    setNote('Adding block…');
    try {
      const section = findSection(sectionKey, owner);
      const blocks = section?.content?.__editor?.blocks || [];
      const result = await adminFetch('/api/admin/cms/pages/' + encodeURIComponent(owner) + '/sections/' + encodeURIComponent(sectionKey) + '/blocks', {
        method: 'POST',
        body: JSON.stringify({ templateKey: templateKey, toIndex: blocks.length })
      });
      if (owner === 'site') siteDraftTouched = true;
      activeSectionOwner = owner;
      activeSectionKey = sectionKey;
      activeBlockId = result.block_id;
      activeFieldKey = null;
      setNote('Block added.', 'success');
      await loadPage();
      selectBlock(sectionKey, result.block_id, null, true, owner);
    } catch (error) {
      setNote(error.message || String(error), 'error');
    }
  }

  async function duplicateBlock(sectionKey, blockId, ownerSlug) {
    const owner = ownerSlug || slug;
    setNote('Duplicating block…');
    try {
      const result = await adminFetch('/api/admin/cms/pages/' + encodeURIComponent(owner) + '/sections/' + encodeURIComponent(sectionKey) + '/blocks/' + encodeURIComponent(blockId) + '/duplicate', {
        method: 'POST',
        body: JSON.stringify({})
      });
      if (owner === 'site') siteDraftTouched = true;
      activeSectionOwner = owner;
      activeSectionKey = sectionKey;
      activeBlockId = result.block_id;
      activeFieldKey = null;
      setNote('Block duplicated.', 'success');
      await loadPage();
      selectBlock(sectionKey, result.block_id, null, true, owner);
    } catch (error) {
      setNote(error.message || String(error), 'error');
    }
  }

  async function moveBlock(sectionKey, blockId, toIndex, ownerSlug) {
    const owner = ownerSlug || slug;
    try {
      await adminFetch('/api/admin/cms/pages/' + encodeURIComponent(owner) + '/sections/' + encodeURIComponent(sectionKey) + '/blocks/' + encodeURIComponent(blockId) + '/move', {
        method: 'POST',
        body: JSON.stringify({ toIndex: toIndex })
      });
      if (owner === 'site') siteDraftTouched = true;
      setNote('Block moved.', 'success');
      await loadPage();
      selectBlock(sectionKey, blockId, null, true, owner);
    } catch (error) {
      setNote(error.message || String(error), 'error');
    }
  }

  async function removeBlock(sectionKey, blockId, ownerSlug) {
    const owner = ownerSlug || slug;
    const section = findSection(sectionKey, owner);
    const meta = section?.content?.__editor?.blocks?.find(function(item) { return item.id === blockId; });
    const blockSchema = blockSchemaFor(section, meta);
    const label = (blockSchema && blockSchema.label) || humanize(blockId);
    if (!confirm('Remove "' + label + '" from this section?')) return;

    try {
      await adminFetch('/api/admin/cms/pages/' + encodeURIComponent(owner) + '/sections/' + encodeURIComponent(sectionKey) + '/blocks/' + encodeURIComponent(blockId), {
        method: 'DELETE'
      });
      if (owner === 'site') siteDraftTouched = true;
      setNote('Block removed.', 'success');
      if (activeBlockId === blockId) {
        activeBlockId = null;
        activeFieldKey = null;
      }
      activeSectionOwner = owner;
      activeSectionKey = sectionKey;
      await loadPage();
      selectSection(sectionKey, null, false, owner);
    } catch (error) {
      setNote(error.message || String(error), 'error');
    }
  }

  async function switchPage(nextSlug) {
    if (!nextSlug || nextSlug === slug) {
      closePageMenu();
      return;
    }
    if (dirty && !confirm('You have unsaved changes in this section. Switch pages anyway?')) return;
    slug = nextSlug;
    activeSectionOwner = slug;
    activeSectionKey = null;
    activeBlockId = null;
    activeFieldKey = null;
    history.replaceState(null, '', '?slug=' + encodeURIComponent(slug));
    closePageMenu();
    await loadPage();
  }

  function openPageMenu() {
    byId('te-page-popover').hidden = false;
    byId('te-page-trigger').setAttribute('aria-expanded', 'true');
    byId('te-page-search').value = '';
    renderPageOptions('');
    requestAnimationFrame(function() { byId('te-page-search').focus(); });
  }

  function closePageMenu() {
    byId('te-page-popover').hidden = true;
    byId('te-page-trigger').setAttribute('aria-expanded', 'false');
  }

  async function loadMedia() {
    const response = await adminFetch('/api/admin/media?view=all');
    mediaLibrary = response.assets || response.media || [];
    return mediaLibrary;
  }

  function renderMediaGrid(query) {
    const needle = String(query || '').trim().toLowerCase();
    const assets = mediaLibrary.filter(function(asset) {
      return !needle || ((asset.filename || '') + ' ' + (asset.folder || '') + ' ' + (asset.content_type || '')).toLowerCase().includes(needle);
    });

    byId('te-media-grid').innerHTML = assets.length ? assets.map(function(asset) {
      const isImage = String(asset.content_type || '').startsWith('image/');
      return '<button type="button" class="te-media-card" data-media-url="' + cmsEscapeAttr(asset.url || '') + '"><span class="te-media-card__thumb">' +
        (isImage ? '<img src="' + cmsEscapeAttr(asset.url || '') + '" alt="">' : '<span>' + cmsEscapeHtml((asset.content_type || 'file').split('/').pop()) + '</span>') +
        '</span><span class="te-media-card__copy"><strong>' + cmsEscapeHtml(asset.filename || asset.r2_key || 'Asset') + '</strong><span>' + cmsEscapeHtml(asset.folder || 'media') + '</span></span></button>';
    }).join('') : '<div class="te-empty" style="grid-column:1/-1">No media found.</div>';

    byId('te-media-grid').querySelectorAll('[data-media-url]').forEach(function(card) {
      card.addEventListener('click', function() { if (mediaTarget) setMediaValue(mediaTarget, card.dataset.mediaUrl); });
    });
  }

  async function openMediaPicker(fieldKey) {
    mediaTarget = fieldKey;
    byId('te-media-modal').hidden = false;
    byId('te-media-grid').innerHTML = '<div class="te-empty" style="grid-column:1/-1">Loading media…</div>';
    try {
      await loadMedia();
      renderMediaGrid('');
      byId('te-media-search').focus();
    } catch (error) {
      byId('te-media-grid').innerHTML = '<div class="te-empty" style="grid-column:1/-1">' + cmsEscapeHtml(error.message || String(error)) + '</div>';
    }
  }

  function closeMediaPicker() {
    byId('te-media-modal').hidden = true;
    mediaTarget = null;
    byId('te-media-search').value = '';
  }

  async function uploadFiles(files) {
    if (!files || !files.length) return [];
    setNote('Uploading ' + files.length + ' file' + (files.length === 1 ? '' : 's') + '…');
    const form = new FormData();
    files.forEach(function(file) { form.append('files', file); });
    form.append('prefix', 'uploads/theme-editor/');

    const response = await fetch('/api/admin/media', { method: 'POST', credentials: 'include', body: form });
    if (response.status === 401) {
      location.href = '/admin/login';
      throw new Error('Unauthorized');
    }
    const data = await response.json().catch(function() { return {}; });
    if (!response.ok) throw new Error(data.error || 'Upload failed');
    const assets = data.assets || [];
    mediaLibrary = assets.concat(mediaLibrary.filter(function(existing) {
      return !assets.some(function(asset) { return asset.id === existing.id; });
    }));
    setNote('Media uploaded.', 'success');
    if (!byId('te-media-modal').hidden) renderMediaGrid(byId('te-media-search').value);
    return assets;
  }

  document.querySelectorAll('[data-theme-preview]').forEach(function(button) {
    button.addEventListener('click', function() { setTheme(button.dataset.themePreview); });
  });

  document.querySelectorAll('.te-device-btn').forEach(function(button) {
    button.addEventListener('click', function() { setDevice(button.dataset.device); });
  });

  byId('te-tabs').querySelectorAll('[data-tab]').forEach(function(button) {
    button.addEventListener('click', function() {
      activeTab = button.dataset.tab;
      renderInspector();
    });
  });

  byId('te-page-trigger').addEventListener('click', function() {
    if (byId('te-page-popover').hidden) openPageMenu();
    else closePageMenu();
  });

  byId('te-page-search').addEventListener('input', function(event) { renderPageOptions(event.target.value); });
  byId('te-refresh').addEventListener('click', refreshPreview);
  byId('te-import-live').addEventListener('click', importLiveSource);
  byId('te-save').addEventListener('click', saveDraft);
  byId('te-publish').addEventListener('click', publishPage);
  byId('theme-preview').addEventListener('load', function() {
    bindPreviewSelection();
    // Reposting draft data is only needed for the live Heuristic iframe.
    // Alternate previews use srcdoc. Reassigning srcdoc on every iframe
    // load triggers an infinite navigation loop and leaves a blank canvas.
    if (selectedTheme === 'heuristic') {
      if (liveUnimported) {
        if (!dirty) captureLiveSource();
        else pushLocalPreview();
      } else pushLocalPreview();
    }
  });
  byId('te-media-close').addEventListener('click', closeMediaPicker);
  byId('te-media-search').addEventListener('input', function(event) { renderMediaGrid(event.target.value); });
  byId('te-media-upload').addEventListener('change', async function(event) {
    try { await uploadFiles(Array.from(event.target.files || [])); }
    catch (error) { setNote(error.message || String(error), 'error'); }
    event.target.value = '';
  });
  byId('te-media-modal').addEventListener('click', function(event) { if (event.target === byId('te-media-modal')) closeMediaPicker(); });

  document.addEventListener('click', function(event) {
    if (!byId('te-page-popover').hidden && !event.target.closest('.te-page-menu')) closePageMenu();
  });

  document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
      closePageMenu();
      closeMediaPicker();
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveDraft();
    }
  });

  window.addEventListener('beforeunload', function(event) {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  setDevice(device);
  loadPage();
})();