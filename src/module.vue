<template>
	<private-view title="Schema Management">
		<div class="schema-management-module-wrapper">
			<div class="action-buttons">
				<v-button @click="exportSchema">
					Export
				</v-button>
			</div>
			<div>
				<v-checkbox
					v-model="checkAll"
					@update:model-value="toggleAll"
					label="Select all"
					class="collection-item"
				/>
				<div>
					<v-checkbox
						v-for="col in collections"
						:key="col.collection"
						v-model="selections"
						:value="col.collection"
						:label="col.name"
						block
						class="collection-item"
					/>
				</div>
			</div>
		</div>
	</private-view>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
import { useStores } from '@directus/extensions-sdk';
import { Collection, Field, Relation } from '@directus/shared/types';

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
		const selections = ref<string[]>([]);
		const checkAll = ref(false);

		return {
			collections,
			selections,
			checkAll,
			exportSchema,
			toggleAll,
		};

		function exportSchema() {
			const exportCollections = collections.value
				.map(({ collection, meta, schema }) => ({ collection, meta, schema }))
				.filter(c => selections.value.includes(c.collection));

			const fields = selections.value
				.map(c => fieldsStore.getFieldsForCollection(c) as Field[])
				.flat()
				.map(({ name, ...field }) => {
					const f: Record<string, any> = field;
					if (field.meta) {
						const { id, ...meta } = field.meta;
						f.meta = meta;
					}
					return f;
				});

			const relations = selections.value
				.map(c => relationsStore.getRelationsForCollection(c) as Relation[])
				.flat()
				.map((rel) => {
					const r: Record<string, any> = rel;
					if (rel.meta) {
						const { id, ...meta } = rel.meta;
						r.meta = meta;
					}
					return r;
				});

			const schema = {
				collections: exportCollections,
				fields,
				relations,
			};

			const schemaContent = JSON.stringify(schema, null, 4);

			const element = document.createElement('a');
			element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(schemaContent));
			element.setAttribute('download', 'schema.json');

			element.style.display = 'none';
			document.body.appendChild(element);

			element.click();

			document.body.removeChild(element);
		}

		function toggleAll(checked: boolean) {
			if (checked) {
				selections.value = collections.value.map(c => c.collection);
			} else {
				selections.value = [];
			}
		}
	}
});
</script>

<style lang="scss" scoped>
.schema-management-module-wrapper {
	margin-left: var(--content-padding);

	.action-buttons {
		margin-bottom: 16px;
	}

	.collection-item {
		margin-bottom: 8px;
	}
}
</style>
