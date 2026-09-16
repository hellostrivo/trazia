import { render, screen } from '@testing-library/react';
import { Toast } from './Toast';

describe('Toast', () => {
  it('exposes the message in an aria-live region', () => {
    render(<Toast message="Guardado" open={true} onClose={() => undefined} />);

    expect(screen.getByRole('status')).toHaveTextContent('Guardado');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
