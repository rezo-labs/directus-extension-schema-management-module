import { Collection, Field, Relation, Role, Permission } from '@directus/types';

export type DataModel = {
	collections?: Collection[];
	fields?: Field[];
	relations?: Relation[];
}

export type RolesModel = {
	roles?: Role[];
	permissions?: Permission[];
}
