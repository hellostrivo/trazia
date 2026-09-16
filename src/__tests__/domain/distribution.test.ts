import { describe, expect, it } from 'vitest';
import { DONUT_MAX_SLICES, groupDonutSlices } from '../../domain/distribution';

const item = (name: string, amountCents: number) => ({ name, amountCents });

describe('groupDonutSlices', () => {
  it('toma las seis de mayor monto y suma el resto en Otras', () => {
    const items = [
      item('A', 10),
      item('B', 80),
      item('C', 20),
      item('D', 70),
      item('E', 30),
      item('F', 60),
      item('G', 40),
      item('H', 50),
    ];
    const { main, othersCents } = groupDonutSlices(items);
    expect(main.map((i) => i.name)).toEqual(['B', 'D', 'F', 'H', 'G', 'E']);
    expect(othersCents).toBe(30);
    expect(main).toHaveLength(DONUT_MAX_SLICES);
  });

  it('una categoría con $0 no ocupa lugar ni en principales ni en Otras', () => {
    const items = [
      item('Cero', 0),
      item('A', 5),
      item('B', 4),
      item('C', 3),
      item('D', 2),
      item('E', 1),
      item('F', 1),
    ];
    const { main, othersCents } = groupDonutSlices(items);
    expect(main.map((i) => i.name)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(othersCents).toBe(0);
  });

  it('a igual monto conserva el orden configurado', () => {
    const items = [item('X', 10), item('Y', 10), item('Z', 20)];
    expect(groupDonutSlices(items).main.map((i) => i.name)).toEqual(['Z', 'X', 'Y']);
  });

  it('con seis o menos no hay Otras, y sin datos devuelve vacío', () => {
    expect(groupDonutSlices([item('A', 1)])).toEqual({ main: [item('A', 1)], othersCents: 0 });
    expect(groupDonutSlices([])).toEqual({ main: [], othersCents: 0 });
    expect(groupDonutSlices([item('Cero', 0)])).toEqual({ main: [], othersCents: 0 });
  });

  it('no muta la lista de entrada', () => {
    const items = [item('A', 1), item('B', 2)];
    groupDonutSlices(items);
    expect(items.map((i) => i.name)).toEqual(['A', 'B']);
  });
});
