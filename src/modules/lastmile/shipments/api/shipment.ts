import { queryOptions } from '@tanstack/react-query';
import { defineApiContract } from '@/lib/http/contract';
import { http } from '@/lib/http/client';
import { shipmentKeys } from './keys';
import {
  CreateShipmentSchema,
  PrintResultSchema,
  PrintShipmentInputSchema,
  ShipmentListSchema,
  ShipmentOptionsSchema,
  ShipmentSchema,
  type CreateShipmentInput,
  type PrintShipmentInput,
  type ShipmentFilter,
} from './schema';

const listContract = defineApiContract({ response: ShipmentListSchema });
const detailContract = defineApiContract({ response: ShipmentSchema });
const optionsContract = defineApiContract({ response: ShipmentOptionsSchema });
const printContract = defineApiContract({ response: PrintResultSchema });

export const shipmentsQuery = (keyword: string, status: ShipmentFilter) =>
  queryOptions({
    queryKey: shipmentKeys.list(keyword, status),
    queryFn: ({ signal }) =>
      http.get('/api/lastmile/shipments', { keyword, status }, listContract, { signal }),
  });
export const shipmentDetailQuery = (id: string) =>
  queryOptions({
    queryKey: shipmentKeys.detail(id),
    queryFn: ({ signal }) => http.get(`/api/lastmile/shipments/${id}`, undefined, detailContract, { signal }),
  });
export const shipmentOptionsQuery = queryOptions({
  queryKey: shipmentKeys.options(),
  queryFn: ({ signal }) => http.get('/api/lastmile/shipment-options', undefined, optionsContract, { signal }),
  staleTime: 5 * 60_000,
});
export const shipmentApi = {
  create: (input: CreateShipmentInput) =>
    http.post('/api/lastmile/shipments', CreateShipmentSchema.parse(input), detailContract),
  print: (id: string, input: PrintShipmentInput) =>
    http.post(`/api/lastmile/shipments/${id}/print`, PrintShipmentInputSchema.parse(input), printContract),
  batchPrint: () => http.post('/api/lastmile/shipments/batch-print', undefined, listContract),
};
