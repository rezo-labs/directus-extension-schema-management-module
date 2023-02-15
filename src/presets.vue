<template>
  <v-card>
    <v-card-title>Select presets</v-card-title>

    <v-card-text>
      <v-progress-circular v-if="loadingPresets" class="preset-loading" indeterminate />

      <v-notice v-else-if="error" type="danger">
        {{ error }}
      </v-notice>

      <template v-else>
        <v-checkbox
          v-for="preset in presets"
          :key="preset.preset"
          :value="preset.preset"
          v-model="selections"
          block
          class="preset-item"
        >
          <div class="preset-title">
            <v-icon :name="preset.icon"/>
            <div>
              <div>{{ preset.name }}</div>
              <div class="preset-description">{{ preset.description }}</div>
            </div>
          </div>
        </v-checkbox>
      </template>
    </v-card-text>

    <v-card-actions>
      <v-button secondary @click="$emit('close')">
        Close
      </v-button>
      <v-button @click="importSchema">
        Import
      </v-button>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
import { DataModel } from './types';

export default defineComponent({
  emits: ['close', 'import'],
  setup(props, { emit }) {
    const presets = ref([]);
    const loadingPresets = ref(true);
    const error = ref<any>(null);
    const selections = ref([]);

    loadPresets();

    return {
      presets,
      loadingPresets,
      error,
      selections,
      importSchema,
    };

    async function loadPresets() {
      try {
        const res = await fetch('https://api.github.com/repos/rezo-labs/directus-schema-presets/contents/config.json');
        if (!res.ok) {
          throw new Error('Something went wrong');
        }
        
        const data = await res.json();
        presets.value = JSON.parse(window.atob(data.content));
      } catch (err) {
        error.value = err;
      } finally {
        loadingPresets.value = false;
      }
    }

    async function importSchema() {
      const combinedSchema: DataModel = {
        collections: [],
        fields: [],
        relations: [],
      };
      try {
        for (const preset of selections.value) {
          const res = await fetch(`https://api.github.com/repos/rezo-labs/directus-schema-presets/contents/${preset}/all.json`);
          if (!res.ok) {
            throw new Error('Something went wrong');
          }

          const data = await res.json();
          const schema: DataModel = JSON.parse(window.atob(data.content));
          combinedSchema.collections?.push(...(schema.collections || []));
          combinedSchema.fields?.push(...(schema.fields || []));
          combinedSchema.relations?.push(...(schema.relations || []));
        }

        emit('close');
        emit('import', combinedSchema);
      } catch (err) {
        error.value = err;
      }
    }
  },
});
</script>

<style lang="scss" scoped>
.preset-loading {
  margin: 32px auto;
}

.preset-item {
  margin-bottom: 8px;

  .v-icon {
    margin-right: 8px;
  }
}

.preset-title {
  display: flex;
  align-items: center;

  .preset-description {
    color: var(--foreground-subdued);
    font-size: 12px;
    line-height: 16px;
  }
}
</style>
