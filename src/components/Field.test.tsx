import { render, screen } from '@testing-library/react';
import { Field, TextField, TextAreaField } from './Field';

describe('Field', () => {
  it('renders the label, the control and the hint', () => {
    render(
      <Field label="Categoría" hint="Elige una de la lista">
        <select aria-label="Categoría">
          <option value="hogar">Hogar</option>
        </select>
      </Field>,
    );

    expect(screen.getByText('Categoría')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Categoría' })).toBeInTheDocument();
    expect(screen.getByText('Elige una de la lista')).toBeInTheDocument();
  });

  it('omits the hint when it is not given', () => {
    render(
      <Field label="Concepto">
        <input aria-label="Concepto" />
      </Field>,
    );

    expect(screen.getByText('Concepto')).toBeInTheDocument();
    expect(document.querySelector('.field small')).toBeNull();
  });

  it('TextField renders an input with its placeholder', () => {
    render(<TextField label="Concepto" placeholder="Ej. Mercado" hint="Hasta 80 caracteres" />);

    expect(screen.getByPlaceholderText('Ej. Mercado')).toBeInTheDocument();
    expect(screen.getByText('Hasta 80 caracteres')).toBeInTheDocument();
  });

  it('TextAreaField renders a textarea', () => {
    render(<TextAreaField label="Nota" placeholder="Opcional" />);

    expect(screen.getByPlaceholderText('Opcional').tagName).toBe('TEXTAREA');
  });
});
