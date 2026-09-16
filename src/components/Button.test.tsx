import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders the label and clicks', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Guardar</Button>);

    const element = screen.getByRole('button', { name: 'Guardar' });
    expect(element).toBeInTheDocument();

    await user.click(element);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
