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
          <v-button v-if="state === State.CONFIGURE" secondary @click="dispatch(Action.BACK)">
            Back
          </v-button>
          <v-button v-if="state === State.CONFIGURE" @click="dispatch(Action.NEXT)">
            Next
          </v-button>
        </v-card-actions>
      </template>

      <template v-if="state === State.SELECT">
        <v-card-title>Select the data model you want to import</v-card-title>

        <v-card-text>
        </v-card-text>

        <v-card-actions>
          <v-button v-if="state === State.SELECT" secondary @click="dispatch(Action.BACK)">
            Back
          </v-button>
          <v-button v-if="state === State.SELECT" @click="dispatch(Action.IMPORT)">
            Import
          </v-button>
        </v-card-actions>
      </template>

      <template v-if="state === State.IMPORTING">
        <v-card-title>Importing</v-card-title>

        <v-card-text>
          <div v-for="(progress, idx) in importProgress" :key="idx">{{ progress }}</div>
        </v-card-text>

        <v-card-actions>
          <v-button v-if="state === State.IMPORTING" :loading="loading" @click="active = false">
            Done
          </v-button>
        </v-card-actions>
      </template>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useStores, useApi } from '@directus/extensions-sdk';
import { DataModel } from './types';

enum State {
  CONFIGURE = 'configure',
  SELECT = 'select',
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
        tooltip: 'This mode will only create new collections along with their fields and relations. If a collection already exists, an error will be thrown.',
      },
      {
        value: Mode.NEW_AND_PATCH,
        label: 'Create new collections and patch existing ones',
        tooltip: 'This mode will create new collections along with their fields and relations. If a collection already exists, it will be patched with the new fields and relations. Any existing fields or relations will be left untouched.',
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

    const mode = ref<Mode>(Mode.NEW_ONLY);
    const stopOnError = ref(false);

    const importProgress = ref<string[]>([]);
    const loading = ref(false);

    return {
      MODES,
      State,
      Action,
      active,
      state,
      mode,
      stopOnError,
      importProgress,
      loading,
      resetState,
      dispatch,
    };

    function resetState(dm: DataModel) {
      active.value = true;
      state.value = State.CONFIGURE;
      dataModel.value = dm;
      importProgress.value = [];
      loading.value = false;
    }

    function dispatch(action: Action) {
      if (state.value === State.CONFIGURE) {
        if (action === Action.BACK) {
          active.value = false;
        } else if (action === Action.NEXT) {
          state.value = State.SELECT;
        }
      }
      if (state.value === State.SELECT) {
        if (action === Action.BACK) {
          state.value = State.CONFIGURE;
        } else if (action === Action.IMPORT) {
          state.value = State.IMPORTING;
          loadSchema();
        }
      }
    }

    async function loadSchema() {
      loading.value = true;
      importProgress.value = ['Start importing...'];
      const dm = dataModel.value;

      try {
        if (dm.collections instanceof Array && dm.fields instanceof Array) {
          for (const collection of dm.collections) {
            importProgress.value.push(`Importing collection "${collection.collection}"`);
            const fields = dm.fields.filter(f => f.collection === collection.collection);

            try {
              await api.post('/collections', {
                ...collection,
                fields,
              });
            } catch (err: any) {
              if (stopOnError.value) {
                throw err;
              }
            }
          }
        }

        if (dm.relations instanceof Array) {
          for (const relation of dm.relations) {
            importProgress.value.push(`Importing relation "${relation.collection}-${relation.field}-${relation.related_collection}"`);

            try {
              await api.post('/relations', relation);
            } catch (err: any) {
              if (stopOnError.value) {
                throw err;
              }
            }
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
</style>