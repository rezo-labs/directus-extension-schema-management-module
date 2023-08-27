<template>
  <div>
    <v-checkbox
      block
      class="collection-item"
      :value="collection.collection"
      :model-value="selections"
      @update:model-value="$emit('update:selections', $event)"
    >
      <span>
        <v-icon
          :color="collection.meta?.hidden ? 'var(--foreground-subdued)' : collection.color ?? 'var(--primary)'"
          class="collection-icon"
          :name="collection.meta?.hidden ? 'visibility_off' : collection.icon"
        />
        <span class="collection-name" :class="{ hidden: collection.meta?.hidden }">{{ collection.name }}</span>
      </span>
    </v-checkbox>

    <div class="collection-group">
      <collection-item
        v-for="col in nestedCollections"
        :key="col.collection"
        :collection="col"
        :collections="collections"
        :selections="selections"
        @update:selections="$emit('update:selections', $event)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed } from 'vue';
import { Collection } from '@directus/shared/types';

export default defineComponent({
  name: 'CollectionItem',
  props: {
		collection: {
			type: Object as PropType<Collection>,
			required: true,
		},
		collections: {
			type: Array as PropType<Collection[]>,
			required: true,
		},
    selections: {
      type: Array as PropType<String[]>,
      required: true,
    },
	},
  emits: ['update:selections'],
  setup(props) {
    const nestedCollections = computed(() =>
			props.collections.filter((collection) => collection.meta?.group === props.collection.collection)
		);

    return { nestedCollections };
  }
});
</script>

<style lang="scss" scoped>
.collection-item {
  margin-bottom: 8px;
}

.collection-icon {
  margin-right: 8px;
}

.collection-name.hidden {
  color: var(--foreground-subdued);
}

.collection-group {
  margin-left: 20px;
}
</style>
