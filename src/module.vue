<template>
	<private-view title="Schema Management">
		<template #title-outer:prepend>
			<v-button class="header-icon" rounded disabled icon secondary>
				<v-icon name="schema" />
			</v-button>
		</template>

		<template #actions>
			<v-menu show-arrow>
				<template #activator="{ toggle }">
					<v-button @click="toggle">
						Export
					</v-button>
				</template>

				<v-list>
					<v-list-item clickable @click="exportSchema(true)">
						<v-list-item-icon><v-icon name="download" /></v-list-item-icon>
						<v-list-item-content>Export to file</v-list-item-content>
					</v-list-item>
					<v-list-item clickable @click="exportSchema(false)">
						<v-list-item-icon><v-icon name="code" /></v-list-item-icon>
						<v-list-item-content>Show code</v-list-item-content>
					</v-list-item>
				</v-list>
			</v-menu>

			<v-menu show-arrow>
				<template #activator="{ toggle }">
					<v-button @click="toggle">
						Import
					</v-button>
				</template>

				<v-list>
					<v-list-item clickable @click="importSchema(true)">
						<v-list-item-icon><v-icon name="upload" /></v-list-item-icon>
						<v-list-item-content>Import from file</v-list-item-content>
					</v-list-item>
					<v-list-item clickable @click="importSchema(false)">
						<v-list-item-icon><v-icon name="code" /></v-list-item-icon>
						<v-list-item-content>From code</v-list-item-content>
					</v-list-item>
				</v-list>
			</v-menu>
		</template>

		<div class="schema-management">
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
					block
					class="collection-item"
				>
					<span>
						<v-icon
							:color="col.meta?.hidden ? 'var(--foreground-subdued)' : col.color ?? 'var(--primary)'"
							class="collection-icon"
							:name="col.meta?.hidden ? 'visibility_off' : col.icon"
						/>
						<span class="collection-name" :class="{ hidden: col.meta?.hidden }">{{ col.name }}</span>
					</span>
				</v-checkbox>
			</div>
		</div>

		<v-dialog v-model="showProgress">
			<v-card>
				<v-card-title>Import Status</v-card-title>
				<v-card-text>
					<div v-for="(progress, idx) in importProgress" :key="idx">{{ progress }}</div>
				</v-card-text>

				<v-card-actions>
					<v-button :loading="loading" @click="showProgress = false">
						Done
					</v-button>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<v-dialog v-model="showCode" @esc="showCode = false">
			<v-card>
				<v-card-title>Schema</v-card-title>

				<v-card-text>
					<v-textarea v-model="code" />
				</v-card-text>

				<v-card-actions>
					<v-button secondary @click="showCode = false">
						Close
					</v-button>
					<v-button v-if="isImport" @click="importSchemaFromCode">
						Import
					</v-button>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</private-view>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
import { useStores, useApi } from '@directus/extensions-sdk';
import { Collection, Field, Relation } from '@directus/shared/types';

type DataModel = {
	collections?: Collection[];
	fields?: Field[];
	relations?: Relation[];
}

export default defineComponent({
	setup() {
		const {
			useCollectionsStore,
			useFieldsStore,
			useRelationsStore,
		} = useStores();
		const api = useApi();

		const collectionsStore = useCollectionsStore();
		const fieldsStore = useFieldsStore();
		const relationsStore = useRelationsStore();

		const collections = computed(() => (collectionsStore.allCollections as Collection[]).filter(c => c.schema !== null));

		const selections = ref<string[]>([]);
		const checkAll = ref(false);

		const showProgress = ref(false);
		const importProgress = ref<string[]>([]);
		const loading = ref(false);

		const showCode = ref(false);
		const code = ref('');
		const isImport = ref(false);

		return {
			collections,
			selections,
			checkAll,
			showProgress,
			importProgress,
			loading,
			showCode,
			code,
			isImport,
			exportSchema,
			importSchema,
			importSchemaFromCode,
			toggleAll,
		};

		function exportSchema(download: boolean) {
			const exportCollections = collections.value
				.map(({ collection, meta }) => ({ collection, meta, schema: {} }))
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
				.map(c => (relationsStore.relations as Relation[]).filter(r => r.collection === c))
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

			if (download) {
				const element = document.createElement('a');
				element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(schemaContent));
				element.setAttribute('download', 'schema.json');

				element.style.display = 'none';
				document.body.appendChild(element);

				element.click();

				document.body.removeChild(element);
			} else {
				code.value = schemaContent;
				showCode.value = true;
				isImport.value = false;
			}
		}

		function importSchema(fromFile: boolean) {
			if (fromFile) {
				const input = document.createElement('input');
				input.type = 'file';

				input.onchange = (e) => { 
					const file = e.target.files[0];

					const reader = new FileReader();
					reader.readAsText(file, 'UTF-8');

					reader.onload = (readerEvent) => {
						const dataModel = JSON.parse(readerEvent.target.result);
						loadSchema(dataModel);
					}
				}

				input.click();
			} else {
				code.value = '';
				showCode.value = true;
				isImport.value = true;
			}
		}

		function importSchemaFromCode() {
			showCode.value = false;
			const dataModel = JSON.parse(code.value);
			loadSchema(dataModel);
		}

		function toggleAll(checked: boolean) {
			if (checked) {
				selections.value = collections.value.map(c => c.collection);
			} else {
				selections.value = [];
			}
		}

		async function loadSchema(dataModel: DataModel) {
			loading.value = true;
			showProgress.value = true;
			importProgress.value = ['Start importing...'];

			try {
				if (dataModel.collections instanceof Array && dataModel.fields instanceof Array) {
					for (const collection of dataModel.collections) {
						importProgress.value.push(`Importing collection "${collection.collection}"`);
						const fields = dataModel.fields.filter(f => f.collection === collection.collection);
						await api.post('/collections', {
							...collection,
							fields,
						});
					}
				}

				if (dataModel.relations instanceof Array) {
					for (const relation of dataModel.relations) {
						importProgress.value.push(`Importing relation "${relation.collection}-${relation.field}-${relation.related_collection}"`);
						await api.post('/relations', relation);
					}
				}

				importProgress.value.push('Done');
			} catch (err: any) {
				const message = err.response?.data?.errors?.[0]?.message || err.message || undefined;
				importProgress.value.push('Error: ' + message);
			} finally {
				await collectionsStore.hydrate();
				await fieldsStore.hydrate();
				await relationsStore.hydrate();
				loading.value = false;
			}
		}
	}
});
</script>

<style lang="scss" scoped>
.schema-management {
	margin-left: var(--content-padding);

	.collection-item {
		margin-bottom: 8px;
	}

	.collection-icon {
		margin-right: 8px;
	}

	.collection-name.hidden {
		color: var(--foreground-subdued);
	}
}
</style>
