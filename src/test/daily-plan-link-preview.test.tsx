import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UnifiedMediaBox } from '@/components/shared/UnifiedMediaBox';
import { encodeLinkMeta } from '@/lib/mediaSlot';

const failedArticle = encodeLinkMeta({
  url: 'https://news.example.com/markets/market-rally',
  domain: 'news.example.com',
  siteName: 'News Example',
  title: '403 Forbidden',
  type: 'article',
});

describe('Daily Plan news link previews', () => {
  it('shows a clean article title without a generated webpage screenshot when disabled', () => {
    const { container } = render(
      <UnifiedMediaBox value={failedArticle} onChange={vi.fn()} label="Economic Calendar / News Screenshots" allowPageScreenshot={false} />,
    );

    expect(screen.getByText('Market Rally')).toBeInTheDocument();
    expect(screen.queryByText('403 Forbidden')).not.toBeInTheDocument();
    expect(container.querySelector('img[src*="s.wordpress.com/mshots"]')).toBeNull();
    expect(screen.queryByText('Screenshot unavailable')).not.toBeInTheDocument();
  });

  it('preserves webpage screenshot previews for other media-box uses by default', () => {
    const { container } = render(
      <UnifiedMediaBox value={failedArticle} onChange={vi.fn()} label="News" />,
    );

    expect(container.querySelector('img[src*="s.wordpress.com/mshots"]')).not.toBeNull();
  });
});