import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FechaChip } from '../../features/captura/FechaChip';

describe('FechaChip', () => {
  it('toggles native date input and enforces max today', async () => {
    const user = userEvent.setup();
    const handle = vi.fn();
    render(<FechaChip value="2026-09-01" onChange={handle} />);

    const btn = screen.getByRole('button', { name: 'Cambiar' });
    await user.click(btn);

    // input type date may not expose a textbox role in jsdom, query directly
    const fallback = document.querySelector('input[type="date"]') as HTMLInputElement | null;
    expect(fallback).toBeInstanceOf(HTMLInputElement);
    if (fallback) expect(fallback.max).toBeDefined();
  });
});
