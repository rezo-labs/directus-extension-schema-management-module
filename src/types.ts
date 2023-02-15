import { Collection, Field, Relation } from '@directus/shared/types';

export type DataModel = {
	collections?: Collection[];
	fields?: Field[];
	relations?: Relation[];
}
