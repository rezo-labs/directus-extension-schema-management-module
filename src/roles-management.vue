<template>
	<private-view title="Roles & Permissions Management">
		<template #navigation>
			<navigation />
		</template>

		<template #title-outer:prepend>
			<v-button class="header-icon" rounded disabled icon secondary>
				<v-icon name="admin_panel_settings" />
			</v-button>
		</template>
	</private-view>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import Navigation from './navigation.vue';

export default defineComponent({
	components: {
		Navigation,
	},
	setup() {
  },
});
</script>

<style lang="scss" scoped>
</style>
