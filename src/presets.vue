<template>
  <v-card>
    <v-card-title>Presets</v-card-title>

    <v-card-text>
      <div class="preset-repo">
        <div>Preset Repository</div>
        <div class="preset-repo-input">
          <v-input v-model="presetRepo" placeholder="rezo-labs/directus-schema-presets" />
          <v-button icon x-large :loading="loadingPresets" @click="loadPresets">
            <v-icon name="refresh" />
          </v-button>
        </div>
        <small class="type-note">Github Repository containing your presets. In "{owner}/{repo}" format.</small>
        <v-input v-model="presetRepoToken" type="password" small />
        <small class="type-note">Your Github Personal Access Token, for private repositories.</small>
      </div>

      <div>
        <div>Select Presets</div>
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
      </div>
    </v-card-text>

    <v-card-actions>
      <v-button secondary @click="$emit('close')">
        Close
      </v-button>
      <v-button :loading="importingSchema" @click="importSchema">
        Import
      </v-button>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch } from "vue";
import { DataModel } from './types';

export default defineComponent({
  emits: ['close', 'import'],
  setup(props, { emit }) {
    const presetRepo = ref(window.localStorage.getItem('SCHEMA_MANAGEMENT_MODULE__PRESET_REPO') || 'rezo-labs/directus-schema-presets');
    const presetRepoToken = ref(window.localStorage.getItem('SCHEMA_MANAGEMENT_MODULE__PRESET_REPO_TOKEN') || '');
    const presets = ref([]);
    const loadingPresets = ref(false);
    const error = ref<any>(null);
    const selections = ref([]);
    const importingSchema = ref(false);

    const headers = computed(() => {
      const commonHeaders = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      };
      if (presetRepoToken.value) {
        return {
          ...commonHeaders,
          Authorization: `Bearer ${presetRepoToken.value}`,
        };
      }
      return commonHeaders;
    });

    loadPresets();

    watch(presetRepo, () => {
      window.localStorage.setItem('SCHEMA_MANAGEMENT_MODULE__PRESET_REPO', presetRepo.value);
    });

    watch(presetRepoToken, () => {
      window.localStorage.setItem('SCHEMA_MANAGEMENT_MODULE__PRESET_REPO_TOKEN', presetRepoToken.value);
    });

    return {
      presetRepo,
      presetRepoToken,
      presets,
      loadingPresets,
      error,
      selections,
      importingSchema,
      loadPresets,
      importSchema,
    };

    async function loadPresets() {
      try {
        loadingPresets.value = true;
        error.value = null;

        const res = await fetch(`https://api.github.com/repos/${presetRepo.value}/contents/config.json`, {
          headers: headers.value,
        });
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
      importingSchema.value = true;
      const combinedSchema: DataModel = {
        collections: [],
        fields: [],
        relations: [],
      };
      try {
        for (const preset of selections.value) {
          const res = await fetch(`https://api.github.com/repos/${presetRepo.value}/contents/${preset}/all.json`, {
            headers: headers.value,
          });
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
      } finally {
        importingSchema.value = false;
      }
    }
  },
});
</script>

<style lang="scss" scoped>
.preset-repo {
  margin-bottom: 16px;
}

.preset-repo-input {
  display: flex;

  .v-button {
    margin-left: 8px;
  }
}

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
