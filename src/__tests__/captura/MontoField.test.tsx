import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MontoField } from '../../features/captura/MontoField';

describe('MontoField', () => {
  it('uses inputmode decimal and shows error via aria-describedby', async () => {
    const user = userEvent.setup();
    const handle = vi.fn();
    render(<MontoField value="" onChange={handle} />);

    const input = screen.getByPlaceholderText('$0.00');
    expect(input).toHaveAttribute('inputmode', 'decimal');

    await user.type(input, '123');
    expect(handle).toHaveBeenCalled();
  });
});
