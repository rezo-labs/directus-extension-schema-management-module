<template>
  <div class="content-navigation-wrapper">
    <v-list class="content-navigation" nav dense>
      <v-list-item clickable :to="'/schema-management-module/schema'">
        <v-list-item-icon>
          <v-icon name="list_alt" />
        </v-list-item-icon>
        <v-list-item-content>
          <v-text-overflow text="Schema" />
        </v-list-item-content>
      </v-list-item>

      <v-list-item clickable :to="'/schema-management-module/roles'">
        <v-list-item-icon>
          <v-icon name="admin_panel_settings" />
        </v-list-item-icon>
        <v-list-item-content>
          <v-text-overflow text="Roles" />
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </div>
</template>

<style lang="scss" scoped>
.content-navigation-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.content-navigation {
  --v-list-min-height: calc(100% - 64px);

  flex-grow: 1;
}
</style>
