<template>
	<private-view title="Schema Management">
		<template #navigation>
			<navigation />
		</template>

		<template #title-outer:prepend>
			<v-button class="header-icon" rounded disabled icon secondary>
				<v-icon name="list_alt" />
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
						<v-list-item-content>Download file</v-list-item-content>
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
						<v-list-item-content>Upload file</v-list-item-content>
					</v-list-item>
					<v-list-item clickable @click="importSchema(false)">
						<v-list-item-icon><v-icon name="code" /></v-list-item-icon>
						<v-list-item-content>From code</v-list-item-content>
					</v-list-item>
					<v-list-item clickable @click="fromPresets = true">
						<v-list-item-icon><v-icon name="format_list_bulleted" /></v-list-item-icon>
						<v-list-item-content>From presets</v-list-item-content>
					</v-list-item>
				</v-list>
			</v-menu>
		</template>

		<div class="schema-management">
			<v-checkbox
				v-model="isAllChecked"
				label="Select all non-system collections"
				class="collection-item"
			/>
			<v-checkbox
				v-model="isAllSystemChecked"
				label="Select all system collections"
				class="collection-item"
			/>
			<div class="collection-list">
				<collection-item
					v-for="col in rootCollections"
					:key="col.collection"
					:collection="col"
					:collections="collections"
					:selections="selections"
					@update:selections="selections = $event"
				/>
			</div>

			<div class="collection-list">
				<div class="system-collections-title">System Collections</div>
				<collection-item
					v-for="col in rootSystemCollections"
					:key="col.collection"
					:collection="col"
					:collections="collections"
					:selections="selections"
					@update:selections="selections = $event"
				/>
			</div>
		</div>

		<v-dialog v-model="showCode" @esc="showCode = false">
			<v-card>
				<v-card-title>Schema</v-card-title>

				<v-card-text>
					<interface-input-code
						placeholder="Insert schema here..."
						language="JSON"
						:line-number="false"
						:disabled="!isImport"
						:value="code"
						@input="code = $event"
					/>
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

		<v-dialog v-model="fromPresets">
			<presets
				@close="fromPresets = false"
				@import="loadSchema($event)"
			/>
		</v-dialog>

		<import-wizard ref="importWizard" />
	</private-view>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
import { useStores } from '@directus/extensions-sdk';
import { AppCollection, Field, Relation } from '@directus/types';
import { sortBy } from 'lodash';
import Navigation from './navigation.vue';
import CollectionItem from './collection-item.vue';
import Presets from './presets.vue';
import ImportWizard from './import-wizard.vue';
import { DataModel } from './types';

export default defineComponent({
	components: {
		Navigation,
		CollectionItem,
		Presets,
		ImportWizard,
	},
	setup() {
		const {
			useCollectionsStore,
			useFieldsStore,
			useRelationsStore,
			useNotificationsStore,
		} = useStores();

		const collectionsStore = useCollectionsStore();
		const fieldsStore = useFieldsStore();
		const relationsStore = useRelationsStore();
		const notificationsStore = useNotificationsStore();

		const collections = computed<AppCollection[]>(() => (
			sortBy(
				collectionsStore.collections.filter((c: AppCollection) => c.meta),
				['meta.sort', 'collection']
			)
		));

		const rootCollections = computed(() => {
			return collections.value.filter((collection) => !collection.meta?.group && !collection.collection.startsWith('directus_'));
		});
		const rootSystemCollections = computed(() => {
			return collections.value.filter((collection) => !collection.meta?.group && collection.collection.startsWith('directus_'));
		});

		const selections = ref<string[]>([]);
		const isAllChecked = computed<boolean>({
			get() {
				return collections.value.filter(c => !c.collection.startsWith('directus_')).every(c => selections.value.includes(c.collection));
			},
			set(checked) {
				if (checked) {
					const oldSelections = selections.value;
					selections.value = collections.value.filter(c => !c.collection.startsWith('directus_') || oldSelections.includes(c.collection)).map(c => c.collection);
				} else {
					selections.value = selections.value.filter(c => c.startsWith('directus_'));
				}
			}
		});
		const isAllSystemChecked = computed<boolean>({
			get() {
				return collections.value.filter(c => c.collection.startsWith('directus_')).every(c => selections.value.includes(c.collection));
			},
			set(checked) {
				if (checked) {
					const oldSelections = selections.value;
					selections.value = collections.value.filter(c => c.collection.startsWith('directus_') || oldSelections.includes(c.collection)).map(c => c.collection);
				} else {
					selections.value = selections.value.filter(c => !c.startsWith('directus_'));
				}
			}
		});

		const showCode = ref(false);
		const code = ref('');
		const isImport = ref(false);

		const fromPresets = ref(false);

		const importWizard = ref(null);

		return {
			collections,
			rootCollections,
			rootSystemCollections,
			selections,
			isAllChecked,
			isAllSystemChecked,
			showCode,
			code,
			isImport,
			fromPresets,
			importWizard,
			exportSchema,
			importSchema,
			importSchemaFromCode,
			loadSchema,
		};

		function exportSchema(download: boolean) {
			const exportCollections = collections.value
				.map(({ collection, meta, schema }) => ({ collection, meta, schema: schema !== null ? {} : null }))
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
						try {
							const dataModel = JSON.parse(readerEvent.target.result);
							loadSchema(dataModel);
						} catch (err) {
							if (err instanceof Error) {
								notificationsStore.add({
									title: err.message,
									dialog: true,
								});
							}
						}
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
			try {
				const dataModel = JSON.parse(code.value);
				showCode.value = false;
				loadSchema(dataModel);
			} catch (err) {
				if (err instanceof Error) {
					notificationsStore.add({
						title: err.message,
						dialog: true,
					});
				}
			}
		}

		async function loadSchema(dataModel: DataModel) {
			importWizard.value?.resetState(dataModel);
		}
	}
});
</script>

<style lang="scss" scoped>
.container .v-card {
	--v-card-max-height: 100vh;
	overflow: auto;

	@media (min-width: 720px) {
		--v-card-min-width: 720px;
	}
}

.v-card-text {
	.input-code {
		:deep(.CodeMirror),
		:deep(.CodeMirror-scroll) {
			max-height: 500px;
		}
	}
}

.schema-management {
	padding: var(--content-padding);
	padding-top: 0;

	.collection-list {
		margin-top: 20px;
	}

	.system-collections-title {
		font-weight: 700;
		margin: 16px 0 8px 0;
	}
}
</style>
