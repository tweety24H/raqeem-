// electron-builder's own icon injection (win.signAndEditExecutable=true) pulls
// the winCodeSign bundle to get rcedit — that .7z contains macOS .dylib
// symlinks and fails to extract on a Windows account without
// SeCreateSymbolicLinkPrivilege (no Developer Mode / no admin), which is
// exactly why signAndEditExecutable stays false. This hook does the same
// icon injection with the standalone `rcedit` npm package instead, which
// ships its own prebuilt binary with no symlinks involved.
const path = require('path');
const { rcedit } = require('rcedit');

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  await rcedit(exePath, { icon: path.join(__dirname, 'icon.ico') });
};
