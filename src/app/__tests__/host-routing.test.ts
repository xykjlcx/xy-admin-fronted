import { buildInternalRedirect, createHostHistory } from '@/app/host-routing';

describe('dual-host routing', () => {
  test('keeps browser URLs for Web and hash URLs for Desktop', () => {
    const webHistory = createHostHistory('web');
    const desktopHistory = createHostHistory('desktop');

    expect(webHistory.createHref('/admin/users?page=2')).toBe('/admin/users?page=2');
    expect(desktopHistory.createHref('/admin/users?page=2')).toMatch(/#\/admin\/users\?page=2$/);
  });

  test('builds 401 redirect from the router location instead of the host document URL', () => {
    window.history.replaceState(null, '', '/index.html');
    expect(
      buildInternalRedirect({
        pathname: '/admin/dictionaries',
        searchStr: '?page=2&keyword=active',
      }),
    ).toBe('/admin/dictionaries?page=2&keyword=active');
  });
});
