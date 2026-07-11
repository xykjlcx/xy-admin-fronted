import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { PageFrame } from '@/components/pro/PageScaffold';
import { QueryState } from '@/components/pro/QueryState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SelectControl } from '@/components/ui/select';
import { downloadFile } from '@/lib/download';
import { shipmentApi, shipmentDetailQuery, shipmentKeys } from '../api';

export function ShipmentPrintScene({ id, onBack }: { id: string; onBack: () => void }) {
  const { t } = useTranslation('lastmile');
  const queryClient = useQueryClient();
  const result = useQuery(shipmentDetailQuery(id));
  const shipment = result.data;
  const [settings, setSettings] = useState({
    printer: 'Zebra ZT411',
    paper: '100 × 150 mm',
    copies: 1,
    packingList: true,
  });
  const print = useMutation({
    mutationFn: () => shipmentApi.print(id, settings),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: shipmentKeys.all });
      toast.success(t('shipments.toast.printed'));
    },
  });
  const download = useMutation({
    mutationFn: () => downloadFile(`/api/lastmile/shipments/${id}/label`, `label-${shipment?.no ?? id}.pdf`),
    onError: () => toast.error(t('common.downloadFailed')),
  });
  if (!shipment)
    return (
      <PageFrame breadcrumbs={[{ label: t('shipments.title') }, { label: t('shipments.printTitle') }]}>
        <QueryState
          data={shipment}
          pending={result.isPending}
          error={result.isError}
          loadingLabel={t('common.loading')}
          errorLabel={t('common.loadFailed')}
          retryLabel={t('common.retry')}
          onRetry={() => void result.refetch()}
        >
          {() => null}
        </QueryState>
      </PageFrame>
    );
  return (
    <PageFrame breadcrumbs={[{ label: t('shipments.title') }, { label: t('shipments.printTitle') }]}>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <h1 className="ui-page-title text-xl font-semibold">
            {t('shipments.printTitle')} · {shipment.no}
          </h1>
          <p className="mt-1 text-sm text-text-3">{t('shipments.printDescription')}</p>
        </div>
        <div className="flex-1" />
        <Button variant="outline" onClick={onBack}>
          {t('common.back')}
        </Button>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_calc(320px*var(--app-scale))]">
        <Card className="bg-surface-2">
          <CardContent className="flex justify-center p-8">
            <div className="w-[calc(400px*var(--app-scale))] border border-black bg-white p-4 text-black">
              <div className="flex justify-between border-b-2 border-black pb-3 text-xl font-black">
                <span>DHL</span>
                <span className="text-sm">PAKET</span>
              </div>
              <div className="grid grid-cols-[1fr_100px] border-b border-black py-3">
                <div>
                  <small>{t('shipments.from')}</small>
                  <strong className="block">{shipment.customer}</strong>
                  <span>Shenzhen, CN</span>
                </div>
                <div className="border-l border-black pl-3">
                  <small>WEIGHT</small>
                  <strong className="block text-lg">{shipment.weight}kg</strong>
                </div>
              </div>
              <div className="border-b-2 border-black py-3">
                <small>{t('shipments.to')}</small>
                <strong className="mt-1 block text-lg">{shipment.receiver.name}</strong>
                <span className="block">{shipment.receiver.address}</span>
                <span>
                  {shipment.receiver.postalCode} · {shipment.country}
                </span>
              </div>
              <div className="border-b-2 border-black py-5 text-center">
                <div className="font-mono text-4xl tracking-[-0.2em]">|||| ||| |||| | |||||</div>
                <strong className="mt-2 block tracking-[0.25em]">{shipment.trackingNo}</strong>
              </div>
              <div className="flex justify-between pt-3 text-xs">
                <span>Ref: {shipment.no}</span>
                <span>{shipment.createdAt}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('shipments.printTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Field>
                <FieldLabel htmlFor="shipment-printer">{t('shipments.printer')}</FieldLabel>
                <SelectControl
                  id="shipment-printer"
                  value={settings.printer}
                  options={[
                    { value: 'Zebra ZT411', label: t('shipments.thermalPrinter') },
                    { value: 'Browser PDF', label: 'Browser PDF' },
                  ]}
                  onValueChange={(printer) => setSettings((current) => ({ ...current, printer }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="shipment-paper">{t('shipments.paper')}</FieldLabel>
                <SelectControl
                  id="shipment-paper"
                  value={settings.paper}
                  options={[
                    { value: '100 × 150 mm', label: '100 × 150 mm' },
                    { value: 'A4', label: 'A4' },
                  ]}
                  onValueChange={(paper) => setSettings((current) => ({ ...current, paper }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="shipment-copies">{t('shipments.copies')}</FieldLabel>
                <Input
                  id="shipment-copies"
                  type="number"
                  min={1}
                  max={20}
                  value={settings.copies}
                  onChange={(event) =>
                    setSettings((current) => ({ ...current, copies: Number(event.currentTarget.value) }))
                  }
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={settings.packingList}
                  onCheckedChange={(packingList) => setSettings((current) => ({ ...current, packingList }))}
                />
                {t('shipments.packingList')}
              </label>
            </CardContent>
          </Card>
          <Button loading={print.isPending} onClick={() => print.mutate()}>
            <Printer data-icon="inline-start" />
            {t('shipments.printLabel')}
          </Button>
          <Button variant="outline" loading={download.isPending} onClick={() => download.mutate()}>
            <Download data-icon="inline-start" />
            {t('shipments.downloadPdf')}
          </Button>
        </div>
      </div>
    </PageFrame>
  );
}
