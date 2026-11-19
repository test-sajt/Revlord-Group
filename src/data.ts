// Kategorije i grane služe samo za navigaciju. Oglasi i radovi uvek dolaze iz baze.
export const categories = [['development', 'code', 'Programiranje', 'Development', ['Aplikacije / Apps', 'Python', 'JavaScript'], ['Igre / Games', 'Roblox', 'Unity']], ['design', 'pen', 'Dizajn', 'Design', ['Interfejsi / Interfaces', 'UI', 'UX'], ['Identitet / Identity', 'Branding', 'Logo']], ['3d', 'box', '3D modelovanje', '3D modelling', ['Igre / Games', 'Roblox', 'Unity', 'Unreal'], ['Modelovanje / Modelling', 'Blender', 'Cinema 4D']], ['scripting', 'terminal', 'Skriptovanje', 'Scripting', ['Igre / Games', 'Roblox', 'Unity'], ['Automatizacija / Automation', 'Python', 'JavaScript']], ['web', 'web', 'Izrada sajtova', 'Web development', ['Sajtovi / Websites', 'React', 'WordPress'], ['Prodavnice / Stores', 'Shopify', 'WooCommerce']], ['video', 'film', 'Video montaža', 'Video editing', ['Montaža / Editing', 'Premiere Pro', 'DaVinci Resolve'], ['Animacija / Animation', 'After Effects', 'Blender']]] as const;
export function videoEmbed(input: string) {
  try {
    const u = new URL(input);
    if (u.protocol !== 'https:') return '';
    const h = u.hostname.replace(/^www\./, '');
    const id = h === 'youtu.be' ? u.pathname.slice(1) : h === 'youtube.com' ? u.searchParams.get('v') : '';
    if (id && /^[\w-]{11}$/.test(id)) return 'https://www.youtube-nocookie.com/embed/' + id;
    if (h === 'vimeo.com' && /^\/\d+$/.test(u.pathname)) return 'https://player.vimeo.com/video' + u.pathname;
  } catch {}
  return '';
}
export function safeLink(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' ? u.href : '';
  } catch {
    return '';
  }
}
export function internal(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : '/panel';
}
export const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replaceAll('đ', 'dj');
