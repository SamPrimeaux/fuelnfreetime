/* Fuel & Free Time host adapter. miniAgentSam owns reusable UI. */
(() => {
  let instance, active=false, mounted=false;
  async function init() {
    if(mounted || !/^\/admin\/(theme-editor|page-edit)\/?$/.test(location.pathname))return;
    const bar=document.querySelector('.console-topbar-actions');
    if(!bar)return;
    mounted=true;
    const {createMiniAgentSam,createAttachmentController}=await import('/admin/workbench/index.js');
    const button=document.createElement('button');button.className='console-icon-btn';button.dataset.inspectToggle='true';button.textContent='⌖';button.title='Ask for changes';button.setAttribute('aria-label','Select a store element');button.setAttribute('aria-pressed','false');
    const attachments=createAttachmentController({upload:async file=>{
      const form=new FormData();form.append('file',file);
      const response=await fetch('/api/admin/agentsam/files/upload',{method:'POST',credentials:'include',body:form});
      const data=await response.json();if(!response.ok)throw new Error(data.error || 'Upload failed');return data.file || data.attachment || data;
    }});
    instance=createMiniAgentSam({
      attachments,
      capabilities:{list:async()=>{const response=await fetch('/api/admin/agentsam/mcp/status',{credentials:'include'});if(!response.ok)return [];const data=await response.json();return (data.mcp_servers || []).filter(s=>s.connected).map(s=>({id:s.slug,label:s.display_name || s.slug}));}},
      generationMount:()=>document.querySelector('.theme-editor-panel'),
      onClose:()=>{active=false;button.setAttribute('aria-pressed','false');},
      send:async({prompt,resource,capabilities,attachments,signal})=>{
        if(!window.sendAgentsamMessage)throw new Error('AgentSam is unavailable. Your instructions are retained.');
        window.openAgentsamDrawer?.();
        return await window.sendAgentsamMessage(prompt,{context:{selected_resource:resource,active_mcp_connections:capabilities},attachments,signal,propagateError:true});
      }
    });
    button.onclick=()=>{active=!active;button.setAttribute('aria-pressed',String(active));if(!active)instance.close();};bar.prepend(button);
    const watched=new WeakSet();
    function attach(frame){
      let doc;try{const url=new URL(frame.src,location.href);if(url.origin!==location.origin || url.pathname.startsWith('/admin'))return;doc=frame.contentDocument;}catch{return;}
      if(!doc || watched.has(doc))return;watched.add(doc);
      doc.addEventListener('click',event=>{
        if(!active)return;
        const target=event.target.closest?.('[data-section-id], [data-cms-section], [data-cms]');
        if(!target)return;
        event.preventDefault();event.stopImmediatePropagation();active=false;button.setAttribute('aria-pressed','false');
        const element=event.target;
        const sourceId=(target.getAttribute('data-section-id') || target.getAttribute('data-cms-section') || target.getAttribute('data-cms')).split('.')[0];
        instance.select({type:'section',id:sourceId,label:(element.getAttribute('aria-label') || element.getAttribute('alt') || element.textContent || 'Selected section').trim().slice(0,160),page:new URL(frame.src,location.href).pathname,surface:'theme-studio'},()=>{
          const a=element.getBoundingClientRect(),b=frame.getBoundingClientRect();return {left:a.left+b.left,top:a.top+b.top,width:a.width,height:a.height};
        });
      },true);
      doc.addEventListener('keydown',e=>{if(e.key==='Escape')instance.close();});
    }
    function frames(){for(const frame of document.querySelectorAll('#theme-preview, iframe[data-cms-preview]')){if(!frame.dataset.miniBound){frame.dataset.miniBound='true';frame.addEventListener('load',()=>{instance.close();attach(frame);});}attach(frame);}}
    frames();new MutationObserver(frames).observe(document.body,{childList:true,subtree:true});
  }
  window.initEcommerceInspector=init;
  init().catch(error=>console.error('miniAgentSam could not load',error.message));
})();
