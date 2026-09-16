import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Dialog } from './Dialog';

describe('Dialog', () => {
  it('renders in focus and closes on Escape', () => {
    function TestDialog() {
      const [open, setOpen] = useState(true);

      return (
        <Dialog title="Confirmar" open={open} onClose={() => setOpen(false)}>
          <button type="button">Aceptar</button>
        </Dialog>
      );
    }

    render(<TestDialog />);

    const dialog = screen.getByRole('dialog', { name: 'Confirmar' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
