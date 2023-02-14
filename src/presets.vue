<template>
  <v-card>
    <v-card-title>Select presets</v-card-title>

    <v-card-text>
      <v-checkbox
        v-for="preset in presets"
        :key="preset.preset"
        :value="preset.preset"
        v-model="selections"
        block
        class="preset-item"
      >
        <span>
          <v-icon :name="preset.icon"/>
          <span>{{ preset.name }}</span>
        </span>
      </v-checkbox>
    </v-card-text>

    <v-card-actions>
      <v-button secondary @click="$emit('close')">
        Close
      </v-button>
      <v-button @click="loadSchema">
        Import
      </v-button>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";

export default defineComponent({
  setup() {
    const presets = ref([]);
    const error = ref(false);
    const selections = ref([]);

    fetch('https://api.github.com/repos/rezo-labs/directus-schema-presets/contents/config.json')
      .then((res) => res.json())
      .then((data) => {
        presets.value = JSON.parse(window.atob(data.content));
      })
      .catch((err) => {
        error.value = true;
      });

    return {
      presets,
      error,
      selections,
      loadSchema,
    };

    async function loadSchema() {
      for (const preset of selections.value) {
        const res = await fetch(`https://api.github.com/repos/rezo-labs/directus-schema-presets/contents/${preset}/all.json`);
        const data = await res.json();
        const schema = JSON.parse(window.atob(data.content));
      }
    }
  },
});
</script>

<style lang="scss" scoped>
.preset-item {
  margin-bottom: 8px;

  .v-icon {
    margin-right: 8px;
  }
}
</style>
