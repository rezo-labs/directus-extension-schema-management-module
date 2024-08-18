import { Collection, Field, Relation, Role, Policy, Permission } from '@directus/types';

export type AppRole = Role & {
	policies: string[];
	children: string[];
}

export type AppPolicy = Policy & {
	users: string[];
	roles: string[];
	permissions: string[];
}

export type Access = {
	id: string;
	role: string;
	user: string;
	policy: string;
}

export type DataModel = {
	collections?: Collection[];
	fields?: Field[];
	relations?: Relation[];
}

export type RolesModel = {
	roles?: Role[];
	policies?: AppPolicy[];
	permissions?: Permission[];
	access?: Access[];
}
