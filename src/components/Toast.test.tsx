import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast } from './Toast';

describe('Toast', () => {
  it('exposes the message in an aria-live region', () => {
    render(<Toast message="Guardado" open={true} onClose={() => undefined} />);

    expect(screen.getByRole('status')).toHaveTextContent('Guardado');
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('announces the action button inside the live region', () => {
    render(
      <Toast
        message="Gasto eliminado"
        open={true}
        onClose={() => undefined}
        action={{ label: 'Deshacer', onAction: () => undefined }}
      />,
    );

    const status = screen.getByRole('status');
    const action = screen.getByRole('button', { name: 'Deshacer' });

    expect(status).toContainElement(action);
    expect(status).toHaveTextContent('Gasto eliminado');
    expect(status).toHaveTextContent('Deshacer');
  });

  it('reaches the action with the keyboard and runs it', async () => {
    const onAction = vi.fn();
    render(
      <Toast
        message="Gasto eliminado"
        open={true}
        onClose={() => undefined}
        action={{ label: 'Deshacer', onAction }}
      />,
    );

    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Deshacer' })).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('omits the action button when no action is given', () => {
    render(<Toast message="Guardado" open={true} onClose={() => undefined} />);
    expect(screen.queryByRole('button', { name: 'Deshacer' })).not.toBeInTheDocument();
  });
});
