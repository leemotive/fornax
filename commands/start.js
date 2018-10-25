const Koa = require('koa');
const router = require('koa-router')();
const bodyParser = require('koa-bodyparser');
const dir = require('node-dir');
const Mock = require('mockjs');
const path = require('path');
const colors = require('colors');

function statusColor(code) {
  code = `${code}`;
  if (code.startsWith('2')) {
    return colors.green(code);
  } else if (code.startsWith('3')) {
    return colors.cyan(code);
  } else if (code.startsWith('4') || code.startsWith('5')) {
    return colors.red(code)
  } else {
    return code;
  }
}

exports.start = function(config) {

  const { apiPrefix, responseInterceptor, pageKey, port } = config;

  const app = new Koa();
  app.use(bodyParser());

  router.prefix(apiPrefix);

  app.use(async (ctx, next) => {
    const last = Date.now();
    await next();
    const body = ctx.response.body;
    ctx.response.body = (ctx.responseInterceptor || responseInterceptor)(body, ctx);
    console.log(colors.magenta('fornax:') , ' ', ctx.method, ctx.request.url, ' ', statusColor(ctx.status), ' ', colors.yellow(Date.now() - last), ' ms');
  });


  const loopDirs = [];
  let mockRoot = path.resolve(process.cwd(), config.mockRoot);
  let currentDir = mockRoot;
  do {
    const { files, dirs } = dir.files(currentDir, 'all', _ => _, { recursive: false, sync: true, shortName: false });
    loopDirs.splice(0, 0, ...dirs);
    let restFile;
    let methodFiles = {};
    let remainfiles = [];
    files.forEach(f => {
      if (f.endsWith('_rest.js')) {
        restFile = f;
      } else if (match = f.match(/_(get|post|put|delete|page)\.js/)) {
        methodFiles[match[1]] = f;
      } else {
        remainfiles.push(f);
      }
    });

    if (files.length) {
      const prefix = path.relative(mockRoot, path.dirname(files[0])).replace(/(\w+)\/_id/, '$1/:$1Id');
      const mappings = {
        page: `/${prefix}`,
        get: `/${prefix}/:id`,
        post: `/${prefix}`,
        put: `/${prefix}/:id`,
        delete: `/${prefix}/:id`,
      };

      mockRest(mappings, restFile, methodFiles, remainfiles);
    }

  } while (currentDir = loopDirs.pop());

  function mockRest(mappings, restFile, methodFiles, remainfiles) {
    let db;
    if (restFile) {
      const rest = require(restFile);
      const data = rest.db || Mock.mock(rest.mock);
      db = data[Object.keys(data)[0]];

      methodFiles.page || router.get(mappings.page, async (ctx, next) => {
        const {
          pageSize: pageSizeKey,
          skip: skipKey,
          currentPage: currentPageKey,
          order: orderKey,
          orderBy: orderByKey,
        } = pageKey;

        let {
          [pageSizeKey]: pageSize,
          [skipKey]: skip,
          [currentPageKey]: currentPage,
          [orderKey]: order,
          [orderByKey]: orderBy,
          ...others
        } = ctx.query;

        const listKey = Object.keys(data)[0];
        let filterData = data[listKey].filter(item => {
          return Object.entries(others).every(([key, value]) => {
            return !item[key] || item[key] == value;
          });
        });
        if (orderBy) {
          filterData.sort(({ [orderBy]: aKey }, { [orderBy]: bKey }) => {
            const comp = aKey > bKey ^ order === 'desc';
            return comp ? 1 : -1;
          });
        }
        pageSize = +(pageSize || 10);
        if (currentPage) {
          skip = (currentPage - 1) * pageSize;
        } else {
          skip = +(skip || 0);
        }
        const pageListData = pageSize ? filterData.slice(skip, pageSize + skip) : filterData;

        if (pageSize) {
          ctx.response.body = {
            [listKey]: pageListData,
            total: filterData.length
          }
        } else {
          ctx.response.body = pageListData;
        }
        ctx.responseInterceptor = rest.responseInterceptor;

      });

      methodFiles.get || router.get(mappings.get, (ctx, next) => {
        const { id } = ctx.params;
        const record = db.find(item => item.id === id);
        ctx.response.body = {
          ...record
        }
      });

      methodFiles.post || router.post(mappings.post, (ctx) => {
        const newRecord = ctx.request.body;
        newRecord.id = Mock.mock('@id');
        db.push(newRecord);
        ctx.response.body = {
          ...newRecord
        }
      });

      methodFiles.put || router.put(mappings.put, (ctx, next) => {
        const newRecord = ctx.request.body;
        const { id } = ctx.params;
        const idx = db.findIndex(item => item.id === id);
        db[idx] = { ...db[idx], ...newRecord };
        ctx.response.body = {
          ...db[idx]
        }
      });
      methodFiles.delete || router.delete(mappings.delete, ctx => {
        const { id } = ctx.params;
        const idx = db.findIndex(item => item.id === id);
        const deletedRecord = db.splice(idx, 1);
        ctx.response.body = deletedRecord;
      });
    }
    for (let [type, file] of Object.entries(methodFiles)) {
      const method = type == 'page' ? 'get' : type;
      const handle = require(file).handle;
      if (typeof handle === 'function') {
        router[method](mappings[type], handle(db));
      }
    }
    for (let file of remainfiles) {
      const handle = require(file).handle;
      if (typeof handle === 'function') {
        handle(router, db);
      }
    }

  }
  app.use(router.routes());

  app.listen(port, () => {
    console.log(` mock server address: ${colors.cyan(`http://127.0.0.1:${port}`)}`);
  });
}
