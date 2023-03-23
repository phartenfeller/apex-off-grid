<svelte:options tag="p-offline-data-list" />

<script>
  import "./initPlugin";
  import { onMount } from "svelte";

  export let regionId,
    pageSize,
    headerFc,
    storageId,
    storageVersion,
    valuePageItem;

  let initRetries = 0;
  let storageKey = "";
  let lastPage = -1;
  let initialized = false;
  let noDataFound = false;
  let currentPage = 1;
  let currentPageItems = [];
  let pkCol = "";
  let activeId = "";
  let pages = new Map();
  let searchTerm = "";

  function wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async function resetState() {
    // reset saved results
    pages = new Map();
    lastPage = -1;
    currentPage = 1;

    const rowCount =
      await window.hartenfeller_dev.plugins.sync_offline_data.storages[
        storageKey
      ].getRowCount({ searchTerm });

    noDataFound = rowCount === 0;

    lastPage = Math.ceil(rowCount / pageSize);
  }

  async function getStorageInfo() {
    if (!window?.hartenfeller_dev?.plugins?.sync_offline_data) {
      apex.debug.error("Plugin 'sync_offline_data' not loaded!");
      return;
    }

    if (
      !window?.hartenfeller_dev?.plugins?.sync_offline_data.dbStauts ||
      window.hartenfeller_dev.plugins.sync_offline_data.dbStauts !==
        "initialized"
    ) {
      apex.debug.warn("Plugin 'sync_offline_data' not ready! Retrying");

      if (initRetries <= 240) {
        initRetries++;
        await wait(250);
        return getStorageInfo();
      }

      apex.debug.error(`Storage not init after 60s!`);

      return;
    }

    if (
      !window.hartenfeller_dev.plugins.sync_offline_data.storages[storageKey]
    ) {
      if (initRetries <= 240) {
        initRetries++;
        await wait(250);
        return getStorageInfo();
      }

      apex.debug.error(`Storage '${storageKey}' not found!`);
      return;
    }

    const colInfo =
      await window.hartenfeller_dev.plugins.sync_offline_data.storages[
        storageKey
      ].getColInfo();

    return colInfo;
  }

  async function fetchMoreRows(pageNo) {
    const offset = (pageNo - 1) * pageSize;

    console.log("fetchMoreRows", { offset, pageSize, pageNo, searchTerm });
    const data =
      await window.hartenfeller_dev.plugins.sync_offline_data.storages[
        storageKey
      ].getRows({ offset, maxRows: pageSize ?? 15, searchTerm });

    return data;
  }

  async function addPage(pageNo) {
    const data = await fetchMoreRows(pageNo);
    console.log({ data });

    if (!data || data.length === 0) {
      apex.debug.error(`Could not add page as no data found`);
      return;
    }

    try {
      const testHeader = headerFc(data[0]);
      if (!testHeader) {
        apex.debug.error(
          `Could not add page as header function returns null. Row =>`,
          data[0]
        );
        return;
      }
    } catch (e) {
      apex.debug.error(
        `Could not add page as header function throws an error: ${e}`
      );
      return;
    }

    const headers = data.map((r) => ({ title: headerFc(r), id: r[pkCol] }));
    pages.set(pageNo, headers);
    currentPageItems = headers;
  }

  function gotoPage(page) {
    currentPage = page;
    if (!pages.has(page)) {
      addPage(page);
    } else {
      currentPageItems = pages.get(page);
    }
  }

  onMount(async () => {
    storageKey = `${storageId}_v${storageVersion}`;

    apex.debug.trace("Setup p-offline-data-list", {
      regionId,
      pageSize,
      headerFc,
      storageId,
      storageVersion,
    });

    await wait(500);
    const colInfo = await getStorageInfo();
    await resetState();
    pkCol = colInfo.pkCol;
    await addPage(1);
    initialized = true;
  });

  function handleClick(e) {
    e.preventDefault();
    const id = e.target.dataset.id;
    activeId = id;
    console.log({ id });

    if (valuePageItem) {
      apex.item(valuePageItem).setValue(id);
    }

    apex.event.trigger(
      document.getElementById(regionId),
      "p-offline-data-list:select",
      { id }
    );
  }

  let timer;

  function handleSearch() {
    // depounce input
    clearTimeout(timer);
    timer = setTimeout(async () => {
      await resetState();

      addPage(1);
    }, 250);
  }
</script>

<div>
  {#if !initialized}
    <p style="margin: 8px;">Loading...</p>
  {:else}
    <div style="display: flex; justify-content: center;">
      <input
        type="search"
        placeholder="Search"
        class="p-odl-search-input"
        bind:value={searchTerm}
        on:input={handleSearch}
      />
    </div>
    {#if noDataFound}
      <p style="margin: 8px;">No data found</p>
    {:else}
      <ul class="p-odl-ul">
        {#each currentPageItems as { title, id }}
          <li class="p-odl-li">
            <button
              type="button"
              on:click={handleClick}
              data-id={id}
              class="p-odl-btn"
              class:p-odl-btn-active={activeId == id}
            >
              {title}
            </button>
          </li>
        {/each}
      </ul>
      <div class="p-odl-button-container">
        <div>
          <button
            id={`${regionId}_first_page_btn`}
            class="p-odl-apex-btn"
            type="button"
            on:click={gotoPage(currentPage / currentPage)}
            disabled={currentPage === 1}>{"<<"}</button
          >
          <button
            id={`${regionId}_prev_page_btn`}
            class="p-odl-apex-btn"
            type="button"
            on:click={gotoPage(currentPage - 1)}
            disabled={currentPage === 1}>{"<"}</button
          >
          <span style="padding: 0px 4px">
            Page {currentPage}
          </span>
          <button
            id={`${regionId}_next_page_btn`}
            class="p-odl-apex-btn"
            type="button"
            on:click={gotoPage(currentPage + 1)}
            disabled={currentPage === lastPage}>{">"}</button
          >
          <button
            id={`${regionId}_last_page_btn`}
            class="p-odl-apex-btn"
            type="button"
            on:click={gotoPage(lastPage)}
            disabled={currentPage === lastPage}>{">>"}</button
          >
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .p-odl-ul {
    margin: 0;
    padding: 0;
    list-style-type: none;
  }

  .p-odl-li {
    display: flex;
  }

  .p-odl-button-container {
    margin: 16px 8px;
    justify-content: center;
    display: flex;
  }

  .p-odl-btn {
    all: unset;
    display: block;
    background-color: var(
      --a-button-state-background-color,
      var(
        --a-button-type-background-color,
        var(--a-button-background-color, transparent)
      )
    );
    flex-grow: 1;
    padding: 8px 16px;
    font-weight: 500;
    font-size: 1rem;
    border-left: 4px transparent solid;

    transition-property: color, background-color, border-color,
      text-decoration-color, fill, stroke;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }

  .p-odl-btn:hover {
    background-color: var(
      --a-button-active-background-color,
      var(--a-button-hover-background-color)
    );
  }

  .p-odl-btn:focus {
    outline: none;
    border-left: 4px var(--a-button-focus-border-color) solid;
  }

  .p-odl-btn-active {
    border-left: 4px var(--a-button-focus-border-color) solid;
  }

  .p-odl-apex-btn {
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

  .p-odl-apex-btn:hover {
    --a-button-zindex: 100;
    --a-button-state-background-color: var(--a-button-hover-background-color);
    --a-button-state-text-color: var(--a-button-hover-text-color);
    --a-button-state-border-color: var(--a-button-hover-border-color);
    --a-button-state-shadow: var(--a-button-hover-shadow);
  }

  .p-odl-apex-btn:focus {
    --a-button-zindex: 110;
    --a-button-state-background-color: var(--a-button-focus-background-color);
    --a-button-state-text-color: var(--a-button-focus-text-color);
    --a-button-state-border-color: var(--a-button-focus-border-color);
    --a-button-state-shadow: var(--a-button-focus-shadow);
  }

  .p-odl-apex-btn:active {
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

  .p-odl-apex-btn:disabled {
    cursor: var(--a-button-disabled-cursor, default);
    opacity: var(--a-button-disabled-opacity, 0.5);
    pointer-events: none;
  }

  .p-odl-search-input {
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

  @media (prefers-reduced-motion) {
    .p-odl-btn {
      transition: none;
    }
  }
</style>
