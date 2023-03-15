<svelte:options tag="p-offline-data-list" />

<script>
  import "./initPlugin";
  import { onMount } from "svelte";

  export let regionId, pageSize, headerFc, storageId, storageVersion;

  let offset = 0;
  let initRetries = 0;
  let storageKey = "";
  let moreRows = true;
  let lastPage = -1;
  let initialized = false;
  let currentPage = 0;
  let currentPageItems = [];
  let pkCol = "";
  let activeId = "";
  const pages = new Map();

  function wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async function getColInfo() {
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
        return getColInfo();
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
        return getColInfo();
      }

      apex.debug.error(`Storage '${storageKey}' not found!`);
      return;
    }

    return window.hartenfeller_dev.plugins.sync_offline_data.storages[
      storageKey
    ].getColInfo();
  }

  async function fetchMoreRows() {
    if (!moreRows) return;

    const data =
      await window.hartenfeller_dev.plugins.sync_offline_data.storages[
        storageKey
      ].getRows({ offset, maxRows: pageSize ?? 15 });

    offset += pageSize;

    if (data.length < pageSize) {
      moreRows = false;
      lastPage = currentPage;
    }
    return data;
  }

  async function addPage() {
    const data = await fetchMoreRows();
    console.log({ data });
    currentPage++;

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
    pages.set(currentPage, headers);
    currentPageItems = headers;
  }

  function nextPage() {
    if (currentPage + 1 > pages.size) {
      addPage();
    } else {
      currentPage++;
      currentPageItems = pages.get(currentPage);
    }
  }

  function prevPage() {
    if (currentPage - 1 < 1) return;
    currentPage--;
    currentPageItems = pages.get(currentPage);
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
    const colInfo = await getColInfo();
    pkCol = colInfo.pkCol;
    await addPage();
    initialized = true;
  });

  function handleClick(e) {
    e.preventDefault();
    const id = e.target.dataset.id;
    activeId = id;
    console.log({ id });
    apex.event.trigger(
      document.getElementById(regionId),
      "p-offline-data-list:select",
      { id }
    );
  }
</script>

<div>
  {#if !initialized}
    <p style="margin: 8px;">Loading...</p>
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
    <div>
      <button type="button" disabled={currentPage === 1} on:click={prevPage}
        >prev</button
      >
      Page {currentPage}
      <button
        type="button"
        on:click={nextPage}
        disabled={currentPage === lastPage}>next</button
      >
    </div>
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

  @media (prefers-reduced-motion) {
    .p-odl-btn {
      transition: none;
    }
  }
</style>
