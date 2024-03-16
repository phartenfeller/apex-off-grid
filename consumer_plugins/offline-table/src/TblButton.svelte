<script>
  export let style;
  export let actionFc;
  export let label;
  export let row;

  const afc = () => {
    apex.debug.trace("TblButton.afc", row);
    actionFc(row);
  };

  // replace #COLNAME# with row.getValue('COLNAME')
  function getLabel() {
    return label.replace(/#(\w+)#/g, (match, p1) => row.getValue(p1));
  }

  const renderedLabel = getLabel();
</script>

{#if style === "BUTTON"}
  <button type="button" on:click={afc} class="p-simple-btn"
    >{renderedLabel}</button
  >
{:else if style === "LINK"}
  <a role="button" on:click={afc} class="">{renderedLabel}</a>
{:else}
  Unknown style: {style}
{/if}
