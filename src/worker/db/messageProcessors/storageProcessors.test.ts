import { buildQuery } from './storageProcessors';
import { describe, expect, test } from '@jest/globals';

describe('buildQuery', () => {
  test('should build a query with the correct WHERE clause', () => {
    const query = buildQuery({
      storageId: 'movies',
      storageVersion: 1,
      offset: 0,
      maxRows: 25,
      orderByCol: undefined,
      orderByDir: undefined,
      searchTerm: undefined,
      colFilters: [{ colname: 'YEAR', filter: '1999' }],
      colStructure: {
        cols: [
          { colname: 'MOVIE_ID', datatype: 'real', isRequired: true },
          {
            colname: 'ORIG_TITLE',
            datatype: 'text',
            datatypeLength: 1020,
            isRequired: false,
          },
          { colname: 'YEAR', datatype: 'real', isRequired: false },
          { colname: 'RUNTIME', datatype: 'real', isRequired: false },
          { colname: 'CERTIFICATE', datatype: 'real', isRequired: false },
          {
            colname: 'DESCRIPTION',
            datatype: 'text',
            datatypeLength: 4000,
            isRequired: false,
          },
          { colname: 'BUDGET', datatype: 'real', isRequired: false },
          { colname: 'WORLD_WIDE_GROSS', datatype: 'real', isRequired: false },
          {
            colname: 'BUDGET_CURRENCY',
            datatype: 'text',
            datatypeLength: 40,
            isRequired: false,
          },
          { colname: 'IMDB_RATING', datatype: 'real', isRequired: false },
          { colname: 'VOTES', datatype: 'real', isRequired: false },
          {
            colname: 'GENRES',
            datatype: 'text',
            datatypeLength: 4000,
            isRequired: false,
          },
          {
            colname: 'CAST',
            datatype: 'text',
            datatypeLength: 4000,
            isRequired: false,
          },
          {
            colname: 'DIRECTORS',
            datatype: 'text',
            datatypeLength: 4000,
            isRequired: false,
          },
          {
            colname: 'WRITERS',
            datatype: 'text',
            datatypeLength: 4000,
            isRequired: false,
          },
          { colname: 'LAST_CHANGED', datatype: 'real', isRequired: false },
        ],
        lastChangedCol: 'LAST_CHANGED',
        pkCol: 'MOVIE_ID',
      },
    });

    expect(query.sql).toContain('select * from movies_v1 where');
    expect(query.sql.toLowerCase()).toContain(
      'lower("year") like $year_filter',
    );
    expect(query.sql).toContain(
      `(__change_type is null or __change_type != 'D')`,
    );
    expect(query.sql).toContain(`limit $limit`);
    expect(query.sql.match(/where/gi)?.length).toBe(1);
    expect(query.binds).toEqual({ $YEAR_filter: '%1999%', $limit: 25 });
  });
});
