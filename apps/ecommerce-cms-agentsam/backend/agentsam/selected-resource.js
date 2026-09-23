import { slugForStorefrontPath } from '../cms/html-rewriter.js';
/** Store-local session authorization precedes this lookup in the admin router. */
export async function resolveSelectedResource(env, resource) {
  if (!resource || resource.type !== 'section' || resource.surface !== 'theme-studio') throw new Error('Unsupported editable resource');
  const slug = slugForStorefrontPath(String(resource.page || ''));
  if (!slug || typeof resource.id !== 'string' || resource.id.length > 100) throw new Error('Invalid store selection');
  const section = await env.DB.prepare('SELECT s.id,s.section_key,p.slug FROM page_sections s JOIN pages p ON p.id=s.page_id WHERE p.slug=? AND s.section_key=?')
    .bind(slug, resource.id).first();
  if (!section) throw new Error('Selected section does not belong to this store');
  return {type:'section',id:section.id,key:section.section_key,page:section.slug,surface:'theme-studio',label:String(resource.label || '').slice(0,160)};
}
