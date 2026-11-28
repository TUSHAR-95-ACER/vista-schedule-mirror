import { act, render } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { MarketSentimentSlider } from '@/components/shared/MarketSentimentSlider';

function ControlledSlider() {
  const [value, setValue] = useState(50);
  return <MarketSentimentSlider value={value} onChange={setValue} display="split-bar" />;
}

describe('Daily Plan market sentiment slider', () => {
  it('raises bearish percentage on the green/right side and bullish percentage on the red/left side', () => {
    const { getByRole } = render(<ControlledSlider />);
    const slider = getByRole('slider', { name: 'Market sentiment' });
    Object.defineProperty(slider, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, right: 100, top: 0, bottom: 6, width: 100, height: 6, x: 0, y: 0, toJSON: () => ({}) }),
    });

    const dispatchPointer = (type: string, clientX: number) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX });
      Object.defineProperties(event, {
        pointerId: { value: 1 },
        pointerType: { value: 'mouse' },
      });
      slider.dispatchEvent(event);
    };

    act(() => dispatchPointer('pointerdown', 90));
    expect(slider).toHaveAttribute('aria-valuetext', '90% bearish, 10% bullish');
    act(() => dispatchPointer('pointermove', 10));
    expect(slider).toHaveAttribute('aria-valuetext', '10% bearish, 90% bullish');
  });
});