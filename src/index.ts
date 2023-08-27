import { defineModule } from '@directus/extensions-sdk';
import SchemaManagement from './schema-management.vue';
import RolesManagement from './roles-management.vue';

export default defineModule({
	id: 'schema-management-module',
	name: 'Schema Management Module',
	icon: 'schema',
	routes: [
		{
			name: 'schema-management-module',
			path: '',
			component: SchemaManagement,
			beforeEnter() {
				return `/schema-management-module/schema`;
			},
		},
		{
			path: 'schema',
			component: SchemaManagement,
		},
		{
			path: 'roles',
			component: RolesManagement,
		},
	],
	preRegisterCheck(user) {
		return user.role.admin_access === true;
	},
});
