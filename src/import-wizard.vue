<template>
  <v-dialog :model-value="active" @update:model-value="!loading && (active = $event)">
    <v-card>
      <template v-if="state === State.CONFIGURE">
        <v-card-title>Configure how you want to import the data model</v-card-title>

        <v-card-text>
          <h1>Mode</h1>
          <v-radio
            v-for="m in MODES"
            :key="m.value"
            block
            :value="m.value"
            :label="m.label"
            v-model="mode"
            v-tooltip.right="m.tooltip"
          />
        </v-card-text>

        <v-card-text>
          <h1>Options</h1>
          <v-checkbox
            block
            label="Stop on error"
            :model-value="stopOnError"
            @update:model-value="stopOnError = $event"
          />
        </v-card-text>

        <v-card-actions>
          <v-button secondary @click="dispatch(Action.BACK)">
            Cancel
          </v-button>
          <v-button @click="dispatch(Action.NEXT)">
            Next
          </v-button>
        </v-card-actions>
      </template>

      <template v-if="state === State.SELECT_COLLECTION">
        <v-card-title>Select the collections you want to import</v-card-title>

        <v-card-text>
          <template v-if="dataModel.collections?.length">
            <v-checkbox
              v-model="checkAllCollections"
              label="Select all"
              class="collection-item"
            />
            <v-checkbox
              v-for="collection in dataModel.collections"
              block
              class="collection-item"
              :value="collection.collection"
              v-model="collectionSelections"
            >
              <span>
                <v-icon
                  :color="collection.meta?.hidden ? 'var(--foreground-subdued)' : collection.meta?.color ?? 'var(--primary)'"
                  class="collection-icon"
                  :name="collection.meta?.hidden ? 'visibility_off' : (collection.meta?.icon || 'label')"
                />
                <span class="collection-name" :class="{ hidden: collection.meta?.hidden }">{{ collection.meta?.collection }}</span>
              </span>
            </v-checkbox>
          </template>

          <template v-else>
            <p>No collections found</p>
          </template>
        </v-card-text>

        <v-card-actions>
          <v-button secondary @click="dispatch(Action.BACK)">
            Back
          </v-button>
          <v-button @click="dispatch(Action.NEXT)">
            Next
          </v-button>
        </v-card-actions>
      </template>

      <template v-if="state === State.SELECT_RELATION">
        <v-card-title>Select the relations you want to import</v-card-title>

        <v-card-text>
          <template v-if="dataModel.collections?.length">
            <v-checkbox
              v-model="checkAllRelations"
              label="Select all"
              class="collection-item"
            />
            <v-checkbox
              v-for="r in dataModel.relations"
              block
              class="collection-item"
              :value="`${r.collection}-${r.field}-${r.related_collection}`"
              v-model="relationsSelections"
            >
              <span class="collection-name">{{ `${r.collection} - ${r.field} - ${r.related_collection}` }}</span>
            </v-checkbox>
          </template>

          <template v-else>
            <p>No relations found</p>
          </template>
        </v-card-text>

        <v-card-actions>
          <v-button secondary @click="dispatch(Action.BACK)">
            Back
          </v-button>
          <v-button @click="dispatch(Action.IMPORT)">
            Next
          </v-button>
        </v-card-actions>
      </template>

      <template v-if="state === State.IMPORTING">
        <v-card-title>Importing</v-card-title>

        <v-card-text>
          <div v-for="(progress, idx) in importProgress" :key="idx">{{ progress }}</div>
        </v-card-text>

        <v-card-actions>
          <v-button :loading="loading" @click="active = false">
            Done
          </v-button>
        </v-card-actions>
      </template>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
import { useStores, useApi } from '@directus/extensions-sdk';
import { Collection, Field, Relation } from '@directus/shared/types';
import { DataModel } from './types';

enum State {
  CONFIGURE = 'configure',
  SELECT_COLLECTION = 'select_collection',
  SELECT_RELATION = 'select_relation',
  IMPORTING = 'importing',
}

enum Action {
  BACK = 'back',
  NEXT = 'next',
  IMPORT = 'import',
}

enum Mode {
  NEW_ONLY = 'new_only',
  NEW_AND_PATCH = 'new_and_patch',
}

export default defineComponent({
  setup() {
    const MODES = [
      {
        value: Mode.NEW_ONLY,
        label: 'Only create new collections',
        tooltip: 'This mode will only create new collections. If a collection already exists, it will be skipped.',
      },
      {
        value: Mode.NEW_AND_PATCH,
        label: 'Create new collections and patch existing ones',
        tooltip: 'This mode will create new collections. If a collection already exists, it will be patched with the new fields. Any existing fields will be left untouched.',
      },
    ];

    const {
      useCollectionsStore,
      useFieldsStore,
      useRelationsStore,
    } = useStores();
    const api = useApi();

    const collectionsStore = useCollectionsStore();
    const fieldsStore = useFieldsStore();
    const relationsStore = useRelationsStore();

    const active = ref(false);
    const state = ref<State>(State.CONFIGURE);

    const dataModel = ref<DataModel>({});
    const collectionSelections = ref<string[]>([]);
    const relationsSelections = ref<string[]>([]);

    const mode = ref<Mode>(Mode.NEW_ONLY);
    const stopOnError = ref(false);

    const importProgress = ref<string[]>([]);
    const loading = ref(false);

    const checkAllCollections = computed<boolean>({
      get() {
        return collectionSelections.value.length === dataModel.value.collections?.length;
      },
      set(value) {
        collectionSelections.value = value ? dataModel.value.collections?.map(c => c.collection) || [] : [];
      },
    });
    const checkAllRelations = computed<boolean>({
      get() {
        return relationsSelections.value.length === dataModel.value.relations?.length;
      },
      set(value) {
        relationsSelections.value = value ? dataModel.value.relations?.map(r => `${r.collection}-${r.field}-${r.related_collection}`) || [] : [];
      },
    });

    return {
      MODES,
      State,
      Action,
      active,
      state,
      dataModel,
      collectionSelections,
      relationsSelections,
      mode,
      stopOnError,
      importProgress,
      loading,
      checkAllCollections,
      checkAllRelations,
      resetState,
      dispatch,
    };

    function resetState(dm: DataModel) {
      active.value = true;
      state.value = State.CONFIGURE;

      dataModel.value = dm;
      collectionSelections.value = dm.collections?.map(c => c.collection) || [];
      relationsSelections.value = dm.relations?.map(r => `${r.collection}-${r.field}-${r.related_collection}`) || [];

      mode.value = Mode.NEW_ONLY;
      stopOnError.value = false;

      importProgress.value = [];
      loading.value = false;
    }

    function dispatch(action: Action) {
      if (state.value === State.CONFIGURE) {
        if (action === Action.BACK) {
          active.value = false;
        } else if (action === Action.NEXT) {
          state.value = State.SELECT_COLLECTION;
        }
      }
      else if (state.value === State.SELECT_COLLECTION) {
        if (action === Action.BACK) {
          state.value = State.CONFIGURE;
        } else if (action === Action.NEXT) {
          state.value = State.SELECT_RELATION;
        }
      }
      else if (state.value === State.SELECT_RELATION) {
        if (action === Action.BACK) {
          state.value = State.SELECT_COLLECTION;
        } else if (action === Action.IMPORT) {
          state.value = State.IMPORTING;
          loadSchema();
        }
      }
    }

    async function importCollection(collection: Collection, fields: Field[]) {
      importProgress.value.push(`Importing collection "${collection.collection}"`);

      try {
        await api.post('/collections', {
          ...collection,
          fields,
        });
      } catch (err: any) {
        if (stopOnError.value) {
          throw err;
        } else {
          const message = err.response?.data?.errors?.[0]?.message || err.message || undefined;
          importProgress.value.push('Error: ' + message);
        }
      }
    }

    async function importField(field: Field) {
      importProgress.value.push(`Importing field "${field.collection}-${field.field}"`);

      try {
        await api.post(`/fields/${field.collection}`, field);
      } catch (err: any) {
        if (stopOnError.value) {
          throw err;
        } else {
          const message = err.response?.data?.errors?.[0]?.message || err.message || undefined;
          importProgress.value.push('Error: ' + message);
        }
      }
    }

    async function importRelation(relation: Relation) {
      importProgress.value.push(`Importing relation "${relation.collection}-${relation.field}-${relation.related_collection}"`);

      try {
        await api.post('/relations', relation);
      } catch (err: any) {
        if (stopOnError.value) {
          throw err;
        } else {
          const message = err.response?.data?.errors?.[0]?.message || err.message || undefined;
          importProgress.value.push('Error: ' + message);
        }
      }
    }

    async function loadSchema() {
      loading.value = true;
      importProgress.value = ['Start importing...'];
      const dm = dataModel.value;
      const collections = dm.collections?.filter(c => collectionSelections.value.includes(c.collection)) || [];
      const fields = dm.fields || [];
      const relations = dm.relations?.filter(r => relationsSelections.value.includes(`${r.collection}-${r.field}-${r.related_collection}`)) || [];
      const allCollections: Collection[] = collectionsStore.collections;

      try {
        const importedCollections: string[] = [];
        let lastLength: number | null = null;
        while (importedCollections.length !== lastLength) {
          lastLength = importedCollections.length;

          for (const collection of collections) {
            if (importedCollections.includes(collection.collection)) {
              continue;
            }
            if (collection.meta?.group) {
              const { group } = collection.meta;
              if (!collections.some(c => c.collection === group) && !allCollections.some(c => c.collection === group)) {
                importedCollections.push(collection.collection);
                importProgress.value.push(`Skipping collection "${collection.collection}" because its group "${group}" does not exist`);
                continue;
              }
              if (!importedCollections.includes(group) && !allCollections.some(c => c.collection === group)) {
                continue;
              }
            }
            if (!allCollections.some(c => c.collection === collection.collection)) {
              await importCollection(collection, fields.filter(f => f.collection === collection.collection));
            } else {
              importProgress.value.push(`Skipping collection "${collection.collection}" because it already exists`);
            }
            importedCollections.push(collection.collection);
          }
        }

        if (mode.value === Mode.NEW_AND_PATCH) {
          for (const field of fields) {
            if (allCollections.some(c => c.collection === field.collection)) {
              if (!fieldsStore.getField(field.collection, field.field)) {
                await importField(field);
              } else {
                importProgress.value.push(`Skipping field "${field.collection}-${field.field}" because it already exists`);
              }
            }
          }
        }

        for (const relation of relations) {
          if (relationsStore.getRelationsForField(relation.collection, relation.field).length === 0) {
            await importRelation(relation);
          } else {
            importProgress.value.push(`Skipping relation "${relation.collection}-${relation.field}-${relation.related_collection}" because it already exists`);
          }
        }

        importProgress.value.push('Done');
      } catch (err: any) {
        const message = err.response?.data?.errors?.[0]?.message || err.message || undefined;
        importProgress.value.push('Error: ' + message);
      } finally {
        await Promise.all([
          collectionsStore.hydrate(),
          fieldsStore.hydrate(),
          relationsStore.hydrate(),
        ]);
        loading.value = false;
      }
    }
  },
});
</script>

<style lang="scss" scoped>
.v-card {
	--v-card-max-height: 100vh;
	overflow: auto;

	@media (min-width: 720px) {
		--v-card-min-width: 720px;
	}
}

.collection-item {
  margin-bottom: 8px;
}

.collection-icon {
  margin-right: 8px;
}

.collection-name.hidden {
  color: var(--foreground-subdued);
}
</style>
