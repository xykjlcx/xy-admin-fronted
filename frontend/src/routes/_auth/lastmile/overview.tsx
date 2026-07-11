import { createFileRoute } from '@tanstack/react-router';
import { OverviewPage } from '@/modules/lastmile/overview';
export const Route = createFileRoute('/_auth/lastmile/overview')({
  staticData: {
    labelKey: 'overview.title',
    permission: 'lastmile:overview:view',
    groupKey: 'common.subsystem',
  },
  component: OverviewPage,
});
