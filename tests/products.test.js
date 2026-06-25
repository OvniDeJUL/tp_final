// Unit tests for products service (mocks DB)
const mockDb = {
  prepare: jest.fn(),
};
jest.mock('../src/services/db', () => ({ getDb: () => mockDb }));

const { list, search, add, update, remove } = require('../src/services/products');

describe('products service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('list returns all products ordered by name', () => {
    const rows = [{ id: 1, name: 'Apple', price: 1.2 }];
    mockDb.prepare.mockReturnValue({ all: () => rows });
    expect(list()).toEqual(rows);
    expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM products ORDER BY name ASC');
  });

  test('search uses LIKE query', () => {
    const rows = [{ id: 2, name: 'Banana', price: 0.5 }];
    mockDb.prepare.mockReturnValue({ all: () => rows });
    const result = search('ban');
    expect(result).toEqual(rows);
    expect(mockDb.prepare).toHaveBeenCalledWith(
      'SELECT * FROM products WHERE name LIKE ? OR barcode = ? ORDER BY name ASC'
    );
  });

  test('add throws when price missing', () => {
    expect(() => add({ name: 'Test' })).toThrow('name and price required');
  });

  test('add throws when name missing', () => {
    expect(() => add({ price: 1.0 })).toThrow('name and price required');
  });

  test('update throws when nothing to update', () => {
    expect(() => update(1, {})).toThrow('nothing to update');
  });
});
