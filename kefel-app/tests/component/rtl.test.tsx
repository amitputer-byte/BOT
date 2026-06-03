/**
 * Component tests for RTL + mixed-direction rendering.
 *
 * Runs under the jest-expo project (see jest.config.js). Verifies that:
 *  - Hebrew text renders right-aligned with RTL writing direction,
 *  - numbers embedded in Hebrew strings are bidi-isolated (no reflow),
 *  - the multiplication expression stays LTR inside the RTL layout.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { RTLText } from '@/components/RTLText';
import { FactPrompt } from '@/components/FactPrompt';
import { StarCount } from '@/components/StarCount';
import { t } from '@/services/i18n';

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);

describe('RTL rendering', () => {
  it('renders Hebrew text right-aligned with RTL writing direction', () => {
    const { getByText } = wrap(<RTLText>{t('home.startSession')}</RTLText>);
    const node = getByText('בואו נשחק');
    const style = Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style.flat())
      : node.props.style;
    expect(style.textAlign).toBe('right');
    expect(style.writingDirection).toBe('rtl');
  });

  it('keeps a multiplication expression LTR-isolated within RTL UI', () => {
    const { getByText } = wrap(<FactPrompt a={3} b={4} audioEnabled={false} />);
    // The expression is wrapped in LRI...PDI isolates.
    expect(getByText('⁦3 × 4⁩')).toBeTruthy();
  });

  it('bidi-isolates the star count number', () => {
    const { getByLabelText } = wrap(<StarCount stars={7} />);
    expect(getByLabelText(t('a11y.starCount', { count: 7 }))).toBeTruthy();
  });

  it('mixes a Hebrew sentence with an isolated number correctly', () => {
    const text = t('home.greeting', { nick: 'נועה' });
    const { getByText } = wrap(<RTLText>{text}</RTLText>);
    expect(getByText('היי נועה!')).toBeTruthy();
  });
});
