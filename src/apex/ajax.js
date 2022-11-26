export function ajax({ apex, ajaxId, method }) {
  return new Promise((resolve, reject) => {
    apex.server.plugin(
      ajaxId,
      { x01: method },
      {
        success(data) {
          apex.debug.info(`Success (${method}):`, data);
          resolve(data);
        },
        error(err) {
          apex.debug.error(
            `Error in Sync Plugin (${method}): ${JSON.stringify(err)}`,
          );
          reject(err);
        },
        dataType: 'json',
      },
    );
  });
}
