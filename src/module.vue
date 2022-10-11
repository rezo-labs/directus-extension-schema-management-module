<template>
	<private-view title="Schema Management">
		<v-button @click="exportSchema">
			Export
		</v-button>
		<v-list>
			<v-list-item
				v-for="col in collections"
				:key="col.collection"
				block
				dense
				clickable
			>
				<v-checkbox v-model="selections" :value="col.collection" :label="col.name" />
			</v-list-item>
		</v-list>
	</private-view>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from 'vue';
import { useStores } from '@directus/extensions-sdk';
import { Collection } from '@directus/shared/types';

export default defineComponent({
	setup() {
		const {
			useCollectionsStore,
			useFieldsStore,
			useRelationsStore,
		} = useStores();

		const collectionsStore = useCollectionsStore();
		const fieldsStore = useFieldsStore();
		const relationsStore = useRelationsStore();

		const collections = computed(() => (collectionsStore.allCollections as Collection[]).filter(c => c.schema !== null));
		const selections = ref([]);
		watch(selections, () => console.log(selections));

		return {
			collections,
			selections,
			exportSchema,
		};

		function exportSchema() {
			const exportCollections = collections.value.map(({ meta, schema }) => ({
				meta,
				schema,
			}));
			const schema = {
				collections: exportCollections,
			};
			console.log(JSON.stringify(schema, null, 4));
		}
	}
});
</script>
