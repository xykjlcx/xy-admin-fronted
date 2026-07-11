import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { http } from '@/lib/http/client';
import { defineApiContract, defineVoidContract } from '@/lib/http/contract';
import { dictionaryKeys } from './keys';
import {
  CreateDictionaryItemSchema,
  CreateDictionarySchema,
  DictionaryItemSchema,
  DictionarySchema,
  SetDictionaryItemEnabledSchema,
  UpdateDictionaryItemSchema,
  UpdateDictionarySchema,
  type CreateDictionaryInput,
  type CreateDictionaryItemInput,
  type SetDictionaryItemEnabledInput,
  type UpdateDictionaryInput,
  type UpdateDictionaryItemInput,
} from './schema';

const dictionariesContract = defineApiContract({ response: z.array(DictionarySchema) });
const dictionaryContract = defineApiContract({ response: DictionarySchema });
const dictionaryItemsContract = defineApiContract({ response: z.array(DictionaryItemSchema) });
const dictionaryItemContract = defineApiContract({ response: DictionaryItemSchema });
const nullContract = defineVoidContract();

export const dictionariesQuery = queryOptions({
  queryKey: dictionaryKeys.list(),
  staleTime: 5 * 60 * 1000,
  queryFn: ({ signal }) => http.get('/api/dictionaries', undefined, dictionariesContract, { signal }),
});

export const dictionaryItemsQuery = (dictionaryId: string) =>
  queryOptions({
    queryKey: dictionaryKeys.items(dictionaryId),
    staleTime: 5 * 60 * 1000,
    queryFn: ({ signal }) =>
      http.get(`/api/dictionaries/${dictionaryId}/items`, undefined, dictionaryItemsContract, { signal }),
  });

export const dictionaryApi = {
  createDictionary: (input: CreateDictionaryInput) =>
    http.post('/api/dictionaries', CreateDictionarySchema.parse(input), dictionaryContract),
  updateDictionary: (id: string, input: UpdateDictionaryInput) =>
    http.put(`/api/dictionaries/${id}`, UpdateDictionarySchema.parse(input), dictionaryContract),
  deleteDictionary: (id: string) => http.del(`/api/dictionaries/${id}`, nullContract),
  createItem: (dictionaryId: string, input: CreateDictionaryItemInput) =>
    http.post(
      `/api/dictionaries/${dictionaryId}/items`,
      CreateDictionaryItemSchema.parse(input),
      dictionaryItemContract,
    ),
  updateItem: (dictionaryId: string, itemId: string, input: UpdateDictionaryItemInput) =>
    http.put(
      `/api/dictionaries/${dictionaryId}/items/${itemId}`,
      UpdateDictionaryItemSchema.parse(input),
      dictionaryItemContract,
    ),
  setItemEnabled: (dictionaryId: string, itemId: string, input: SetDictionaryItemEnabledInput) =>
    http.patch(
      `/api/dictionaries/${dictionaryId}/items/${itemId}/enabled`,
      SetDictionaryItemEnabledSchema.parse(input),
      dictionaryItemContract,
    ),
  deleteItem: (dictionaryId: string, itemId: string) =>
    http.del(`/api/dictionaries/${dictionaryId}/items/${itemId}`, nullContract),
};
