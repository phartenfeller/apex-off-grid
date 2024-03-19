<script>
	import { onMount } from "svelte";
	import LongopsBadge from "./LongopsBadge.svelte";

	async function watiMs(ms) {
		return new Promise((resolve) => {
			setTimeout(resolve, ms);
		});
	}

	onMount(async () => {
		console.log("LongopsBadge mounted");
		await watiMs(1500);
		window.hartenfeller_dev.plugins.longops_badge.registerTask(
			"Update storage",
		);

		for (let i = 0; i <= 30; i++) {
			await watiMs(150);
			window.hartenfeller_dev.plugins.longops_badge.updateTask(
				"Update storage",
				` ${i}/30`,
			);
		}

		window.hartenfeller_dev.plugins.longops_badge.finishTask("Update storage");
	});
</script>

<main>
	<LongopsBadge />
</main>

<style>
	@font-face {
		font-family: "Font APEX Small";
		src:
			url(https://static.oracle.com/cdn/apex/23.2.4/libraries/font-apex/2.2.1/fonts/Font-APEX-Small.woff2?)
				format("woff2"),
			url(https://static.oracle.com/cdn/apex/23.2.4/libraries/font-apex/2.2.1/fonts/Font-APEX-Small.woff?)
				format("woff");
		font-weight: 400;
		font-style: normal;
	}

	@font-face {
		font-family: "Font APEX Large";
		src:
			url(https://static.oracle.com/cdn/apex/23.2.4/libraries/font-apex/2.2.1/fonts/Font-APEX-Large.woff2?)
				format("woff2"),
			url(https://static.oracle.com/cdn/apex/23.2.4/libraries/font-apex/2.2.1/fonts/Font-APEX-Large.woff?)
				format("woff");
		font-weight: 400;
		font-style: normal;
	}
</style>
