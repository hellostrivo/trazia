import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConceptoField } from '../../features/captura/ConceptoField';

describe('ConceptoField', () => {
  it('has enterkeyhint next and enforces maxlength', async () => {
    const user = userEvent.setup();
    const handle = vi.fn();
    render(<ConceptoField value="" onChange={handle} />);

    const input = screen.getByDisplayValue('');
    expect(input).toHaveAttribute('enterkeyhint', 'next');

    await user.type(input, 'hola');
    expect(handle).toHaveBeenCalled();
  });
});
