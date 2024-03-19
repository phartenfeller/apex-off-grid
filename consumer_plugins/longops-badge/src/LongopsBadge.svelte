<svelte:options customElement="p-longops-badge" />

<script>
  import "./initPlugin";
  import { onMount } from "svelte";

  let visible = false;
  let currTasks = [];

  function logTrace(...args) {
    if (!window?.apex) {
      return;
    }
    apex.debug.trace("p-longops-badge", ...args);
  }

  function removeOldTasks() {
    // filter tasks that finished 10 seconds ago
    currTasks = currTasks.filter(
      (task) => task.finishedAt < Date.now() - 10000,
    );

    if (currTasks.length === 0) {
      visible = false;
    }
  }

  export function registerTask(displayName) {
    currTasks = [...currTasks, { displayName, progress: "", finishedAt: null }];
    visible = true;
  }

  export function updateTask(displayName, progress) {
    let found = false;

    currTasks = currTasks.map((task) => {
      if (task.displayName === displayName) {
        found = true;
        return { ...task, progress };
      }
      return task;
    });

    if (!found) {
      logTrace(`Task ${displayName} not found`);
      registerTask(displayName);
    }
  }

  export function finishTask(displayName) {
    currTasks = currTasks.map((task) => {
      if (task.displayName === displayName) {
        return { ...task, progress: "Done", finishedAt: Date.now() };
      }
      return task;
    });
    setTimeout(removeOldTasks, 10000);
  }
</script>

{#if visible}
  <div class="p-badge">
    <ul class="">
      {#each currTasks as task}
        <li class="">
          {#if task.finishedAt}
            <span aria-hidden="true" class="fa fa-check"></span>
          {:else}
            <span aria-hidden="true" class="fa fa-spinner fa-anim-spin"></span>
          {/if}
          <span>{task.displayName} {task.progress}</span>
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .p-badge {
    padding: 8px;
    border-radius: 32px;
    border: 1px solid var(--ut-component-border-color);
    box-shadow: var(--ut-shadow-md);
    font-size: 1.1rem;
  }
</style>
