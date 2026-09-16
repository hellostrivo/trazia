import { render, screen } from '@testing-library/react';
import { CategoriaChips } from '../../features/captura/CategoriaChips';
import type { Category } from '../../domain/types';

const categories: Category[] = [
  { id: '1', name: 'A', colorKey: 'slate', order: 0, archivedAt: null, createdAt: '', updatedAt: '' },
  { id: '2', name: 'B', colorKey: 'sage', order: 1, archivedAt: null, createdAt: '', updatedAt: '' },
];

describe('CategoriaChips', () => {
  it('renders a radiogroup and items', () => {
    render(<CategoriaChips categories={categories} value={null} onChange={() => undefined} />);

    const rg = screen.getByRole('radiogroup');
    expect(rg).toBeInTheDocument();
    expect(screen.getAllByRole('radio').length).toBe(2);
  });
});
