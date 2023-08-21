<template>
  <v-dialog v-model="active">
    <v-card>
      <v-card-title>Schema</v-card-title>

      <v-card-text v-if="state === State.CONFIGURE">
        <v-checkbox
          block
          label="Stop on error"
          :model-value="stopOnError"
          @update:model-value="stopOnError = $event"
        />
      </v-card-text>

      <v-card-text>
        <div v-for="(progress, idx) in importProgress" :key="idx">{{ progress }}</div>
      </v-card-text>

      <v-card-actions>
        <v-button v-if="state === State.CONFIGURE" secondary @click="dispatch(Action.BACK)">
          Back
        </v-button>

        <v-button v-if="state === State.CONFIGURE" @click="dispatch(Action.IMPORT)">
          Import
        </v-button>

        <v-button v-if="state === State.IMPORTING" :loading="loading" @click="active = false">
          Done
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useStores, useApi } from '@directus/extensions-sdk';
import { DataModel } from './types';

enum State {
  CONFIGURE = 'configure',
  IMPORTING = 'importing',
}

enum Action {
  BACK = 'back',
  IMPORT = 'import',
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

    const active = ref(false);
    const state = ref<State>(State.CONFIGURE);

    const dataModel = ref<DataModel>({});

    const mode = ref<'new' | 'patch'>('new');
    const stopOnError = ref(false);

    const importProgress = ref<string[]>([]);
    const loading = ref(false);

    return {
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