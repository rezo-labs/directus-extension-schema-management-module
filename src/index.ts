import { defineModule } from '@directus/extensions-sdk';
import ModuleComponent from './module.vue';

export default defineModule({
	id: 'schema-management-module',
	name: 'Schema Management Module',
	icon: 'schema',
	routes: [
		{
			path: '',
			component: ModuleComponent,
		},
	],
	preRegisterCheck(user) {
		return user.role.admin_access === true;
	},
});
