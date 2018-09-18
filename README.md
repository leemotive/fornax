# Fornax

基于[koa](https://koajs.com/)和[mock.js](http://mockjs.com/)的mock服务器

## Installation
```bash
$ npm install -g fornax
```
or local install
```bash
$ npm install fornax --save-dev
```


## Usage
```
Usage: fornax [options] [command]

Options:

  -h, --help  output usage information

Commands:

  start       start mock server
  init        initialize project with .fornax.config.js
```

## Config
all configuration in ./fornax.config.js

| key                 | description                   | type           | default                                                                                                   | remark |
|---------------------|-------------------------------|----------------|-----------------------------------------------------------------------------------------------------------|--------|
| port                | mock server port              | number         | 9000                                                                                                      |        |
| apiPrefix           | prefix of server api          | string         | /api                                                                                                      |        |
| mockRoot            | root directory of mock files  | string         | mock                                                                                                      |        |
| responseInterceptor | handle response before return | function(body) |                                                                                                           |        |
| responseKey         | key in reponse body           | object         | {code: 'code',message: 'msg',data: 'data'}                                                                |        |
| pageKey             | params for pagination         | object         | {skip:'skip',limit:'limit',order:'order',orderBy:'orderBy',pageSize:'pageSize',currentPage:'currentPage'} |        |

## Mock files

```
mock
  ┠─ user
  ┃   ┠─ _id
  ┃   ┃   ┖─ order
  ┃   ┃       ┖─ _rest.js
  ┃   ┠─ _rest.js
  ┃   ┖─ _post.js
  ┠─ order
  ┃    ┖─ _rest.js
  ┖─ custmize.js
```

define template for mockjs
```javascript
// mock/user/_rest.js
exports.mock = {
  'list|80-100': [
    {
      id: '@id',
      username: '@name',
      phone: /^1[34578]\d{9}$/,
      team: '@word(6)',
      address: '@county(true)',
      'gender|+1': [0, 1],
      email: '@email',
      lastip: '@ip',
      'status|+1': [0,1],
      'createdAt|100000000000-3535782743268': 1
    },
  ],
}
```

pagination: get `http://127.0.0.1:9000/api/user?skip=0&limit=10`
query the first page and pageSize is 10

the response is 
```javascript
{
  code: 200,
  msg: "success",
  data: {
    list: [
      {
        id: "440000199206017397",
        username: "Jeffrey Miller",
        phone: "13218261491",
        team: "itezre",
        address: "浙江省 舟山市 其它区",
        gender: 0,
        email: "z.hkisnyh@mpxegc.ni",
        lastip: "153.69.229.78",
        status: 0,
        createdAt: 313244937539
      },
    ],
    total: 83
  }
}
```
pagination width params: get `http://127.0.0.1:9000/api/user?skip=0&limit=10&status=1`
get user: get `http://127.0.0.1:9000/api/user/440000199206017397`
create user: post `http://127.0.0.1:9000/api/user`
update user: put `http://127.0.0.1:9000/api/user/440000199206017397`
delete user: delete `http://127.0.0.1:9000/api/user/440000199206017397`

visis user's order: get `http://127.0.0.1:9000/api/user/440000199206017397/order`


rewrite get/post/put/delete
```javascript
// mock/user/_post.js
exports.handle = () => {
  return async ctx => {
    // koa request handler
  }
}
```

customize handler
```javascript
exports.handle = (router) => {
  // koa-router
  router.get('/customizeRouter', ctx => {
    // koa request handler
  });
}

```

