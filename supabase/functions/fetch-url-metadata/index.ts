const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractMeta(html: string, property: string): string {
  // Try og: meta
  const ogMatch = html.match(new RegExp(`<meta[^>]*property=["']og:${property}["'][^>]*content=["']([^"']*)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']og:${property}["']`, 'i'));
  if (ogMatch) return ogMatch[1];

  // Try twitter: meta
  const twMatch = html.match(new RegExp(`<meta[^>]*name=["']twitter:${property}["'][^>]*content=["']([^"']*)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']twitter:${property}["']`, 'i'));
  if (twMatch) return twMatch[1];

  // Try regular meta for description
  if (property === 'description') {
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
    if (descMatch) return descMatch[1];
  }

  return '';
}

function detectContentType(url: string, contentType: string): 'image' | 'video' | 'article' | 'link' {
  const u = url.toLowerCase();
  
  // Image URLs
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)(\?|$)/i.test(u) || contentType?.startsWith('image/')) {
    return 'image';
  }
  
  // Video URLs
  if (u.includes('youtube.com') || u.includes('youtu.be') || u.includes('vimeo.com') ||
      /\.(mp4|webm|mov)(\?|$)/i.test(u) || contentType?.startsWith('video/')) {
    return 'video';
  }
  
  // HTML = article
  if (contentType?.includes('text/html')) return 'article';
  
  return 'link';
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: 'URL required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Follow redirects (resolves short URLs like aje.news, bit.ly, etc.)
    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkPreview/1.0)' },
      signal: AbortSignal.timeout(8000),
    });

    const finalUrl = response.url;
    const contentType = response.headers.get('content-type') || '';
    const type = detectContentType(finalUrl, contentType);

    let domain = '';
    try { domain = new URL(finalUrl).hostname.replace('www.', ''); } catch {}

    // For images, just return the URL
    if (type === 'image') {
      return new Response(JSON.stringify({
        success: true, type: 'image', url: finalUrl, domain,
        title: '', description: '', image: finalUrl,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // For videos, check YouTube
    if (type === 'video') {
      const ytId = getYouTubeId(finalUrl);
      const result: Record<string, unknown> = {
        success: true, type: 'video', url: finalUrl, domain,
        title: '', description: '', image: '',
      };

      if (ytId) {
        result.youtubeId = ytId;
        result.image = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      }

      // Try to get OG data for video pages
      if (contentType.includes('text/html')) {
        const html = await response.text();
        result.title = extractMeta(html, 'title') || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || '';
        result.description = extractMeta(html, 'description');
        if (!result.image) result.image = extractMeta(html, 'image');
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For articles/links, parse HTML
    if (contentType.includes('text/html')) {
      const html = await response.text();
      const title = extractMeta(html, 'title') || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || '';
      const description = extractMeta(html, 'description');
      let image = extractMeta(html, 'image');

      // Resolve relative image URLs
      if (image && !image.startsWith('http')) {
        try {
          image = new URL(image, finalUrl).href;
        } catch {}
      }

      const siteName = extractMeta(html, 'site_name');

      return new Response(JSON.stringify({
        success: true, type: title || description ? 'article' : 'link',
        url: finalUrl, domain, title, description, image, siteName,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fallback
    return new Response(JSON.stringify({
      success: true, type: 'link', url: finalUrl, domain,
      title: '', description: '', image: '',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch metadata';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
