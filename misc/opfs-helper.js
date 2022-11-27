/**
 * Modified from https://github.com/tomayac/opfs-explorer/blob/096540a22b1597d13c23ac68635659866d7624ea/contentscript.js
 */

(() => {
  let root;
  let fileHandles = [];
  let structure = [];

  const getFiles = async (dirHandle, path = dirHandle.name) => {
    fileHandles = [];

    const dirs = [];
    const files = [];
    for await (const entry of dirHandle.values()) {
      const nestedPath = `${path}/${entry.name}`;
      if (entry.kind === 'file') {
        entry.relativePath = nestedPath;
        fileHandles.push(entry);
        files.push(
          entry.getFile().then((file) => {
            return {
              name: file.name,
              relativePath: nestedPath,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified,
              lastModifiedDate: file.lastModifiedDate,
            };
          }),
        );
      } else if (entry.kind === 'directory') {
        dirs.push(getFiles(entry, nestedPath));
      }
    }
    return [...(await Promise.all(dirs)).flat(), ...(await Promise.all(files))];
  };

  const getFileHandle = (path) => {
    return fileHandles.find((element) => {
      return element.relativePath === path;
    });
  };

  async function scanFiles() {
    console.log('Scanning files...');
    root = await navigator.storage.getDirectory();
    structure = await getFiles(root, '.');

    console.log('Files scanned:', fileHandles, '\n\n');
    console.log(
      'Download one: window.opfs_helper.download(0) //index of result array\nor delete one: window.opfs_helper.deleteFile(1)',
    );
  }

  async function download(idx) {
    const path = structure[idx].relativePath;
    const fileHandle = getFileHandle(path);
    const handle = await showSaveFilePicker({
      suggestedName: fileHandle.name,
    });
    const writable = await handle.createWritable();
    await writable.write(await fileHandle.getFile());
    await writable.close();
  }

  async function deleteFile(idx) {
    const path = structure[idx].relativePath;
    const fileHandle = getFileHandle(path);
    console.log('Deleting file...', fileHandle);
    try {
      await root.removeEntry(fileHandle.name);
      console.log('Successfully deleted file');
    } catch (error) {
      console.error('Error deleting file:', error.message);
    }
  }

  scanFiles();

  window.opfs_helper = {
    scanFiles,
    download,
    deleteFile,
  };

  console.log('opfs_helper loaded. Functions: ', window.opfs_helper);
})();
