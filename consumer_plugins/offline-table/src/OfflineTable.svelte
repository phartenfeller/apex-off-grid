<svelte:options customElement="p-offline-table" />

<script>
  import "./initPlugin";
  import {
    getCoreRowModel,
    createSvelteTable,
    flexRender,
  } from "@tanstack/svelte-table";
  import { onMount } from "svelte";
  import { writable } from "svelte/store";

  export let regionId, pageSize, storageId, storageVersion, colConfig;

  let storageKey = "";
  let initialized = false;
  let noDataFound = false;
  let spinner$;

  let sorting = [];
  let page = 1;
  let maxPages = 1;
  let search = "";
  let filters = {};

  let columns = [];
  let options;
  let table;

  async function requestData() {
    const args = {
      maxRows: pageSize,
      getRowCount: true,
      offset: (page - 1) * pageSize,
    };

    if (sorting?.length > 0) {
      args.orderByCol = sorting[0].id;
      args.orderByDir = sorting[0].desc ? "desc" : "asc";
    }

    if (search) {
      args.searchTerm = search;
    }

    if (Object.keys(filters).length > 0) {
      args.colFilters = [];
      for (const [col, filter] of Object.entries(filters)) {
        args.colFilters.push({ colname: col, filter });
      }
    }

    const res =
      await window.hartenfeller_dev.plugins.sync_offline_data.storages[
        storageKey
      ].getRows(args);

    const { ok, error, rows, rowCount } = res;

    console.log("wtf", res);

    if (ok !== true) {
      apex.debug.error(error);
      throw new Error(error);
    }

    noDataFound = rowCount === 0;
    maxPages = Math.ceil(rowCount / pageSize);
    options.update((o) => ({ ...o, data: rows }));
  }

  const setSorting = (updater) => {
    if (updater instanceof Function) {
      sorting = updater(sorting);
    } else {
      sorting = updater;
    }
    options.update((old) => ({
      ...old,
      state: {
        ...old.state,
        sorting,
      },
    }));

    requestData();
  };

  const setPagination = (newPage) => {
    page = newPage;
    requestData();
  };

  let timer;

  const setSearch = (newSearch) => {
    // depounce input
    clearTimeout(timer);
    timer = setTimeout(async () => {
      page = 1;
      search = newSearch;
      requestData();
    }, 250);
  };

  const setFilter = (col, newFilter) => {
    // depounce input
    clearTimeout(timer);
    timer = setTimeout(async () => {
      page = 1;
      filters[col] = newFilter;
      requestData();
    }, 250);
  };

  function storageIsReady() {
    requestData();
    if (spinner$) {
      spinner$.remove();
    }
    initialized = true;
  }

  onMount(() => {
    columns = colConfig
      .filter((c) => c.isVisible)
      .map((c) => ({
        id: c.name,
        accessorKey: c.name,
        header: c.heading,
        enableSorting: c.isSortable,
        meta: {
          filter: c.isFilterable,
        },
      }));

    options = writable({
      data: [],
      columns,
      state: {
        sorting,
      },
      onSortingChange: setSorting,
      getCoreRowModel: getCoreRowModel(),
      manualSorting: true,
    });

    table = createSvelteTable(options);

    storageKey = `${storageId}_v${storageVersion}`;

    apex.debug.trace("Setup p-offline-table", {
      regionId,
      pageSize,
      storageId,
      storageVersion,
      colConfig,
      columns,
    });

    spinner$ = apex.util.showSpinner(apex.jQuery(`#${regionId}`));

    window.hartenfeller_dev.plugins.sync_offline_data.addStorageReadyCb({
      storageId,
      storageVersion,
      cb: storageIsReady,
    });
  });
</script>

<div>
  {#if !initialized}
    <p style="margin: 8px;">Loading...</p>
  {:else}
    <div class="column">
      <div>
        <input
          class="p-global-search-input"
          type="search"
          bind:value={search}
          on:input={() => setSearch(search)}
          placeholder="Search..."
        />
      </div>
      <div style="display: flow-root;">
        <div style="overflow-x: auto;">
          <table class="p-table">
            <thead>
              {#each $table.getHeaderGroups() as headerGroup}
                <tr>
                  {#each headerGroup.headers as header}
                    <th
                      colSpan={header.colSpan}
                      class:p-th-min-width={header.column.columnDef.meta
                        ?.filter}
                      class="p-th"
                    >
                      {#if !header.isPlaceholder}
                        <div class="p-th-text">
                          <svelte:component
                            this={flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          />
                          {#if header.column.getCanSort()}
                            <button
                              class="p-simple-btn"
                              on:click={header.column.getToggleSortingHandler()}
                            >
                              {#if header.column.getIsSorted()}
                                {#if header.column
                                  .getIsSorted()
                                  .toString() === "asc"}
                                  <svg
                                    style="width: 16px; height: 16px;"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                    aria-hidden="true"
                                  >
                                    <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12"
                                    />
                                  </svg>
                                {:else}
                                  <svg
                                    style="width: 16px; height: 16px;"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                    aria-hidden="true"
                                  >
                                    <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25"
                                    />
                                  </svg>
                                {/if}
                              {:else}
                                <svg
                                  style="width: 16px; height: 16px;"
                                  fill="none"
                                  stroke="currentColor"
                                  stroke-width="1.5"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                  aria-hidden="true"
                                >
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
                                  />
                                </svg>
                              {/if}
                            </button>
                          {/if}
                        </div>

                        {#if header.column.columnDef.meta?.filter}
                          <input
                            class="p-global-search-input"
                            type="search"
                            bind:value={filters[header.column.id]}
                            on:input={() =>
                              setFilter(
                                header.column.id,
                                filters[header.column.id]
                              )}
                            placeholder={`Filter by ${header.column.columnDef.header}...`}
                          />
                        {/if}
                      {/if}
                    </th>
                  {/each}
                </tr>
              {/each}
            </thead>

            <tbody>
              {#each $table.getRowModel().rows as row}
                <tr>
                  {#each row.getVisibleCells() as cell}
                    <td class="p-td">
                      <svelte:component
                        this={flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      />
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

      {#if noDataFound}
        <p style="margin: 8px;">No data found...</p>
      {:else}
        <div class="p-pagination">
          <div>
            <button
              class="p-apex-btn"
              disabled={page <= 1}
              on:click={() => setPagination(1)}>{`<<`}</button
            >
            <button
              class="p-apex-btn"
              disabled={page <= 1}
              on:click={() => setPagination(page - 1)}
            >
              Previous
            </button>
          </div>
          <span>Page {page}</span>
          <div>
            <button
              class="p-apex-btn"
              disabled={page >= maxPages}
              on:click={() => setPagination(page + 1)}
            >
              Next
            </button>
            <button
              class="p-apex-btn"
              disabled={page >= maxPages}
              on:click={() => setPagination(maxPages)}>{`>>`}</button
            >
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .p-pagination {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 16px 8px;
  }

  .p-simple-btn {
    all: unset;
    display: block;
    background-color: var(
      --a-button-state-background-color,
      var(
        --a-button-type-background-color,
        var(--a-button-background-color, transparent)
      )
    );
    padding: 4px 8px;
    font-weight: 500;
    font-size: 1rem;

    transition-property: color, background-color, border-color,
      text-decoration-color, fill, stroke;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  .p-simple-btn:hover {
    background-color: var(
      --a-button-active-background-color,
      var(--a-button-hover-background-color)
    );
  }

  .p-simple-btn:focus {
    outline: none;
  }

  .p-apex-btn {
    background-color: var(
      --a-button-state-background-color,
      var(
        --a-button-type-background-color,
        var(--a-button-background-color, transparent)
      )
    );
    color: var(
      --a-button-state-text-color,
      var(--a-button-type-text-color, var(--a-button-text-color, inherit))
    );
    border-color: var(
      --a-button-state-border-color,
      var(--a-button-type-border-color, var(--a-button-border-color))
    );
    box-shadow: var(
      --a-button-state-shadow,
      var(--a-button-type-shadow, var(--a-button-shadow, none))
    );
    transition: background-color 0.2s ease, border-color 0.2s ease,
      box-shadow 0.2s ease, color 0.2s ease;
    display: inline-block;
    align-items: center;
    -webkit-appearance: none;
    appearance: none;
    font-family: inherit;
    margin: 0;
    position: relative;
    text-align: center;
    justify-content: center;
    white-space: nowrap;
    -webkit-user-select: none;
    user-select: none;
    -webkit-padding-before: calc(
      var(--a-button-padding-y, 0.5rem) - var(--a-button-border-width, 1px)
    );
    padding-block-start: calc(
      var(--a-button-padding-y, 0.5rem) - var(--a-button-border-width, 1px)
    );
    -webkit-padding-after: calc(
      var(--a-button-padding-y, 0.5rem) - var(--a-button-border-width, 1px)
    );
    padding-block-end: calc(
      var(--a-button-padding-y, 0.5rem) - var(--a-button-border-width, 1px)
    );
    -webkit-padding-start: calc(
      var(--a-button-padding-x, 0.75rem) - var(--a-button-border-width, 1px)
    );
    padding-inline-start: calc(
      var(--a-button-padding-x, 0.75rem) - var(--a-button-border-width, 1px)
    );
    -webkit-padding-end: calc(
      var(--a-button-padding-x, 0.75rem) - var(--a-button-border-width, 1px)
    );
    padding-inline-end: calc(
      var(--a-button-padding-x, 0.75rem) - var(--a-button-border-width, 1px)
    );
    border-width: var(--a-button-border-width, 1px);
    border-style: solid;
    border-radius: var(--a-button-border-radius, 0.125rem);
    cursor: var(--a-button-cursor, pointer);
    font-size: var(--a-button-font-size, 0.75rem);
    line-height: var(--a-button-line-height, 1rem);
    font-weight: var(--a-button-font-weight, 400);
    text-shadow: var(--a-button-text-shadow, none);
    z-index: var(--a-button-zindex);
    will-change: background-color, border-color, box-shadow, color, padding,
      font-size;
  }

  .p-apex-btn:hover {
    --a-button-zindex: 100;
    --a-button-state-background-color: var(--a-button-hover-background-color);
    --a-button-state-text-color: var(--a-button-hover-text-color);
    --a-button-state-border-color: var(--a-button-hover-border-color);
    --a-button-state-shadow: var(--a-button-hover-shadow);
  }

  .p-apex-btn:focus {
    --a-button-zindex: 110;
    --a-button-state-background-color: var(--a-button-focus-background-color);
    --a-button-state-text-color: var(--a-button-focus-text-color);
    --a-button-state-border-color: var(--a-button-focus-border-color);
    --a-button-state-shadow: var(--a-button-focus-shadow);
  }

  .p-apex-btn:active {
    --a-button-zindex: 100;
    --a-button-state-background-color: var(
      --a-button-active-background-color,
      var(--a-button-hover-background-color)
    );
    --a-button-state-text-color: var(
      --a-button-active-text-color,
      var(--a-button-hover-text-color)
    );
    --a-button-state-border-color: var(
      --a-button-active-border-color,
      var(--a-button-hover-border-color)
    );
    --a-button-state-shadow: var(
      --a-button-active-shadow,
      var(--a-button-hover-shadow)
    );
  }

  .p-apex-btn:disabled {
    cursor: var(--a-button-disabled-cursor, default);
    opacity: var(--a-button-disabled-opacity, 0.5);
    pointer-events: none;
  }

  .p-global-search-input {
    appearance: none;
    background-color: var(
      --a-field-input-state-background-color,
      var(--a-field-input-background-color)
    );
    border-color: var(
      --a-field-input-state-border-color,
      var(--a-field-input-border-color)
    );
    border-radius: var(--a-field-input-border-radius, 0.125rem);
    border-style: solid;
    border-width: var(--a-field-input-border-width, 1px);
    box-shadow: var(--a-field-input-state-shadow, var(--a-field-input-shadow));
    color: var(
      --a-field-input-state-text-color,
      var(--a-field-input-text-color)
    );
    display: inline-block;
    flex-grow: var(--a-field-input-flex-grow);
    font-size: 16px;
    font-weight: var(--a-field-input-font-weight, 400);
    line-height: var(--a-field-input-line-height, 1rem);
    max-width: 100%;
    min-height: var(--ut-field-input-min-height, 0);
    min-width: 0;
    padding-block-end: calc(
      var(--a-field-input-padding-y, 0.25rem) -
        var(--a-field-input-border-width, 1px)
    );
    padding-block-start: var(
      --ut-field-fl-label-offset,
      calc(
        var(--a-field-input-padding-y, 0.25rem) -
          var(--a-field-input-border-width, 1px)
      )
    );
    padding-inline-end: calc(
      var(--a-field-input-padding-x, 0.25rem) -
        var(--a-field-input-border-width, 1px)
    );
    padding-inline-start: var(
      --ut-field-input-padding-x-offset,
      calc(
        var(--a-field-input-padding-x, 0.25rem) -
          var(--a-field-input-border-width, 1px)
      )
    );
    transition: background-color 0.2s ease, border-color 0.2s ease,
      box-shadow 0.2s ease, color 0.2s ease;
    vertical-align: top;
    width: 90%;
    padding: 9px;
    margin: 12px 0px;
  }

  .p-th-min-width {
    min-width: 20ch;
  }

  .p-table {
    width: 100%;
    border-collapse: collapse;
    border-style: hidden;
    border-spacing: 0;
    table-layout: auto;
  }

  .p-th {
    vertical-align: middle;
    font-size: var(--a-gv-header-cell-font-size);
    line-height: var(--a-gv-header-cell-line-height);
    font-weight: var(
      --a-gv-header-cell-font-weight,
      var(--a-base-font-weight-bold, 700)
    );
    padding: 0;
    height: var(--a-gv-header-cell-height, 40px);
    background-color: var(--a-gv-header-background-color);
    color: var(--a-gv-header-text-color);
    border-width: var(--a-gv-header-cell-border-width, 1px);
    border-style: solid;
    border-color: var(--a-gv-header-cell-border-color);
  }

  .p-th-text {
    padding: 0px 8px;
    display: flex;
    justify-content: space-between;
  }

  .p-td {
    -webkit-padding-start: var(--a-gv-cell-padding-x, 8px);
    padding-inline-start: var(--a-gv-cell-padding-x, 8px);
    -webkit-padding-end: var(--a-gv-cell-padding-x, 8px);
    padding-inline-end: var(--a-gv-cell-padding-x, 8px);
    -webkit-padding-before: var(--a-gv-cell-padding-y, 4px);
    padding-block-start: var(--a-gv-cell-padding-y, 4px);
    -webkit-padding-after: var(--a-gv-cell-padding-y, 4px);
    padding-block-end: var(--a-gv-cell-padding-y, 4px);
    height: var(--a-gv-cell-height, 32px);
    border-width: var(--a-gv-cell-border-width, 1px);
    border-style: solid;
    border-color: var(--a-gv-cell-border-color);
  }

  @media (prefers-reduced-motion) {
    .p-simple-btn {
      transition: none;
    }
  }
</style>
