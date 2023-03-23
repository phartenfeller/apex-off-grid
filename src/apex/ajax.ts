export type AjaxParams = {
  apex: any;
  ajaxId: string;
  method: string;
  x02?: any;
  x03?: any;
  x04?: any;
  json?: any;
};

export function ajax({
  apex,
  ajaxId,
  method,
  x02,
  x03,
  x04,
  json,
}: AjaxParams) {
  return new Promise((resolve, reject) => {
    apex.server.plugin(
      ajaxId,
      { regions: [{ data: json }], x01: method, x02, x03, x04 },
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
