import { createFileRoute } from '@tanstack/react-router';
import { ErrorScreen } from '@/components/pro/ErrorScreen';

// 放在 _auth 外层，可独立访问；页面级守卫无权限时 beforeLoad throw redirect 到这里
export const Route = createFileRoute('/403')({
  component: () => <ErrorScreen code="403" />,
});
