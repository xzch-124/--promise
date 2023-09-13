### 实现 Promise A+

src 文件夹中包含实现的步骤

index.js 是最终实现的版本


```
npm i
```


```
npm run test:promise
```

使用 promises-aplus-tests 测试


```
 868 passing (21s)
  4 failing

  1) 2.3.4: If `x` is not an object or function, fulfill `promise` with `x` The value is `undefined` immediately-fulfilled: 
     Error: timeout of 200ms exceeded. Ensure the done() callback is being called in this test.
      at Timeout.<anonymous> (D:\mypromise\node_modules\mocha\lib\runnable.js:226:19)
      at listOnTimeout (node:internal/timers:564:17)
      at process.processTimers (node:internal/timers:507:7)

  2) 2.3.4: If `x` is not an object or function, fulfill `promise` with `x` The value is `undefined` eventually-fulfilled:  
     Error: timeout of 200ms exceeded. Ensure the done() callback is being called in this test.
      at Timeout.<anonymous> (D:\mypromise\node_modules\mocha\lib\runnable.js:226:19)
      at listOnTimeout (node:internal/timers:564:17)
      at process.processTimers (node:internal/timers:507:7)

  3) 2.3.4: If `x` is not an object or function, fulfill `promise` with `x` The value is `undefined` immediately-rejected:  
     Error: timeout of 200ms exceeded. Ensure the done() callback is being called in this test.
      at Timeout.<anonymous> (D:\mypromise\node_modules\mocha\lib\runnable.js:226:19)
      at listOnTimeout (node:internal/timers:564:17)
      at process.processTimers (node:internal/timers:507:7)

  4) 2.3.4: If `x` is not an object or function, fulfill `promise` with `x` The value is `undefined` eventually-rejected:   
     Error: timeout of 200ms exceeded. Ensure the done() callback is being called in this test.
      at Timeout.<anonymous> (D:\mypromise\node_modules\mocha\lib\runnable.js:226:19)
      at listOnTimeout (node:internal/timers:564:17)
      at process.processTimers (node:internal/timers:507:7)
```
