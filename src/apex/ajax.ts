export type AjaxParams = {
  apex: any;
  ajaxId: string;
  method: string;
}

export function ajax({ apex, ajaxId, method }: AjaxParams) {
  return new Promise((resolve, reject) => {
    apex.server.plugin(
      ajaxId,
      { x01: method },
      {
        success(data: any) {
          apex.debug.info(`Success (${method}):`, data);
          resolve(data);
        },
        error(err: any) {
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
