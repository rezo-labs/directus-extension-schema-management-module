<template>
  <v-dialog v-model="active">
    <v-card>
      <v-card-title>Schema</v-card-title>

      <v-card-text v-if="state === State.CONFIGURE">
      </v-card-text>

      <v-card-actions>
        <v-button secondary @click="dispatch(Action.BACK)">
          Back
        </v-button>
        <v-button>
          Import
        </v-button>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
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
  props: {
    active: {
      type: Boolean,
      required: true,
    },
    dataModel: {
      type: Object as () => DataModel,
      required: true,
    },
  },
  setup(props) {
    const state = ref<State>(State.CONFIGURE);

    return {
      State,
      Action,
      state,
      dispatch,
    };

    function dispatch(action: Action) {
    }
  },
});
</script>

<style lang="scss" scoped>
</style>