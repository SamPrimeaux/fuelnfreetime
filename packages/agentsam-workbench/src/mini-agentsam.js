import { attachCapabilityMenu } from './composer.js';

export const miniAgentSamTokens = {
  accent: '#8b5cf6',
  icon: 'https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/ac515729-af6b-4ea5-8b10-e581a4d02100/thumbnail',
};

/**
 * Reusable contextual AgentSam UI.
 *
 * The host owns resource discovery/authorization and transport. This package
 * owns selection feedback, positioning, attachments, capabilities and composer
 * interaction. A DOM selection is context only; authorization stays server-side.
 */
export function createMiniAgentSam(host) {
  const portal = document.createElement('div');
  portal.dataset.miniAgentsam = 'true';
  const root = portal.attachShadow({ mode: 'open' });

  root.innerHTML = `<style>
    :host{position:fixed;inset:0;z-index:10000;pointer-events:none;font:13px/1.4 system-ui;color:#f5f2fb;--accent:${miniAgentSamTokens.accent}}
    *{box-sizing:border-box}[hidden]{display:none!important}
    .outline{position:fixed;border:2px solid var(--accent);border-radius:6px;background:#8b5cf60c;box-shadow:0 0 0 1px #ffffff35 inset;pointer-events:none;transition:left .08s ease,top .08s ease,width .08s ease,height .08s ease}
    .hint{position:fixed;top:72px;left:50%;transform:translateX(-50%);max-width:min(520px,calc(100vw - 28px));padding:9px 14px;border:1px solid #ffffff2c;border-radius:999px;background:#211b30e8;backdrop-filter:blur(18px);box-shadow:0 10px 34px #160c3430;color:#eee7fb;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .composer{position:fixed;width:240px;min-height:44px;padding:6px;border:1px solid #ffffff2a;border-radius:24px;background:#211b30eb;backdrop-filter:blur(18px);box-shadow:0 12px 36px #160c342e;pointer-events:auto}
    .composer.expanded{width:min(360px,calc(100vw - 24px));border-radius:18px}
    .row{display:flex;align-items:center;gap:5px}.icon{width:24px;height:24px;border-radius:50%;flex:none}
    textarea{font:13px/1.4 system-ui;color:inherit;background:transparent;border:0;resize:none;width:100%;height:30px;padding:6px 0;outline:none}textarea::placeholder{color:#cac0dc}.expanded textarea{height:88px}
    button{border:0;background:transparent;color:#c5a5ff;cursor:pointer;min-width:28px;min-height:30px;border-radius:50%;font:inherit;padding:3px}.send{background:var(--accent);color:white;width:30px;flex:none}button:disabled{opacity:.45;cursor:wait}
    .tools{display:flex;align-items:center;gap:6px;margin-top:6px}.tools button{border-radius:8px}.tools .dismiss{margin-left:auto}.status{color:#d3bfff;margin:6px 8px 2px;overflow-wrap:anywhere}
    .thinking{background:linear-gradient(100deg,#b08aff 20%,#f3e9ff 45%,#a17bf7 70%);background-size:200%;color:transparent;background-clip:text;animation:shimmer 1.8s linear infinite}
    .attachments{display:flex;flex-wrap:wrap;gap:4px}.attachments button{font-size:11px;max-width:100%;overflow:hidden;text-overflow:ellipsis;border-radius:8px}
    :focus-visible{outline:2px solid #c1a3ff;outline-offset:2px}
    @keyframes shimmer{to{background-position:-200%}}
    @media(max-width:600px){.hint{top:62px}.composer{max-width:calc(100vw - 24px)}}
    @media(prefers-reduced-motion:reduce){${'*'}animation:none!important}}
  </style>
  <div class="outline" hidden></div>
  <div class="hint" role="status" aria-live="polite" hidden>Click an element to annotate · Esc to exit</div>
  <section class="composer" aria-label="miniAgentSam" hidden>
    <div class="row">
      <img class="icon" src="${miniAgentSamTokens.icon}" alt="AgentSam">
      <textarea aria-label="Ask for changes" placeholder="Ask for changes"></textarea>
      <button class="send" aria-label="Send">↓</button>
    </div>
    <div class="tools" hidden>
      <button class="attach" aria-label="Attach files">＋</button>
      <button class="mic" aria-label="Talk to type">Mic</button>
      <button class="dismiss" aria-label="Close miniAgentSam">×</button>
    </div>
    <div class="capabilities attachments"></div>
    <div class="files attachments"></div>
    <p class="status" role="status" aria-live="polite" hidden></p>
  </section>`;

  document.body.append(portal);

  const composer = root.querySelector('.composer');
  const input = root.querySelector('textarea');
  const status = root.querySelector('.status');
  const outline = root.querySelector('.outline');
  const hint = root.querySelector('.hint');
  let resource = null;
  let rect = null;
  let busy = false;
  let request = null;
  let expanded = false;
  let preview = null;
  const capabilities = new Set();

  const resolveRect = () => {
    if (!rect) return null;
    try {
      return typeof rect === 'function' ? rect() : rect;
    } catch {
      return null;
    }
  };

  function positionOutline() {
    const r = resolveRect();
    if (!r) {
      outline.hidden = true;
      return null;
    }
    Object.assign(outline.style, {
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
    });
    return r;
  }

  function position() {
    const r = positionOutline();
    if (!r || composer.hidden) return;

    const width = composer.offsetWidth;
    const height = composer.offsetHeight;
    const left = Math.max(
      12,
      Math.min(innerWidth - width - 12, r.left + r.width / 2 - width / 2),
    );
    const below = r.top + r.height + 12;
    const top = Math.max(
      12,
      Math.min(
        innerHeight - height - 12,
        below + height < innerHeight ? below : r.top - height - 12,
      ),
    );
    Object.assign(composer.style, { left: `${left}px`, top: `${top}px` });
  }

  const menuCleanup = attachCapabilityMenu(input, {
    list: () => host.capabilities?.list() || [],
    select: (item) => {
      capabilities.add(item.id);
      renderCapabilities();
    },
  });

  function renderCapabilities() {
    const tray = root.querySelector('.capabilities');
    tray.replaceChildren();
    for (const id of capabilities) {
      const button = document.createElement('button');
      button.textContent = `@${id} ×`;
      button.setAttribute('aria-label', `Remove ${id}`);
      button.onclick = () => {
        capabilities.delete(id);
        input.value = input.value.split(`@${id} `).join('');
        renderCapabilities();
      };
      tray.append(button);
    }
    position();
  }

  function expand() {
    expanded = true;
    composer.classList.add('expanded');
    root.querySelector('.tools').hidden = false;
    position();
  }

  function stopSelecting() {
    hint.hidden = true;
    if (!resource) {
      rect = null;
      outline.hidden = true;
    }
  }

  function close() {
    request?.abort();
    composer.hidden = true;
    outline.hidden = true;
    hint.hidden = true;
    preview?.remove();
    preview = null;
    resource = null;
    rect = null;
    host.onClose?.();
  }

  function showStatus(text, thinking = false) {
    status.textContent = text;
    status.hidden = !text;
    status.classList.toggle('thinking', thinking);
    position();
  }

  function phase(event) {
    if (event?.phase !== 'generating') {
      preview?.remove();
      preview = null;
      return;
    }
    const mount = host.generationMount?.();
    if (mount && !preview) {
      preview = createCodePreview();
      mount.append(preview);
    }
  }

  function renderAttachments() {
    const tray = root.querySelector('.files');
    tray.replaceChildren();
    for (const item of host.attachments?.items || []) {
      const button = document.createElement('button');
      button.textContent = `${item.name || item.file_name || 'Attachment'} ×`;
      button.onclick = () => {
        host.attachments.remove(item.id || item.attachment_id);
        renderAttachments();
      };
      tray.append(button);
    }
    position();
  }

  async function send() {
    const prompt = input.value.trim();
    if (!prompt || !resource || busy) return;

    busy = true;
    const controller = new AbortController();
    request = controller;
    root.querySelector('.send').disabled = true;
    input.disabled = true;
    showStatus('Thinking…', true);

    try {
      const result = await host.send({
        prompt,
        resource,
        capabilities: [...capabilities],
        attachments: host.attachments?.items || [],
        signal: controller.signal,
        onPhase: phase,
      });
      if (controller.signal.aborted) return;
      input.value = '';
      input.placeholder = 'Add follow-up instructions…';
      host.attachments?.clear();
      renderAttachments();
      showStatus('Reply in AgentSam');
      host.onResult?.(result);
    } catch (error) {
      if (!controller.signal.aborted) {
        showStatus(error.message || 'Could not send. Try again.');
      }
    } finally {
      if (request === controller) {
        busy = false;
        input.disabled = false;
        root.querySelector('.send').disabled = false;
        status.classList.remove('thinking');
        phase({ phase: 'complete' });
      }
    }
  }

  input.addEventListener('focus', expand);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      send();
    }
  });

  root.querySelector('.send').onclick = send;
  root.querySelector('.dismiss').onclick = close;
  root.querySelector('.mic').hidden = !host.voice;
  root.querySelector('.mic').onclick = async () => {
    try {
      input.value += await host.voice.transcribe();
    } catch (error) {
      showStatus(error.message);
    }
  };
  root.querySelector('.attach').hidden = !host.attachments;
  root.querySelector('.attach').onclick = () => {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.multiple = true;
    picker.onchange = async () => {
      try {
        await host.attachments.add([...picker.files]);
        renderAttachments();
      } catch (error) {
        showStatus(error.message);
      }
    };
    picker.click();
  };

  addEventListener('resize', position);
  addEventListener('scroll', position, true);

  return {
    startSelecting(message = 'Click an element to annotate · Esc to exit') {
      resource = null;
      rect = null;
      composer.hidden = true;
      outline.hidden = true;
      hint.textContent = message;
      hint.hidden = false;
    },
    stopSelecting,
    highlight(bounds) {
      if (resource || busy) return;
      rect = bounds;
      outline.hidden = false;
      positionOutline();
    },
    clearHighlight() {
      if (resource) return;
      rect = null;
      outline.hidden = true;
    },
    select(selection, bounds) {
      if (busy) close();
      resource = selection;
      rect = bounds;
      hint.hidden = true;
      composer.hidden = false;
      outline.hidden = false;
      expanded = false;
      composer.classList.remove('expanded');
      root.querySelector('.tools').hidden = true;
      input.value = '';
      input.placeholder = 'Ask for changes';
      showStatus('');
      position();
    },
    close,
    destroy() {
      close();
      menuCleanup();
      removeEventListener('resize', position);
      removeEventListener('scroll', position, true);
      portal.remove();
    },
    get expanded() {
      return expanded;
    },
  };
}

export function createCodePreview() {
  const el = document.createElement('div');
  el.setAttribute('aria-label', 'AgentSam generating');
  el.setAttribute('role', 'status');
  const shadow = el.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>
    :host{display:block;width:min(230px,100%);height:230px;border-radius:18px;overflow:hidden;background:#201a2e;color:#ece4fb;padding:16px;box-sizing:border-box;font:12px system-ui}
    .lines{margin-top:22px;display:grid;gap:9px;mask-image:linear-gradient(transparent,#000 12%,#000 78%,transparent);animation:flow 3s ease-in-out infinite alternate}
    .lines i{height:5px;border-radius:4px;background:linear-gradient(90deg,#a78bfa,#c2e4ff,#e2a3d0,#9ce6dd)}
    @keyframes flow{to{transform:translateY(-12px)}}
    @media(prefers-reduced-motion:reduce){.lines{animation:none}}
  </style>
  <strong>AgentSam · Writing styles</strong>
  <div class="lines" aria-hidden="true">${[78,54,88,62,72,43,83,58,70,48,76,55].map((w,i)=>`<i style="width:${w}%;margin-left:${i%3*6}px"></i>`).join('')}</div>`;
  return el;
}
