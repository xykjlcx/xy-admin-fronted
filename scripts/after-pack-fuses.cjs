const path = require('node:path');

module.exports = async function afterPackFuses(context) {
  const { flipAndVerifyReleaseFuses } = await import('./release-fuses.mjs');
  const executableName = context.packager.appInfo.productFilename;
  const binaryOrAppPath =
    context.electronPlatformName === 'darwin'
      ? path.join(context.appOutDir, `${executableName}.app`)
      : path.join(context.appOutDir, `${executableName}.exe`);
  await flipAndVerifyReleaseFuses(binaryOrAppPath);
};
