<template>
	<private-view title="Roles & Permissions Management">
		<template #navigation>
			<navigation />
		</template>

		<template #title-outer:prepend>
			<v-button class="header-icon" rounded disabled icon secondary>
				<v-icon name="admin_panel_settings" />
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
					<v-list-item clickable @click="exportRoles(true)">
						<v-list-item-icon><v-icon name="download" /></v-list-item-icon>
						<v-list-item-content>Download file</v-list-item-content>
					</v-list-item>
					<v-list-item clickable @click="exportRoles(false)">
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
					<v-list-item clickable @click="importRoles(true)">
						<v-list-item-icon><v-icon name="upload" /></v-list-item-icon>
						<v-list-item-content>Upload file</v-list-item-content>
					</v-list-item>
					<v-list-item clickable @click="importRoles(false)">
						<v-list-item-icon><v-icon name="code" /></v-list-item-icon>
						<v-list-item-content>From code</v-list-item-content>
					</v-list-item>
				</v-list>
			</v-menu>
		</template>

		<div class="roles-management">
			<div class="role-list">
				<v-checkbox
					v-for="role in roles"
					block
					class="role-item"
					:value="role.id"
					:model-value="selections"
					@update:model-value="selections = $event"
				>
					<span>
						<v-icon class="role-icon" :name="role.icon" />
						<span class="role-name">{{ role.name }}</span>
					</span>
				</v-checkbox>
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
					<v-button v-if="isImport" @click="importRolesFromCode">
						Import
					</v-button>
				</v-card-actions>
			</v-card>
		</v-dialog>

		<v-dialog v-model="showProgress">
			<v-card>
				<v-card-title>Import Status</v-card-title>
				<v-card-text>
					<div v-for="(progress, idx) in importProgress" :key="idx">{{ progress }}</div>
				</v-card-text>

				<v-card-actions>
					<v-button :loading="loading" @click="showProgress = false">
						Done
					</v-button>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</private-view>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useStores, useApi } from '@directus/extensions-sdk';
import { Permission } from '@directus/types';
import { RolesModel, AppRole, AppPolicy, Access } from './types';
import Navigation from './navigation.vue';

export default defineComponent({
	components: {
		Navigation,
	},
	setup() {
		const { useNotificationsStore } = useStores();

		const notificationsStore = useNotificationsStore();

		const api = useApi();
		const { roles, fetchRoles } = useRoles();
		const { policies, fetchPolicies } = usePolicies();
		const { permissions, fetchPermissions } = usePermissions();
		const { accesses, fetchAccesses } = useAccesses();

		const selections = ref<string[]>([]);

		const showCode = ref(false);
		const code = ref('');
		const isImport = ref(false);

		const showProgress = ref(false);
		const importProgress = ref<string[]>([]);
		const loading = ref(false);

		return {
			roles,
			selections,
			showCode,
			code,
			isImport,
			showProgress,
			importProgress,
			loading,
			exportRoles,
			importRoles,
			importRolesFromCode,
		};

		function useRoles() {
			const roles = ref<AppRole[]>([]);

			fetchRoles();

			return { roles, fetchRoles };

			async function fetchRoles() {
				const response = await api.get('/roles');
				roles.value = response.data.data;
			}
		}

		function usePolicies() {
			const policies = ref<AppPolicy[]>([]);

			fetchPolicies();

			return { policies, fetchPolicies };

			async function fetchPolicies() {
				const response = await api.get('/policies');
				policies.value = response.data.data;
			}
		}

		function usePermissions() {
			const permissions = ref<Permission[]>([]);

			fetchPermissions();

			return { permissions, fetchPermissions };

			async function fetchPermissions() {
				const response = await api.get('/permissions');
				permissions.value = response.data.data;
			}
		}

		function useAccesses() {
			const accesses = ref<Access[]>([]);

			fetchAccesses();

			return { accesses, fetchAccesses };

			async function fetchAccesses() {
				const response = await api.get('/access');
				accesses.value = response.data.data;
			}
		}

		function exportRoles(download: boolean) {
			const exportedRoles = roles.value
				.filter(c => selections.value.includes(c.id))
				.map((role) => ({ ...role, policies: [], users: [], children: [] }));
			
			const exportedAccess = accesses.value
				.filter(a => exportedRoles.some(r => r.id === a.role));

			const exportedPolicies = policies.value
				.filter(p => exportedAccess.some(a => a.policy === p.id))
				.map((p) => ({ ...p, roles: [], users: [], permissions: [] }));

			const exportedPermissions = permissions.value
				.filter(p => exportedPolicies.some(po => po.id === p.policy))
				.map(({ id, ...p }) => p);

			const rolesModel: RolesModel = {
				roles: exportedRoles,
				policies: exportedPolicies,
				permissions: exportedPermissions,
				access: exportedAccess,
			};

			const modelContent = JSON.stringify(rolesModel, null, 4);

			if (download) {
				const element = document.createElement('a');
				element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(modelContent));
				element.setAttribute('download', 'schema.json');

				element.style.display = 'none';
				document.body.appendChild(element);

				element.click();

				document.body.removeChild(element);
			} else {
				code.value = modelContent;
				showCode.value = true;
				isImport.value = false;
			}
		}

		function importRoles(fromFile: boolean) {
			if (fromFile) {
				const input = document.createElement('input');
				input.type = 'file';

				input.onchange = (e) => {
					const file = e.target.files[0];

					const reader = new FileReader();
					reader.readAsText(file, 'UTF-8');

					reader.onload = (readerEvent) => {
						try {
							const rolesModel = JSON.parse(readerEvent.target.result);
							loadRoles(rolesModel);
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

		function importRolesFromCode() {
			try {
				const rolesModel = JSON.parse(code.value);
				showCode.value = false;
				loadRoles(rolesModel);
			} catch (err) {
				if (err instanceof Error) {
					notificationsStore.add({
						title: err.message,
						dialog: true,
					});
				}
			}
		}

		async function loadRoles(rolesModel: RolesModel) {
			loading.value = true;
			showProgress.value = true;
			importProgress.value = ['Start importing...'];

			const { roles, policies, permissions, access } = rolesModel;

			try {
				// TODO: import role in order from parent to child
				if (Array.isArray(roles) && roles.length > 0) {
					importProgress.value.push('Importing roles...');
					await api.post('/roles', roles);
				}

				if (Array.isArray(policies) && policies.length > 0) {
					importProgress.value.push('Importing policies...');
					await api.post('/policies', policies);
				}

				if (Array.isArray(permissions) && permissions.length > 0) {
					importProgress.value.push('Importing permissions...');
					await api.post('/permissions', permissions);
				}

				if (Array.isArray(access) && access.length > 0) {
					importProgress.value.push('Importing access...');
					await api.post('/access', access);
				}

				importProgress.value.push('Done');
			} catch (err) {
				const message = err.response?.data?.errors?.[0]?.message || err.message || undefined;
				importProgress.value.push('Error: ' + message);
			} finally {
				await Promise.all([
					fetchRoles(),
					fetchPolicies(),
					fetchPermissions(),
					fetchAccesses(),
				]);
				loading.value = false;
			}
		}
  },
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

.roles-management {
	padding: var(--content-padding);
	padding-top: 0;

	.role-list {
		margin-top: 20px;
	}

	.role-item {
		margin-bottom: 8px;
	}

	.role-icon {
		margin-right: 8px;
	}
}
</style>
